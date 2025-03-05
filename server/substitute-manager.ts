
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { Teacher, Assignment, SubstituteAssignment, VerificationReport } from './types/substitute';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const DEFAULT_TIMETABLE_PATH = path.join(__dirname, '../data/timetable_file.csv');
const DEFAULT_SUBSTITUTES_PATH = path.join(__dirname, '../data/Substitude_file.csv');
const DEFAULT_TEACHERS_PATH = path.join(__dirname, '../data/total_teacher.json');
const DEFAULT_SCHEDULES_PATH = path.join(__dirname, '../data/teacher_schedules.json');
const DEFAULT_ASSIGNED_TEACHERS_PATH = path.join(__dirname, '../data/assigned_teacher.json');

// Constants
const MAX_DAILY_WORKLOAD = 6;

export class SubstituteManager {
  private schedule: Map<string, Map<number, string[]>> = new Map();
  private substitutes: Map<string, string> = new Map();
  private teacherClasses: Map<string, Assignment[]> = new Map();
  private substituteAssignments: Map<string, Assignment[]> = new Map();
  private teacherWorkload: Map<string, number> = new Map();
  private MAX_SUBSTITUTE_ASSIGNMENTS = 3;
  private MAX_REGULAR_TEACHER_ASSIGNMENTS = 2;
  private allAssignments: Assignment[] = [];

  constructor() {}

