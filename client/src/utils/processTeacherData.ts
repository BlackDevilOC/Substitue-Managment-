
export function findTeacherSchedule(teacherId: number, teacherData: any[], day: string) {
  const teacher = teacherData.find(t => t.id === teacherId);
  if (!teacher || !teacher.schedule) {
    return [];
  }
  
  return teacher.schedule[day.toLowerCase()] || [];
}
