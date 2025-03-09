package com.example.teacherattendance.offline

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import org.json.JSONObject
import org.json.JSONArray

class OfflineStorage(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("schedulizer_data", Context.MODE_PRIVATE)
    private val pendingChangesKey = "pending_changes"
    private val userDataKey = "user_data"
    private val scheduleDataKey = "schedule_data"
    private val teacherDataKey = "teacher_data"

    // Store user data for offline access
    fun saveUserData(userData: String) {
        prefs.edit().putString(userDataKey, userData).apply()
    }

    // Get stored user data
    fun getUserData(): String? = prefs.getString(userDataKey, null)

    // Store schedule data
    fun saveScheduleData(scheduleData: String) {
        prefs.edit().putString(scheduleDataKey, scheduleData).apply()
    }

    // Get stored schedule data
    fun getScheduleData(): String? = prefs.getString(scheduleDataKey, null)

    // Store teacher data
    fun saveTeacherData(teacherData: String) {
        prefs.edit().putString(teacherDataKey, teacherData).apply()
    }

    // Get stored teacher data
    fun getTeacherData(): String? = prefs.getString(teacherDataKey, null)

    // Add a pending change to be synced later
    fun addPendingChange(changeType: String, data: JSONObject) {
        val pendingChanges = getPendingChanges()
        val change = JSONObject().apply {
            put("type", changeType)
            put("data", data)
            put("timestamp", System.currentTimeMillis())
        }
        pendingChanges.put(change)
        prefs.edit().putString(pendingChangesKey, pendingChanges.toString()).apply()
    }

    // Get all pending changes
    private fun getPendingChanges(): JSONArray {
        val changesStr = prefs.getString(pendingChangesKey, "[]")
        return JSONArray(changesStr)
    }

    // Remove a pending change after successful sync
    fun removePendingChange(index: Int) {
        val pendingChanges = getPendingChanges()
        val newChanges = JSONArray()
        for (i in 0 until pendingChanges.length()) {
            if (i != index) {
                newChanges.put(pendingChanges.getJSONObject(i))
            }
        }
        prefs.edit().putString(pendingChangesKey, newChanges.toString()).apply()
    }

    // Clear all pending changes
    fun clearPendingChanges() {
        prefs.edit().putString(pendingChangesKey, "[]").apply()
    }

    // Get pending changes as Flow for reactive updates
    fun observePendingChanges(): Flow<List<JSONObject>> = flow {
        val changes = getPendingChanges()
        val changesList = mutableListOf<JSONObject>()
        for (i in 0 until changes.length()) {
            changesList.add(changes.getJSONObject(i))
        }
        emit(changesList)
    }

    // Clear all stored data
    fun clearAllData() {
        prefs.edit().clear().apply()
    }
}