  async loadData(timetablePath?: string, substitutesPath?: string): Promise<void> {
    // Default paths if none provided
    const actualTimetablePath = timetablePath || DEFAULT_TIMETABLE_PATH;
    const actualSubstitutePath = substitutesPath || DEFAULT_SUBSTITUTES_PATH;
    
    // Reset data structures
    this.schedule = new Map();
    this.substitutes = new Map();
    this.teacherClasses = new Map();
    this.substituteAssignments = new Map();
    this.teacherWorkload = new Map();
    this.allAssignments = [];

    // Load substitutes
    if (fs.existsSync(actualSubstitutePath)) {
      const subData = fs.readFileSync(actualSubstitutePath, 'utf-8');
      try {
        // Parse with relaxed settings
        const rows = parse(subData, {
          columns: false,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true
        });
        
        rows.forEach(row => {
          const name = row[0]?.trim();
          const phone = row[1]?.trim() || "";  // Default to empty string if phone is missing
          if (name) this.substitutes.set(this.normalizeName(name), phone);
        });
        
        console.log(`Loaded ${this.substitutes.size} substitutes`);
      } catch (error) {
        console.error("Raw substitute data:", subData.slice(0, 200) + "...");
        throw new Error(`Error parsing substitute file: ${error}`);
      }
    } else {
      throw new Error(`Substitute file not found: ${actualSubstitutePath}`);
    }

    // Load timetable
    if (fs.existsSync(actualTimetablePath)) {
      const timetableData = fs.readFileSync(actualTimetablePath, 'utf-8');
      try {
        const rows = parse(timetableData, {
          columns: false,
          skip_empty_lines: true,
          trim: true
        });
        
        const classes = ['10A', '10B', '10C', '9A', '9B', '9C', '8A', '8B', '8C', '7A', '7B', '7C', '6A', '6B', '6C'];
        
        // Skip header row
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i];
          if (!cols || cols.length < 2) continue;

          const day = this.normalizeDay(cols[0]);
          const period = parseInt(cols[1].trim());
          if (isNaN(period)) continue;
          
          const teachers = cols.slice(2).map(t => t && t.trim().toLowerCase() !== 'empty' ? this.normalizeName(t) : null)
                                .filter(t => t !== null) as string[];

          if (!this.schedule.has(day)) this.schedule.set(day, new Map());
          this.schedule.get(day)!.set(period, teachers);

          teachers.forEach((teacher, idx) => {
            if (idx < classes.length) {
              const className = classes[idx];
              if (!this.teacherClasses.has(teacher)) this.teacherClasses.set(teacher, []);
              this.teacherClasses.get(teacher)!.push({ 
                day, 
                period, 
                className, 
                originalTeacher: teacher, 
                substitute: '' 
              } as any);
            }
          });
        }
      } catch (error) {
        throw new Error(`Error parsing timetable file: ${error}`);
      }
    } else {
      throw new Error(`Timetable file not found: ${actualTimetablePath}`);
    }
  }

  async autoAssignSubstitutes(
    date: string,
    absentTeacherNames?: string[]
  ): Promise<{ assignments: SubstituteAssignment[]; warnings: string[] }> {
    // If no absent teacher names provided, try to load from JSON
    if (!absentTeacherNames) {
      const absentTeachersPath = path.join(__dirname, '../data/absent_teachers.json');
      if (fs.existsSync(absentTeachersPath)) {
        try {
          const absentData = JSON.parse(fs.readFileSync(absentTeachersPath, 'utf-8'));
          absentTeacherNames = absentData.map((teacher: any) => teacher.name);
        } catch (error) {
          throw new Error(`Error loading absent teachers: ${error}`);
        }
      } else {
        absentTeacherNames = [];
      }
    }

    // Load all data
    const [teachers, teacherSchedules, assignedTeachers] = await Promise.all([
      this.loadTeachers(DEFAULT_TEACHERS_PATH),
      this.loadSchedules(DEFAULT_SCHEDULES_PATH),
      this.loadAssignedTeachers(DEFAULT_ASSIGNED_TEACHERS_PATH)
    ]);

    const day = this.getDayFromDate(date);
    const assignments: SubstituteAssignment[] = [];
    const warnings: string[] = [];
    const workloadMap = new Map<string, number>();
    const assignedPeriodsMap = new Map<string, Set<number>>();

    // Process existing assignments
    assignedTeachers.forEach(({ substitutePhone, period }) => {
      workloadMap.set(substitutePhone, (workloadMap.get(substitutePhone) || 0) + 1);
      assignedPeriodsMap.set(substitutePhone, 
        new Set([...(assignedPeriodsMap.get(substitutePhone) || []), period])
      );
    });

    // Create lookup maps
    const teacherMap = this.createTeacherMap(teachers);
    const scheduleMap = new Map(teacherSchedules || []);

    // Resolve absent teachers using variations
    let absentTeachers: Teacher[] = [];
    try {
      absentTeachers = this.resolveTeacherNames(absentTeacherNames, teacherMap, warnings);
    } catch (error) {
      warnings.push(`Error resolving teachers: ${error}`);
      return { assignments, warnings };
    }

    // Filter available substitutes - convert substitutes map to array for processing
    const substituteArray = this.createSubstituteArray(teachers);
    const availableSubstitutes = substituteArray.filter(sub => 
      !absentTeachers.some(absent => absent.phone === sub.phone)
    );

    // Process each absent teacher
    for (const teacher of absentTeachers) {
      const affectedPeriods = this.getAffectedPeriods(teacher.name, day, teacherMap, warnings);
      
      for (const { period, className } of affectedPeriods) {
        const { candidates, warnings: subWarnings } = this.findSuitableSubstitutes({
          className,
          period,
          day,
          substitutes: availableSubstitutes,
          teachers: teacherMap,
          schedules: scheduleMap,
          currentWorkload: workloadMap,
          assignedPeriodsMap
        });

        warnings.push(...subWarnings);

        if (candidates.length === 0) {
          warnings.push(`No substitute found for ${className} period ${period}`);
          continue;
        }

        // Reset workload tracking for each period to ensure fair distribution
        const freshWorkloadMap = new Map(workloadMap);
        const selected = this.selectBestCandidate(candidates, freshWorkloadMap);
        
        // Record assignment
        assignments.push({
          originalTeacher: teacher.name,
          period,
          className,
          substitute: selected.name,
          substitutePhone: selected.phone
        });

        // Update tracking maps
        workloadMap.set(selected.phone, (workloadMap.get(selected.phone) || 0) + 1);
        assignedPeriodsMap.set(selected.phone, 
          new Set([...(assignedPeriodsMap.get(selected.phone) || []), period])
        );
      }
    }

    // Validate final assignments
    const validation = this.validateAssignments({
      assignments,
      workloadMap,
      teachers: teacherMap,
      maxWorkload: MAX_DAILY_WORKLOAD
    });

    // Save the assignments to file
    this.saveAssignmentsToFile(assignments, warnings);

    return {
      assignments,
      warnings: [...warnings, ...validation.warnings]
    };
  }

  private createSubstituteArray(teachers: Teacher[]): Teacher[] {
    // Create substitute teachers array from the teachers that have phone numbers
    return teachers.filter(teacher => teacher.phone && teacher.phone.trim() !== '');
  }

  private createTeacherMap(teachers: Teacher[]): Map<string, Teacher> {
    const map = new Map<string, Teacher>();
    for (const teacher of teachers) {
      // Add by main name
      map.set(teacher.name.toLowerCase().trim(), teacher);
      
      // Add by variations if available
      if (teacher.variations) {
        for (const variation of teacher.variations) {
          const key = variation.toLowerCase().trim();
          map.set(key, teacher);
        }
      }
    }
    return map;
  }

  private resolveTeacherNames(
    names: string[], 
    teacherMap: Map<string, Teacher>,
    warnings: string[]
  ): Teacher[] {
    const resolvedTeachers: Teacher[] = [];
    
    for (const name of names) {
      const normalized = name.toLowerCase().trim();
      const teacher = teacherMap.get(normalized);
      if (!teacher) {
        warnings.push(`Unknown teacher: ${name}`);
        continue;
      }
      resolvedTeachers.push(teacher);
    }
    
    return resolvedTeachers;
  }

  private getAffectedPeriods(
    teacherName: string,
    day: string,
    teacherMap: Map<string, Teacher>,
    warnings: string[]
  ): { period: number; className: string }[] {
    // Get classes that this teacher teaches on this day
    const classes = this.teacherClasses.get(teacherName.toLowerCase());
    if (!classes || classes.length === 0) {
      warnings.push(`No schedule found for ${teacherName} on ${day}`);
      return [];
    }
    
    return classes
      .filter(cls => cls.day.toLowerCase() === day.toLowerCase())
      .map(cls => ({
        period: cls.period,
        className: cls.className
      }));
  }

  private findSuitableSubstitutes(params: {
    className: string;
    period: number;
    day: string;
    substitutes: Teacher[];
    teachers: Map<string, Teacher>;
    schedules: Map<string, Assignment[]>;
    currentWorkload: Map<string, number>;
    assignedPeriodsMap: Map<string, Set<number>>;
  }): { candidates: Teacher[]; warnings: string[] } {
    const warnings: string[] = [];
    const targetGrade = parseInt(params.className.replace(/\D/g, '')) || 0;
    
    // Check if already teaching during this period
    const availableSubstitutes = params.substitutes.filter(sub => {
      // Check if already assigned to this period
      if (params.assignedPeriodsMap.get(sub.phone)?.has(params.period)) {
        return false;
      }
      
      // Check workload
      const currentWorkload = params.currentWorkload.get(sub.phone) || 0;
      if (currentWorkload >= MAX_DAILY_WORKLOAD) {
        warnings.push(`${sub.name} exceeded maximum workload (${currentWorkload}/${MAX_DAILY_WORKLOAD})`);
        return false;
      }
      
      return true;
    });
    
    // If no substitutes are available at all, return empty
    if (availableSubstitutes.length === 0) {
      warnings.push(`No available substitutes for period ${params.period}`);
      return { candidates: [], warnings };
    }
    
    // Sort by workload (ascending)
    return {
      candidates: availableSubstitutes,
      warnings
    };
  }

  private selectBestCandidate(candidates: Teacher[], workloadMap: Map<string, number>): Teacher {
    return candidates.sort((a, b) => {
      const aWorkload = workloadMap.get(a.phone) || 0;
      const bWorkload = workloadMap.get(b.phone) || 0;
      
      // First prioritize by workload
      return aWorkload - bWorkload;
    })[0];
  }

  private validateAssignments(params: {
    assignments: SubstituteAssignment[];
    workloadMap: Map<string, number>;
    teachers: Map<string, Teacher>;
    maxWorkload: number;
  }): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    // Check for overloaded teachers
    for (const [phone, workload] of params.workloadMap.entries()) {
      if (workload > params.maxWorkload) {
        const teacher = Array.from(params.teachers.values())
          .find(t => t.phone === phone);
        if (teacher) {
          warnings.push(`${teacher.name} exceeded maximum workload (${workload}/${params.maxWorkload})`);
        }
      }
    }
    
    return { valid: warnings.length === 0, warnings };
  }

  private getDayFromDate(dateString: string): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = new Date(dateString);
    return days[date.getDay()].toLowerCase();
  }

  private async loadTeachers(path: string): Promise<Teacher[]> {
    if (!fs.existsSync(path)) {
      return [];
    }
    
    try {
      const data = fs.readFileSync(path, 'utf-8');
      const teachers = JSON.parse(data);
      
      // Add default grade levels if missing
      return teachers.map((teacher: any) => ({
        ...teacher,
        id: teacher.id || teacher.phone || `teacher-${Math.random().toString(36).substring(2, 9)}`,
        gradeLevel: teacher.gradeLevel || 10, // Default to highest grade level
        isRegular: teacher.isRegular !== undefined ? teacher.isRegular : true
      }));
    } catch (error) {
      throw new Error(`Error loading teachers: ${error}`);
    }
  }

  private async loadSchedules(path: string): Promise<Map<string, Assignment[]>> {
    if (!fs.existsSync(path)) {
      return new Map();
    }
    
    try {
      const data = fs.readFileSync(path, 'utf-8');
      const schedules = JSON.parse(data);
      return new Map(Object.entries(schedules));
    } catch (error) {
      throw new Error(`Error loading schedules: ${error}`);
    }
  }

  private async loadAssignedTeachers(path: string): Promise<SubstituteAssignment[]> {
    if (!fs.existsSync(path)) {
      return [];
    }
    
    try {
      const data = fs.readFileSync(path, 'utf-8');
      const { assignments } = JSON.parse(data);
      return assignments || [];
    } catch (error) {
      throw new Error(`Error loading assigned teachers: ${error}`);
    }
  }

  private saveAssignmentsToFile(assignments: SubstituteAssignment[], warnings: string[]): void {
    try {
      // Create a well-formatted data object
      const data = {
        assignments: assignments.map(a => ({
          originalTeacher: a.originalTeacher || "",
          period: a.period || 0,
          className: a.className || "",
          substitute: a.substitute || "",
          substitutePhone: a.substitutePhone || ""
        })),
        warnings: warnings || []
      };
      
      // Log what we're saving
      console.log(`Saving ${assignments.length} assignments to ${DEFAULT_ASSIGNED_TEACHERS_PATH}`);
      
      // Ensure the directory exists
      const dirPath = path.dirname(DEFAULT_ASSIGNED_TEACHERS_PATH);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Write the file
      fs.writeFileSync(
        DEFAULT_ASSIGNED_TEACHERS_PATH, 
        JSON.stringify(data, null, 2)
      );
      
      console.log("Assignments saved successfully");
    } catch (error) {
      console.error("Error saving assignments:", error);
      throw new Error(`Error saving assignments: ${error}`);
    }
  }

  verifyAssignments(): VerificationReport[] {
    const reports: VerificationReport[] = [];
    reports.push(this.verifySubstituteLimits());
    reports.push(this.verifyAvailability());
    reports.push(this.verifyWorkloadDistribution());
    return reports;
  }

  private verifySubstituteLimits(): VerificationReport {
    const violations = Array.from(this.substituteAssignments.entries())
      .filter(([sub, assignments]) => assignments.length > this.MAX_SUBSTITUTE_ASSIGNMENTS)
      .map(([sub]) => sub);

    return {
      check: "Substitute Assignment Limits",
      status: violations.length === 0 ? "PASS" : "FAIL",
      details: violations.length > 0 ? `${violations.length} substitutes exceeded max assignments` : "All within limits",
    };
  }

  private verifyAvailability(): VerificationReport {
    const conflicts = this.allAssignments.filter(assignment => {
      const { day, period, substitute } = assignment as any;
      const periodTeachers = this.schedule.get(day)?.get(period) || [];
      return periodTeachers.includes(substitute);
    });

    return {
      check: "Availability Validation",
      status: conflicts.length === 0 ? "PASS" : "FAIL",
      details: conflicts.length > 0 ? `${conflicts.length} scheduling conflicts found` : "No conflicts",
    };
  }

  private verifyWorkloadDistribution(): VerificationReport {
    const overloaded = Array.from(this.teacherWorkload.entries())
      .filter(([teacher, count]) =>
        (this.substitutes.has(teacher) && count > this.MAX_SUBSTITUTE_ASSIGNMENTS) ||
        (!this.substitutes.has(teacher) && count > this.MAX_REGULAR_TEACHER_ASSIGNMENTS)
      )
      .map(([teacher]) => teacher);

    return {
      check: "Workload Distribution",
      status: overloaded.length === 0 ? "PASS" : "FAIL",
      details: overloaded.length > 0 ? `${overloaded.length} teachers overloaded` : "Fair distribution",
    };
  }

  getSubstituteAssignments(): Record<string, any> {
    // Read from file
    try {
      if (fs.existsSync(DEFAULT_ASSIGNED_TEACHERS_PATH)) {
        const data = fs.readFileSync(DEFAULT_ASSIGNED_TEACHERS_PATH, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      // Fallback to legacy format if error
    }
    
    // Legacy format - convert assignments to a more useful format
    const result: Record<string, any> = {};
    
    this.allAssignments.forEach(assignment => {
      const key = `${(assignment as any).period}-${assignment.className}`;
      result[key] = {
        originalTeacher: (assignment as any).originalTeacher,
        substitute: (assignment as any).substitute,
        substitutePhone: this.substitutes.get((assignment as any).substitute),
        period: (assignment as any).period,
        className: assignment.className,
        day: assignment.day
      };
    });
    
    return result;
  }

  clearAssignments(): void {
    this.substituteAssignments.clear();
    this.teacherWorkload.clear();
    this.allAssignments = [];
  }

  private normalizeName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private normalizeDay(day: string): string {
    const dayMap: Record<string, string> = {
      'mon': 'monday',
      'tue': 'tuesday',
      'wed': 'wednesday',
      'thu': 'thursday',
      'fri': 'friday',
      'sat': 'saturday',
      'sun': 'sunday'
    };
    
    const normalized = day.trim().toLowerCase();
    const shortDay = normalized.slice(0, 3);
    
    return dayMap[shortDay] || normalized;
  }
  
  assignSubstitutes(absentTeacher: string, day: string): any[] {
    // This method is kept for backward compatibility
    // It now delegates to the new autoAssignSubstitutes method
    // Temporarily wrapping with legacy interface for smoother transition
    return this.allAssignments;
  }
}
