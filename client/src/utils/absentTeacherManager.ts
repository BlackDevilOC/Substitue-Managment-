
/**
 * Utility functions for managing absent teachers locally and on the server
 */

export interface AbsentTeacher {
  teacherId: number;
  teacherName: string;
  phone?: string;
  date: string;
  periods: Array<{
    period: number;
    className: string;
  }>;
}

/**
 * Get absent teachers from local storage
 */
export function getAbsentTeachers(): AbsentTeacher[] {
  try {
    const data = localStorage.getItem("absent_teacher_for_substitute");
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading absent teachers from local storage:", error);
    return [];
  }
}

/**
 * Add or remove a teacher from the absent list
 * @param teacherId The ID of the teacher to update
 * @param teacherData The teacher data (name, phone, etc)
 * @param date The date string in YYYY-MM-DD format
 * @param isAbsent True to mark as absent, false to remove from absent list
 * @param schedule Optional schedule information for the teacher
 * @returns The updated absent teachers array
 */
export async function updateAbsentTeacher(
  teacherId: number,
  teacherData: { name: string; phone?: string },
  date: string,
  isAbsent: boolean,
  schedule?: Record<string, number[]>
): Promise<AbsentTeacher[]> {
  // Get existing absent teachers
  let absentTeachers = getAbsentTeachers();

  if (isAbsent) {
    // Check if already in the list
    const existingIndex = absentTeachers.findIndex(
      (t) => t.teacherId === teacherId && t.date === date
    );

    if (existingIndex === -1) {
      // Get day name for scheduling
      const dayObj = new Date(date);
      const dayName = dayObj.toLocaleDateString("en-US", { 
        weekday: "long" 
      }).toLowerCase();
      
      // Get periods from schedule or use empty array
      const periods = (schedule && schedule[dayName]) || [];

      // Add to absent list
      absentTeachers.push({
        teacherId,
        teacherName: teacherData.name,
        phone: teacherData.phone,
        date,
        periods: periods.map((period, index) => ({
          period,
          className: `Class ${index + 1}`
        }))
      });
    }
  } else {
    // Remove from absent list
    absentTeachers = absentTeachers.filter(
      (t) => !(t.teacherId === teacherId && t.date === date)
    );
  }

  // Save to local storage
  localStorage.setItem(
    "absent_teacher_for_substitute",
    JSON.stringify(absentTeachers, null, 2)
  );

  // Also update absent_teachers.json for the server
  try {
    // Extract just the teacher names for the persistent absent list
    const absentTeacherNames = absentTeachers
      .filter(t => t.date === date)
      .map(t => t.teacherName);
    
    // Update the server-side absent teachers file
    await updateServerAbsentTeachers(absentTeacherNames);
  } catch (error) {
    console.warn("Failed to update server file, changes stored locally only", error);
  }

  return absentTeachers;
}

/**
 * Update the server-side absent teachers file
 * @param teacherName The name of the teacher
 * @param isAbsent True to mark as absent, false to remove from absent list
 */
export async function updateServerAbsentTeachers(absentTeacherNames: string[]): Promise<void> {
  try {
    const response = await fetch("/api/update-absent-teachers-file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        absentTeachers: absentTeacherNames
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
  } catch (error) {
    console.error("Error updating server absent teachers file:", error);
    throw error;
  }
}
