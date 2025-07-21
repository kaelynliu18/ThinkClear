import os
import json
import face_recognition
import cv2
import numpy as np

# Path to the face gallery and faces.json
GALLERY_DIR = os.path.join(os.path.dirname(__file__), '../thinkclear-app/public/faces-data')
FACES_JSON = os.path.join(GALLERY_DIR, 'faces.json')

# Load mapping from faces.json
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

# Initialize webcam
cap = cv2.VideoCapture(0)
print("[INFO] Webcam started. Press 'q' to quit.")

while True:
    ret, frame = cap.read()
    if not ret:
        continue

    # Convert frame to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Detect face locations and encodings
    face_locations = face_recognition.face_locations(rgb_frame)
    face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

    annotations = []

    for face_encoding in face_encodings:
        best_match = None
        best_distance = 1.0  # Init with max possible distance

        # Compare with all reference encodings
        for name, enc_list in reference_encodings.items():
            distances = face_recognition.face_distance(enc_list, face_encoding)
            if len(distances) == 0:
                continue
            min_distance = np.min(distances)
            if min_distance < best_distance:
                best_distance = min_distance
                best_match = name

        # Confidence transformation
        confidence = max(0, min(100, (1 - best_distance) * 100))

        if confidence >= 60:
            label = f"{best_match} ({confidence:.1f}%)"
        else:
            label = "Unknown"

        annotations.append(label)

    # Annotate results
    for ((top, right, bottom, left), label) in zip(face_locations, annotations):
        color = (0, 255, 0) if label != "Unknown" else (0, 0, 255)
        cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
        cv2.putText(frame, label, (left, top - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

    # Show frame
    cv2.imshow("Face Recognition with Confidence Filter", frame)

    # Quit on 'q' key
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows() 