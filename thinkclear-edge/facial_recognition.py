import face_recognition
import cv2
import numpy as np
import os

# Set path to where the reference images are stored
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGE_DIR = os.path.join(BASE_DIR, "public")

# Define reference gallery using the actual filenames from your screenshot
people = {
    "Hangyul": ["hangyul.png"],
    "Isaac": ["isaac.png"],
    "Kaelyn": ["kaelyn.png"],
    "Tanuj": ["tanuj.png"],
    "Vedant": ["vedant.png"],
}

# Load and encode all reference images
reference_encodings = {}

for name, image_files in people.items():
    encodings = []
    for image_file in image_files:
        img_path = os.path.join(IMAGE_DIR, image_file)
        if not os.path.exists(img_path):
            print(f"[WARNING] Missing image file: {img_path}")
            continue
        img = face_recognition.load_image_file(img_path)
        faces = face_recognition.face_encodings(img)
        if faces:
            encodings.append(faces[0])
        else:
            print(f"[WARNING] No face found in {img_path} for {name}")
    reference_encodings[name] = encodings

print("[INFO] Loaded all reference face encodings.")

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
        best_distance = 1.0

        for name, enc_list in reference_encodings.items():
            if not enc_list:
                continue
            distances = face_recognition.face_distance(enc_list, face_encoding)
            min_distance = np.min(distances)
            if min_distance < best_distance:
                best_distance = min_distance
                best_match = name

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

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
