package com.resolvegraph.capture

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.resolvegraph.capture.camera.CameraCapabilityDetector
import com.resolvegraph.capture.camera.CaptureMode
import com.resolvegraph.capture.ui.CaptureActivity

class MainActivity : AppCompatActivity() {

    private lateinit var capabilityDetector: CameraCapabilityDetector
    private var detectedMode: CaptureMode = CaptureMode.REAR_ONLY_FALLBACK

    companion object {
        private const val PERMISSION_REQUEST_CODE = 101
        private val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        capabilityDetector = CameraCapabilityDetector(this)

        val tvStatus = findViewById<TextView>(R.id.tvCapabilityStatus)
        val tvExplanation = findViewById<TextView>(R.id.tvCapabilityExplanation)
        val etToken = findViewById<EditText>(R.id.etSessionToken)
        val btnStart = findViewById<Button>(R.id.btnStartCapture)

        // Run capability detection
        val report = capabilityDetector.detectCapabilities()
        detectedMode = report.recommendedMode

        if (report.isConcurrentSupported) {
            tvStatus.setText(R.string.status_dual_ready)
            tvStatus.setTextColor(getColor(R.color.accent_emerald))
        } else {
            tvStatus.setText(R.string.status_single_ready)
            tvStatus.setTextColor(getColor(R.color.warning_amber))
        }
        tvExplanation.text = report.explanation

        btnStart.setOnClickListener {
            val token = etToken.text.toString().trim()
            if (token.isEmpty()) {
                Toast.makeText(this, "Please enter or paste a valid session token", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (hasPermissions()) {
                launchCaptureActivity(token)
            } else {
                ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, PERMISSION_REQUEST_CODE)
            }
        }
    }

    private fun hasPermissions(): Boolean {
        return REQUIRED_PERMISSIONS.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun launchCaptureActivity(token: String) {
        val intent = Intent(this, CaptureActivity::class.java).apply {
            putExtra("SESSION_TOKEN", token)
            putExtra("CAPTURE_MODE", detectedMode.name)
        }
        startActivity(intent)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE && grantResults.isNotEmpty()) {
            val cameraGranted = grantResults[0] == PackageManager.PERMISSION_GRANTED
            if (cameraGranted) {
                val etToken = findViewById<EditText>(R.id.etSessionToken)
                launchCaptureActivity(etToken.text.toString().trim())
            } else {
                Toast.makeText(this, "Camera permission is required to record unboxing evidence", Toast.LENGTH_LONG).show()
            }
        }
    }
}
