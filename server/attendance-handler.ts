
import { storage } from './storage';
import { Teacher, Schedule, TeacherAttendance } from '@shared/schema';
import { format } from 'date-fns';

export async function markTeacherAttendance(
  teacherId: number,
  date: string,
  isPresent: boolean,
  notes?: string
): Promise<TeacherAttendance> {
  return await storage.createTeacherAttendance({
    teacherId,
    date: new Date(date),
    isPresent,
    notes
  });
}

export async function getTeacherAttendance(date: string): Promise<TeacherAttendance[]> {
  return await storage.getTeacherAttendanceByDate(date);
}

export async function getAbsentTeacherSchedule(date: string): Promise<Schedule[]> {
  const attendance = await getTeacherAttendance(date);
  const absentTeacherIds = attendance
    .filter(a => !a.isPresent)
    .map(a => a.teacherId);

  return await storage.getScheduleForTeachers(absentTeacherIds);
}

export async function getAttendanceReport(startDate: string, endDate: string) {
  const teachers = await storage.getTeachers();
  const attendance = await storage.getTeacherAttendanceBetweenDates(startDate, endDate);
  
  return teachers.map(teacher => {
    const teacherAttendance = attendance.filter(a => a.teacherId === teacher.id);
    const presentDays = teacherAttendance.filter(a => a.isPresent).length;
    const absentDays = teacherAttendance.filter(a => !a.isPresent).length;
    
    return {
      teacherId: teacher.id,
      teacherName: teacher.name,
      presentDays,
      absentDays,
      attendance: teacherAttendance
    };
  });
}
