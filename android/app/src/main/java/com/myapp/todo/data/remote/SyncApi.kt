package com.myapp.todo.data.remote

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

/** Backend sync endpoints (plan/backend-endpoints.md §3). Paths are relative to the base URL. */
interface SyncApi {
    @GET("todo/sync/changes")
    suspend fun changes(@Query("since") since: Long): SyncResponseDto

    @POST("todo/sync/push")
    suspend fun push(@Body request: SyncPushRequestDto): SyncResponseDto
}

/** What the SyncEngine needs from the network; a Retrofit implementation lives below. */
interface SyncRemote {
    suspend fun changes(since: Long): SyncResponseDto
    suspend fun push(items: List<TodoItemDto>): SyncResponseDto
}

class RetrofitSyncRemote(baseUrl: String, client: OkHttpClient = defaultClient) : SyncRemote {
    private val api: SyncApi = Retrofit.Builder()
        .baseUrl(normalizeBaseUrl(baseUrl))
        .client(client)
        .addConverterFactory(WireJson.json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(SyncApi::class.java)

    override suspend fun changes(since: Long): SyncResponseDto = api.changes(since)

    override suspend fun push(items: List<TodoItemDto>): SyncResponseDto =
        api.push(SyncPushRequestDto(items))

    companion object {
        val defaultClient: OkHttpClient by lazy {
            OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build()
        }

        /** "192.168.1.20:5555" -> "http://192.168.1.20:5555/"; Retrofit needs the trailing slash. */
        fun normalizeBaseUrl(raw: String): String {
            var url = raw.trim()
            if (!url.startsWith("http://", ignoreCase = true) && !url.startsWith("https://", ignoreCase = true)) {
                url = "http://$url"
            }
            if (!url.endsWith("/")) url += "/"
            return url
        }
    }
}
