package com.resolvegraph.capture.camera

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Build

enum class CaptureMode {
    DUAL_CONCURRENT,
    REAR_ONLY_FALLBACK
}

data class CameraCapabilityReport(
    val hasRearCamera: Boolean,
    val hasFrontCamera: Boolean,
    val isConcurrentSupported: Boolean,
    val rearCameraId: String?,
    val frontCameraId: String?,
    val recommendedMode: CaptureMode,
    val explanation: String
)

/**
 * Inspects device camera hardware to determine whether true concurrent dual-stream
 * capture is supported by the OEM HAL, or if rear-only recording must be used as a fallback.
 */
class CameraCapabilityDetector(private val context: Context) {

    fun detectCapabilities(): CameraCapabilityReport {
        val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        var rearId: String? = null
        var frontId: String? = null

        try {
            for (id in cameraManager.cameraIdList) {
                val characteristics = cameraManager.getCameraCharacteristics(id)
                val facing = characteristics.get(CameraCharacteristics.LENS_FACING)

                if (facing == CameraCharacteristics.LENS_FACING_BACK && rearId == null) {
                    rearId = id
                } else if (facing == CameraCharacteristics.LENS_FACING_FRONT && frontId == null) {
                    frontId = id
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        val hasRear = rearId != null
        val hasFront = frontId != null

        var isConcurrent = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && hasRear && hasFront) {
            try {
                val concurrentSets = cameraManager.concurrentCameraIds
                for (combination in concurrentSets) {
                    if (combination.contains(rearId) && combination.contains(frontId)) {
                        isConcurrent = true
                        break
                    }
                }
            } catch (e: Exception) {
                // Device does not support concurrent API or OEM driver threw exception
                isConcurrent = false
            }
        }

        val recommendedMode = if (isConcurrent) {
            CaptureMode.DUAL_CONCURRENT
        } else {
            CaptureMode.REAR_ONLY_FALLBACK
        }

        val explanation = when {
            isConcurrent -> "Device HAL supports synchronized front + rear concurrent recording."
            hasRear && hasFront -> "Device possesses front and rear cameras, but concurrent hardware streaming is not supported by HAL. Falling back to rear-camera-only capture."
            hasRear -> "Rear camera available. Front camera not detected."
            else -> "No compatible camera hardware detected on device."
        }

        return CameraCapabilityReport(
            hasRearCamera = hasRear,
            hasFrontCamera = hasFront,
            isConcurrentSupported = isConcurrent,
            rearCameraId = rearId,
            frontCameraId = frontId,
            recommendedMode = recommendedMode,
            explanation = explanation
        )
    }
}
