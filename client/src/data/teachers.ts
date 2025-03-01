// Initial teacher data
export const defaultTeachers = [
  {
    id: 1,
    name: "Sir Bakir Shah",
    isSubstitute: false,
    phoneNumber: null
  },
  {
    id: 2,
    name: "Sir Mushtaque Ahmed",
    isSubstitute: false,
    phoneNumber: null
  },
  {
    id: 3,
    name: "Sir Irshad Qureshi",
    isSubstitute: false,
    phoneNumber: null
  }
];

export interface TeacherAttendanceRecord {
  teacherId: number;
  teacherName: string;
  attendance: Record<string, 'P' | 'A'>;  // Date string -> Present/Absent
}

// Helper function to get attendance key
export function getAttendanceKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}
