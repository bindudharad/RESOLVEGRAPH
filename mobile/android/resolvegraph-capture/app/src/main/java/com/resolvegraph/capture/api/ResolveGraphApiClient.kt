package com.resolvegraph.capture.api

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

data class UnboxingSessionResponse(
    val sessionToken: String,
    val challengeCode: String,
    val packageNumber: String?,
    val isExpired: Boolean
)

data class UploadResult(
    val success: Boolean,
    val sha256: String?,
    val error: String?
)

/**
 * Android network client communicating with the ResolveGraph unboxing backend API.
 */
class ResolveGraphApiClient(private val baseUrl: String = "http://10.0.2.2:3000") {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    /**
     * Retrieves the unboxing challenge code for an active session.
     */
    suspend fun fetchSession(token: String): Result<UnboxingSessionResponse> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$baseUrl/api/unboxing/sessions/$token")
                .get()
                .build()

            val response = client.newCall(request).execute()
            val body = response.body?.string() ?: return@withContext Result.failure(Exception("Empty response body"))

            val json = JSONObject(body)
            if (!response.isSuccessful) {
                return@withContext Result.failure(Exception(json.optString("error", "Failed to fetch session")))
            }

            val sessionObj = json.getJSONObject("session")
            val challengeObj = json.getJSONObject("activeChallenge")

            Result.success(
                UnboxingSessionResponse(
                    sessionToken = sessionObj.getString("sessionToken"),
                    challengeCode = challengeObj.getString("challengeCode"),
                    packageNumber = sessionObj.optJSONObject("package")?.optString("packageNumber"),
                    isExpired = false
                )
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Uploads captured unboxing video stream to the backend.
     */
    suspend fun uploadStream(
        token: String,
        file: File,
        streamType: String,
        durationSeconds: Double,
        fps: Double
    ): Result<UploadResult> = withContext(Dispatchers.IO) {
        try {
            val fileBody = file.asRequestBody("video/mp4".toMediaTypeOrNull())
            val multipart = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", file.name, fileBody)
                .addFormDataPart("streamType", streamType)
                .addFormDataPart("durationSeconds", durationSeconds.toString())
                .addFormDataPart("fps", fps.toString())
                .build()

            val request = Request.Builder()
                .url("$baseUrl/api/unboxing/sessions/$token/upload")
                .post(multipart)
                .build()

            val response = client.newCall(request).execute()
            val body = response.body?.string() ?: return@withContext Result.failure(Exception("Empty upload response"))
            val json = JSONObject(body)

            if (!response.isSuccessful) {
                return@withContext Result.failure(Exception(json.optString("error", "Stream upload failed")))
            }

            val streamObj = json.optJSONObject("stream")
            val sha256 = streamObj?.optString("sha256")

            Result.success(UploadResult(success = true, sha256 = sha256, error = null))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Finalizes unboxing session on the backend.
     */
    suspend fun completeSession(token: String): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$baseUrl/api/unboxing/sessions/$token/complete")
                .post(MultipartBody.Builder().setType(MultipartBody.FORM).addFormDataPart("action", "COMPLETE").build())
                .build()

            val response = client.newCall(request).execute()
            Result.success(response.isSuccessful)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
