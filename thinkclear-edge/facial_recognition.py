import os
import json
import face_recognition
import cv2
import numpy as np
from collections import defaultdict
import pyttsx3

# Initialize TTS engine (enabled now)
engine = pyttsx3.init()
engine.setProperty('voice', 'english')  # fallback ssudoafe voice
engine.setProperty('rate', 150)

# ---------------------- 1.  Load reference encodings ----------------------
GALLERY_DIR = os.path.join(os.path.dirname(__file__), '../thinkclear-app/public/faces-data')
FACES_JSON  = os.path.join(GALLERY_DIR, 'faces.json')

def load_reference_encodings():
    with open(FACES_JSON, 'r') as f:
        face_map = json.load(f)

    reference_encodings = {}
    relationship_map = {}

    for name, info in face_map.items():
        relationship_map[name] = info.get('relationship', '')
        encodings = []
        for filename in info.get('images', []):
            img_path = os.path.join(GALLERY_DIR, filename)
            if not os.path.exists(img_path):
                continue
            img = face_recognition.load_image_file(img_path)
            faces = face_recognition.face_encodings(img)
            if faces:
                encodings.append(faces[0])
        if encodings:
            reference_encodings[name] = encodings

    known_encs  = np.vstack([enc for enc_list in reference_encodings.values() for enc in enc_list])
    known_names = [name for name, enc_list in reference_encodings.items() for _ in enc_list]
    return known_encs, known_names, relationship_map

# ---------------------- 2.  Set up camera ----------------------
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

detection_counters = defaultdict(lambda: {'consec': 0, 'missed': 0, 'displayed': False})

process_every = 2
frame_idx = 0

last_locations = []
last_labels = []
last_raw_names = []

# Initial load
last_mtime = None
known_encs, known_names, relationship_map = load_reference_encodings()

print("[INFO] Webcam started. Press 'q' to quit.")

while True:
    ret, frame = cap.read()
    if not ret:
        continue
    frame_idx += 1

    if frame_idx % process_every == 0:
        # 🔁 Reload face data only if JSON changed
        try:
            current_mtime = os.path.getmtime(FACES_JSON)
            if current_mtime != last_mtime:
                known_encs, known_names, relationship_map = load_reference_encodings()
                last_mtime = current_mtime
                print("[INFO] Reloaded encodings from updated JSON.")
        except Exception as e:
            print("[ERROR] Failed to check or reload encodings:", e)
            continue

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        face_locations = face_recognition.face_locations(rgb_frame, model='hog')
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        detected_this_frame = set()
        detections = []

        for location, face_encoding in zip(face_locations, face_encodings):
            distances = face_recognition.face_distance(known_encs, face_encoding)
            best_idx = np.argmin(distances)
            best_dist = distances[best_idx]
            best_match = known_names[best_idx]
            confidence = max(0, min(100, (1 - best_dist) * 100))

            if confidence >= 60:
                detected_this_frame.add(best_match)
                counters = detection_counters[best_match]

                counters['consec'] += 1
                counters['missed'] = 0

                relationship = relationship_map.get(best_match, '')
                label_text = f"{best_match}, your {relationship}" if relationship else best_match

                detections.append((location, label_text, best_match))
            else:
                detections.append((location, "Unknown", None))

        # Update missed counters for unseen names
        for name in list(detection_counters.keys()):
            if name not in detected_this_frame:
                counters = detection_counters[name]
                counters['consec'] = 0
                counters['missed'] += 1
                if counters['missed'] > 3:
                    counters['displayed'] = False

        detections.sort(key=lambda det: det[0][3])

        last_locations = [d[0] for d in detections]
        last_labels = [d[1] for d in detections]
        last_raw_names = [d[2] for d in detections]

        # Determine who to announce
        eligible_now = []
        for raw_name in last_raw_names:
            if raw_name is None:
                continue
            counters = detection_counters[raw_name]
            if counters['consec'] >= 2 and not counters['displayed']:
                eligible_now.append(raw_name)

        if eligible_now:
            phrases = []
            for name in eligible_now:
                relationship = relationship_map.get(name, '')
                phrase = f"{name}, your {relationship}" if relationship else name
                phrases.append(phrase)

            if len(phrases) == 1:
                msg = f"This is {phrases[0]}"
            else:
                parts = [f"On the very left is {phrases[0]}"]
                for p in phrases[1:]:
                    parts.append(f"next to them is {p}")
                msg = ", ".join(parts)

            print("[AUDIO]:", msg)
            engine.say(msg)     # ✅ SOUND OUTPUT ENABLED
            engine.runAndWait()

            for name in eligible_now:
                detection_counters[name]['displayed'] = True

    # Draw annotations (show everything even Unknown)
    for (top, right, bottom, left), label in zip(last_locations, last_labels):
        color = (0, 255, 0) if label != "Unknown" else (0, 0, 255)
        cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
        cv2.putText(frame, label, (left, top - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

    cv2.imshow("Face Recognition with Audio", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()