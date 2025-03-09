package com.example.teacherattendance.offline

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect
import org.json.JSONObject
import com.example.teacherattendance.api.TeacherApiService

class SyncManager(
    private val context: Context,
    private val offlineStorage: OfflineStorage,
    private val apiService: TeacherApiService
) {
    private val job = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.IO + job)
    private var isConnected = false

    init {
        setupNetworkCallback()
    }

    private fun setupNetworkCallback() {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                super.onAvailable(network)
                isConnected = true
                scope.launch {
                    syncPendingChanges()
                }
            }

            override fun onLost(network: Network) {
                super.onLost(network)
                isConnected = false
            }
        }

        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        connectivityManager.registerNetworkCallback(networkRequest, networkCallback)
    }

    private suspend fun syncPendingChanges() {
        try {
            offlineStorage.observePendingChanges().collect { changes ->
                changes.forEachIndexed { index, change ->
                    if (syncChange(change)) {
                        offlineStorage.removePendingChange(index)
                    }
                }
            }
        } catch (e: Exception) {
            // Handle sync errors
            e.printStackTrace()
        }
    }

    private suspend fun syncChange(change: JSONObject): Boolean {
        return try {
            when (change.getString("type")) {
                "attendance" -> syncAttendance(change.getJSONObject("data"))
                "substitute" -> syncSubstitute(change.getJSONObject("data"))
                "schedule" -> syncSchedule(change.getJSONObject("data"))
                else -> false
            }
        } catch (e: Exception) {
            false
        }
    }

    private suspend fun syncAttendance(data: JSONObject): Boolean {
        return try {
            apiService.updateAttendance(data)
            true
        } catch (e: Exception) {
            false
        }
    }

    private suspend fun syncSubstitute(data: JSONObject): Boolean {
        return try {
            apiService.updateSubstitute(data)
            true
        } catch (e: Exception) {
            false
        }
    }

    private suspend fun syncSchedule(data: JSONObject): Boolean {
        return try {
            apiService.updateSchedule(data)
            true
        } catch (e: Exception) {
            false
        }
    }

    fun startSync() {
        if (isConnected) {
            scope.launch {
                syncPendingChanges()
            }
        }
    }

    fun cancel() {
        job.cancel()
    }
}
