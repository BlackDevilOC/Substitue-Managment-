
package com.example.teacherattendance

import java.util.Date

data class Teacher(
    val id: Int,
    val name: String,
    val phoneNumber: String?,
    val isSubstitute: Boolean
)

data class AbsentTeacher(
    val id: Int,
    val name: String,
    val phoneNumber: String?,
    val timestamp: Date,
    val assignedSubstitute: Boolean
)

data class PeriodConfig(
    val periodNumber: Int,
    val startTime: String,
    val endTime: String
)

data class Assignment(
    val originalTeacher: String,
    val substituteTeacher: String?,
    val day: String,
    val period: Int,
    val className: String
)

data class Schedule(
    val day: String,
    val period: Int,
    val teacherId: Int,
    val className: String
)
