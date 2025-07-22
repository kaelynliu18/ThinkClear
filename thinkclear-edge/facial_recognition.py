import os
import json
import face_recognition
import cv2
import numpy as np

# ---------------------- 1.  Load reference encodings ----------------------
GALLERY_DIR = os.path.join(os.path.dirname(__file__), '../thinkclear-app/public/faces-data')
FACES_JSON  = os.path.join(GALLERY_DIR, 'faces.json')

with open(FACES_JSON, 'r') as f:
    face_map = json.load(f)

reference_encodings = {}
for name, info in face_map.items():
    encodings = []
    for filename in info.get('images', []):
        img_path = os.path.join(GALLERY_DIR, filename)
        if not os.path.exists(img_path):
            print(f"[WARNING] File not found: {img_path}")
            continue
        img = face_recognition.load_image_file(img_path)
        faces = face_recognition.face_encodings(img)
        if faces:
            encodings.append(faces[0])
        else:
            print(f"[WARNING] No face found in {filename} for {name}")
    if encodings:
        reference_encodings[name] = encodings

print("[INFO] Loaded all reference face encodings from gallery.")

# Flatten encodings → single array for faster distance calculation
known_encs  = np.vstack([enc for enc_list in reference_encodings.values() for enc in enc_list])
known_names = [name for name, enc_list in reference_encodings.items() for _ in enc_list]

# ---------------------- 2.  Set up camera ----------------------
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)   # optional but helps on some webcams
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
print("[INFO] Webcam started. Press 'q' to quit.")

# ---------------------- 3.  Frame‑skipping parameters ----------------------
process_every = 2        # run heavy face_recognition on 1 of every 2 frames
frame_idx      = 0

# Keep the latest results so we can reuse them on skipped frames
last_locations = []
last_labels    = []

# ---------------------- 4.  Main loop ----------------------
while True:
    ret, frame = cap.read()
    if not ret:
        continue
    frame_idx += 1

    # ---------------------------------------------------------------------
    # Run detection/recognition only on every N‑th frame
    # ---------------------------------------------------------------------
    if frame_idx % process_every == 0:
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        face_locations = face_recognition.face_locations(
            rgb_frame,
            number_of_times_to_upsample=0,  # keep fast HOG detector
            model="hog"
        )
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        annotations = []
        for face_encoding in face_encodings:
            distances   = face_recognition.face_distance(known_encs, face_encoding)
            best_idx    = np.argmin(distances)
            best_dist   = distances[best_idx]
            best_match  = known_names[best_idx]

            confidence = max(0, min(100, (1 - best_dist) * 100))
            label = f"{best_match} ({confidence:.1f}%)" if confidence >= 60 else "Unknown"
            annotations.append(label)

        # Save results so skipped frames can reuse them
        last_locations = face_locations
        last_labels    = annotations

    # ---------------------------------------------------------------------
    # Draw whatever results we currently have (either fresh or reused)
    # ---------------------------------------------------------------------
    for ((top, right, bottom, left), label) in zip(last_locations, last_labels):
        color = (0, 255, 0) if label != "Unknown" else (0, 0, 255)
        cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
        cv2.putText(frame, label, (left, top - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

    cv2.imshow("Face Recognition with Frame Skipping", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()