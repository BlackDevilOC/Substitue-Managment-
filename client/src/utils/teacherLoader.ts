import { Teacher } from "@shared/schema";

/**
 * Load teachers from the API which reads from total_teacher.json
 * @returns Promise<Teacher[]> Array of teachers with proper formatting
 */
export async function loadTeachersFromFile(): Promise<Teacher[]> {
  try {
    const response = await fetch("/api/teachers");
    if (!response.ok) {
      throw new Error("Failed to load teachers");
    }
    const teachers = await response.json();
    console.log(`Loaded ${teachers.length} teachers from total_teacher.json`);
    return teachers;
  } catch (error) {
    console.error("Error loading teachers:", error);
    return [];
  }
}
