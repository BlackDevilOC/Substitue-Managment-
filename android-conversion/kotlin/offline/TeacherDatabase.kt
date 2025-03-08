
package com.example.teacherattendance.offline

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.example.teacherattendance.models.AbsentTeacher
import com.example.teacherattendance.models.Assignment
import com.example.teacherattendance.models.PeriodConfig
import com.example.teacherattendance.models.Schedule
import com.example.teacherattendance.models.Teacher

@Database(
    entities = [
        Teacher::class,
        AbsentTeacher::class,
        Schedule::class,
        PeriodConfig::class,
        Assignment::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class TeacherDatabase : RoomDatabase() {
    abstract fun teacherDao(): TeacherDao
    abstract fun scheduleDao(): ScheduleDao
    abstract fun absentTeacherDao(): AbsentTeacherDao
    abstract fun periodConfigDao(): PeriodConfigDao
    abstract fun assignmentDao(): AssignmentDao

    companion object {
        @Volatile
        private var INSTANCE: TeacherDatabase? = null

        fun getDatabase(context: Context): TeacherDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    TeacherDatabase::class.java,
                    "teacher_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
