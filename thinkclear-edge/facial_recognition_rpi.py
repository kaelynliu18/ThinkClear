import os
import json
import face_recognition
import cv2
import numpy as np
import time

# ---------------------- SETTINGS ----------------------
FRAME_SKIP = 2             # Process every Nth frame
FAIL_REINIT_THRESHOLD = 5  # Reinit camera after this many failed frames
CAMERA_SCAN_LIMIT = 5      # Try /dev/video0 to /dev/video4
SLEEP_BETWEEN_FRAMES = 0.05

# ---------------------- Load face encodings ----------------------
GALLERY_DIR = os.path.join(os.path.dirname(__file__), '../thinkclear-app/public/faces-data')
FACES_JSON  = os.path.join(GALLERY_DIR, 'faces.json')

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

print("[INFO] Reference faces loaded:", list(reference_encodings.keys()))

# ---------------------- Find working camera ----------------------
def find_working_camera(max_devices=CAMERA_SCAN_LIMIT):
    for i in range(max_devices):
        dev_path = f'/dev/video{i}'
        if os.path.exists(dev_path):
            cap = cv2.VideoCapture(dev_path, cv2.CAP_V4L2)
            if cap.isOpened():
                ret, frame = cap.read()
                if ret:
                    print(f"[INFO] Using camera at {dev_path}")
                    return cap
                cap.release()
    raise RuntimeError("❌ No usable video device found.")

# ---------------------- Main loop ----------------------
def main():
    print("[INFO] Webcam started. Press Ctrl+C to stop.")
    video_capture = find_working_camera()
    fail_count = 0
    frame_count = 0

    try:
        while True:
            ret, frame = video_capture.read()
            if not ret:
                print("[WARN] Failed to grab frame.")
                fail_count += 1
                if fail_count >= FAIL_REINIT_THRESHOLD:
                    print("[INFO] Reinitializing camera...")
                    video_capture.release()
                    time.sleep(2)
                    video_capture = find_working_camera()
                    fail_count = 0
                continue
            fail_count = 0

            frame_count += 1
            if frame_count % FRAME_SKIP != 0:
                del frame
                time.sleep(SLEEP_BETWEEN_FRAMES)
                continue

            # Process frame
            rgb_frame = frame[:, :, ::-1]
            face_locations = face_recognition.face_locations(rgb_frame)
            face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

            print(f"[DEBUG] Frame {frame_count}: Detected {len(face_encodings)} face(s)")

            # Match faces
            for face_encoding, face_location in zip(face_encodings, face_locations):
                for name, encodings in reference_encodings.items():
                    matches = face_recognition.compare_faces(encodings, face_encoding, tolerance=0.5)
                    if any(matches):
                        relationship = relationship_map.get(name, "someone")
                        print(f"[RECOGNIZED] On the very left is {name}, your {relationship}.")
                        break  # Only announce first match per face

            del frame
            time.sleep(SLEEP_BETWEEN_FRAMES)

    except KeyboardInterrupt:
        print("[INFO] Stopping script...")
    finally:
        video_capture.release()

if __name__ == "__main__":
    main()
