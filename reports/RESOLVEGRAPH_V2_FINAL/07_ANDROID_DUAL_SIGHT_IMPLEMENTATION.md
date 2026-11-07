# 07. Module 10: Dual-Sight AI Unboxing & Android Capture Implementation

**Mobile Directory:** `mobile/android/resolvegraph-capture/`  
**Backend Service:** `src/server/services/camera-session.service.ts`  
**API Endpoints:** `POST /api/unboxing/sessions`, `GET /api/unboxing/sessions/[token]`, `POST /api/unboxing/sessions/[token]/upload`, `POST /api/unboxing/sessions/[token]/complete`  
**Test Suite:** `tests/dual-sight-capture.test.ts`

---

## 1. Native Android Application Architecture

The native Android application is engineered in Kotlin using modern Jetpack libraries and Android CameraX:
- **Application ID:** `com.resolvegraph.capture`
- **Minimum SDK:** API 26 (Android 8.0 Oreo) | **Target SDK:** API 34 (Android 14)
- **Key Dependencies:**
  - `androidx.camera:camera-camera2:1.3.1`
  - `androidx.camera:camera-lifecycle:1.3.1`
  - `androidx.camera:camera-video:1.3.1`
  - `com.squareup.okhttp3:okhttp:4.12.0`

```
mobile/android/resolvegraph-capture/
├── app/build.gradle.kts
├── settings.gradle.kts
└── app/src/
    ├── main/java/com/resolvegraph/capture/
    │   ├── camera/DualCameraCaptureManager.kt   # Dual-camera lifecycle & concurrent recording
    │   ├── network/CaptureUploadService.kt      # Stream chunking, SHA-256 digest, API client
    │   └── ui/CaptureChallengeActivity.kt       # Dynamic challenge overlay & countdown HUD
    └── test/java/com/resolvegraph/capture/
        ├── CaptureChallengeTest.kt              # Challenge code verification tests
        └── DualCameraSessionTest.kt             # Stream upload & hash verification tests
```

---

## 2. Dynamic 6-Digit Challenge Code Binding

To prevent the use of pre-recorded videos or stock footage, the backend generates a time-bounded dynamic challenge code upon session initialization:
```typescript
const challengeCode = Math.floor(100000 + Math.random() * 900000).toString();
```

**HUD Binding Workflow:**
1. The Android app displays this 6-digit challenge in bold numerals on the phone screen with a 5-second countdown HUD.
2. The buyer shows the challenge code to the physical package exterior or mirrors it before cutting the tape.
3. Dual-Sight captures front (user environment / integrity) and rear (package seals and internal contents) streams concurrently.
4. Each chunk is hashed with bitwise SHA-256 on the device and validated on the backend.
