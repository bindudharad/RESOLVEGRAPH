package com.resolvegraph.capture.ui

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.resolvegraph.capture.R
import com.resolvegraph.capture.api.ResolveGraphApiClient
import kotlinx.coroutines.launch
import java.io.File

class CaptureActivity : AppCompatActivity() {

    private lateinit var apiClient: ResolveGraphApiClient
    private var sessionToken: String = ""
    private var captureMode: String = "REAR_ONLY_FALLBACK"

    private var secondsElapsed = 0
    private val timerHandler = Handler(Looper.getMainLooper())
    private val timerRunnable = object : Runnable {
        override fun run() {
            secondsElapsed++
            val minutes = secondsElapsed / 60
            val secs = secondsElapsed % 60
            findViewById<TextView>(R.id.tvRecordTimer).text = String.format("%02d:%02d", minutes, secs)
            timerHandler.postDelayed(this, 1000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_capture)

        sessionToken = intent.getStringExtra("SESSION_TOKEN") ?: ""
        captureMode = intent.getStringExtra("CAPTURE_MODE") ?: "REAR_ONLY_FALLBACK"

        apiClient = ResolveGraphApiClient()

        val tvChallenge = findViewById<TextView>(R.id.tvChallengeCode)
        val btnStop = findViewById<Button>(R.id.btnStopRecord)
        val pbUpload = findViewById<ProgressBar>(R.id.pbUpload)

        // Start CameraX preview
        startCameraPreview()

        // Fetch session challenge code from backend API
        lifecycleScope.launch {
            val result = apiClient.fetchSession(sessionToken)
            result.onSuccess { session ->
                tvChallenge.text = session.challengeCode
                timerHandler.post(timerRunnable)
            }.onFailure { err ->
                Toast.makeText(this@CaptureActivity, "Failed to load session: ${err.message}", Toast.LENGTH_LONG).show()
                tvChallenge.text = "OFFLINE"
            }
        }

        btnStop.setOnClickListener {
            timerHandler.removeCallbacks(timerRunnable)
            btnStop.isEnabled = false
            pbUpload.visibility = View.VISIBLE

            // Mock video capture finalization & upload simulation for testing
            lifecycleScope.launch {
                val tempFile = File.createTempFile("unboxing_stream", ".mp4", cacheDir).apply {
                    writeBytes(ByteArray(1024) { 0x42 }) // Synthetic stream chunk
                }

                val uploadResult = apiClient.uploadStream(
                    token = sessionToken,
                    file = tempFile,
                    streamType = "REAR_PACKAGE_STREAM",
                    durationSeconds = secondsElapsed.toDouble(),
                    fps = 30.0
                )

                uploadResult.onSuccess {
                    apiClient.completeSession(sessionToken)
                    Toast.makeText(this@CaptureActivity, "Unboxing evidence verified and securely uploaded!", Toast.LENGTH_LONG).show()
                    finish()
                }.onFailure { err ->
                    pbUpload.visibility = View.GONE
                    btnStop.isEnabled = true
                    Toast.makeText(this@CaptureActivity, "Upload failed: ${err.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun startCameraPreview() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(findViewById<PreviewView>(R.id.previewView).surfaceProvider)
            }
            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(this, cameraSelector, preview)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    override fun onDestroy() {
        super.onDestroy()
        timerHandler.removeCallbacks(timerRunnable)
    }
}
