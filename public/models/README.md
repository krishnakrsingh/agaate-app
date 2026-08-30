# Face Recognition Models

Stage 2 uses `@vladmandic/face-api` with three nets:

- `tinyFaceDetector` (190 KB) — detection
- `faceLandmark68Net` (350 KB) — 68 landmarks for quality/pose
- `faceRecognitionNet` (6.2 MB) — 128D identity embedding

Total ~6.7 MB fetched lazily from `/models` via `faceapi.nets.*.loadFromUri('/models')`.

## Fetching models

From repo root:

```bash
npm run fetch:face-models
```

Or manually:

```bash
mkdir -p public/models
curl -L https://github.com/vladmandic/face-api/raw/master/model/tiny_face_detector_model-weights_manifest.json -o public/models/tiny_face_detector_model-weights_manifest.json
curl -L https://github.com/vladmandic/face-api/raw/master/model/tiny_face_detector_model-shard1 -o public/models/tiny_face_detector_model-shard1
curl -L https://github.com/vladmandic/face-api/raw/master/model/face_landmark_68_model-weights_manifest.json -o public/models/face_landmark_68_model-weights_manifest.json
curl -L https://github.com/vladmandic/face-api/raw/master/model/face_landmark_68_model-shard1 -o public/models/face_landmark_68_model-shard1
curl -L https://github.com/vladmandic/face-api/raw/master/model/face_recognition_model-weights_manifest.json -o public/models/face_recognition_model-weights_manifest.json
curl -L https://github.com/vladmandic/face-api/raw/master/model/face_recognition_model-shard1 -o public/models/face_recognition_model-shard1
curl -L https://github.com/vladmandic/face-api/raw/master/model/face_recognition_model-shard2 -o public/models/face_recognition_model-shard2
```

If models are missing, client shows `Face recognition unavailable — models not loaded` and enrollment is blocked (hard stop, no fake fallback).

License: `@vladmandic/face-api` MIT, models Apache 2.0 / MIT compatible (face-api weights). See docs/STAGE_2_FACE_REPORT.md for full license analysis.
