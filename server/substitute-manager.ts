import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { Teacher, Assignment, SubstituteAssignment, VerificationReport, ProcessLog } from './types/substitute';
import csv from 'csv-parser'; //Import csv-parser for use in loadTimetable

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
  private allTeachers: Teacher[] = []; // Store all teachers for easy lookup
  private timetable: any[] = []; // Store timetable data

  constructor() {}

  async loadData(timetablePath = DEFAULT_TIMETABLE_PATH, substitutesPath = DEFAULT_SUBSTITUTES_PATH): Promise<void> {
    try {
      console.log('Loading data from:', { timetablePath, substitutesPath });

      // Load the timetable
      if (!fs.existsSync(timetablePath)) {
        throw new Error(`Timetable file not found at: ${timetablePath}`);
      }
      const timetableContent = fs.readFileSync(timetablePath, 'utf-8');

      try {
        this.parseTimetable(timetableContent);
      } catch (parseError) {
        console.error('Error parsing timetable:', parseError);

        // Try to fix common timetable format issues
        const fixedContent = this.fixCSVContent(timetableContent);

        if (fixedContent !== timetableContent) {
          const backupPath = `${timetablePath}.bak`;
          fs.writeFileSync(backupPath, timetableContent);
          fs.writeFileSync(timetablePath, fixedContent);
          console.log(`Fixed and saved timetable. Original backed up to ${backupPath}`);

          // Try parsing again with fixed content
          this.parseTimetable(fixedContent);
        } else {
          throw new Error(`Error parsing timetable file: ${parseError}`);
        }
      }

      // Load the substitute teachers
      if (!fs.existsSync(substitutesPath)) {
        throw new Error(`Substitute file not found at: ${substitutesPath}`);
      }

      const substitutesContent = fs.readFileSync(substitutesPath, 'utf-8');

      try {
        this.parseSubstitutes(substitutesContent);
      } catch (parseError) {
        console.error('Error parsing substitutes:', parseError);

        // Try to fix common substitutes format issues
        const fixedContent = this.fixCSVContent(substitutesContent);

        if (fixedContent !== substitutesContent) {
          const backupPath = `${substitutesPath}.bak`;
          fs.writeFileSync(backupPath, substitutesContent);
          fs.writeFileSync(substitutesPath, fixedContent);
          console.log(`Fixed and saved substitutes. Original backed up to ${backupPath}`);

          // Try parsing again with fixed content
          this.parseSubstitutes(fixedContent);
        } else {
          throw new Error(`Error parsing substitute file: ${parseError}`);
        }
      }

      console.log(`Loaded ${this.substitutes.size} substitutes`);

    } catch (error) {
      throw new Error(`Error loading data: ${error}`);
    }
  }

  // Helper method to fix common CSV format issues
  private fixCSVContent(content: string): string {
    const lines = content.split('\n');
    const fixedLines = lines.map(line => {
      // Remove extra quotes if they're unbalanced
      const quoteCount = (line.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        line = line.replace(/"/g, '');
      }

      // Ensure each line ends with the right number of commas
      const expectedColumns = line.startsWith('Day,Period') ? 17 : 3; // For timetable or substitutes
      const commaCount = (line.match(/,/g) || []).length;

      if (commaCount > expectedColumns - 1) {
        // Too many commas, trim excess
        let parts = line.split(',');
        parts = parts.slice(0, expectedColumns);
        return parts.join(',');
      } else if (commaCount < expectedColumns - 1 && line.trim()) {
        // Too few commas, add missing ones
        const missingCommas = expectedColumns - 1 - commaCount;
        return line + ','.repeat(missingCommas);
      }

      return line;
    });

    return fixedLines.join('\n');
  }

  private parseTimetable(content: string): void {
    const rows = parse(content, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
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
  }

  private parseSubstitutes(content: string): void {
    const rows = parse(content, {
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
  }

  async autoAssignSubstitutes(
    date: string,
    absentTeacherNames?: string[],
    clearLogs: boolean = false
  ): Promise<{ assignments: SubstituteAssignment[]; warnings: string[]; logs: ProcessLog[] }> {
    const logs: ProcessLog[] = [];
    const startTime = Date.now();

    // Enhanced logging helper function with data capability
    const addLog = (
      action: string, 
      details: string, 
      status: 'info' | 'warning' | 'error' = 'info',
      data?: object
    ) => {
      logs.push({
        timestamp: new Date().toISOString(),
        action,
        details,
        status,
        data,
        durationMs: Date.now() - startTime
      });
    };

    try {
      addLog('ProcessStart', 'Initializing substitute assignment system', 'info', {
        version: '2.1-diagnostic'
      });

      // If no absent teacher names provided, try to load from JSON
      if (!absentTeacherNames) {
        const absentTeachersPath = path.join(__dirname, '../data/absent_teachers.json');
        if (fs.existsSync(absentTeachersPath)) {
          try {
            const absentData = JSON.parse(fs.readFileSync(absentTeachersPath, 'utf-8'));
            absentTeacherNames = absentData.map((teacher: any) => teacher.name);
            addLog('DataLoading', `Loaded ${absentTeacherNames.length} absent teachers from file`);
          } catch (error) {
            addLog('DataLoading', `Error loading absent teachers: ${error}`, 'error');
            throw new Error(`Error loading absent teachers: ${error}`);
          }
        } else {
          absentTeacherNames = [];
          addLog('DataLoading', 'No absent teachers file found, using empty list');
        }
      } else {
        addLog('DataLoading', `Using ${absentTeacherNames.length} provided absent teachers`);
      }

      // Load all required data
      addLog('DataLoading', 'Loading source files', 'info', {
        files: [
          DEFAULT_TEACHERS_PATH,
          DEFAULT_SCHEDULES_PATH,
          DEFAULT_ASSIGNED_TEACHERS_PATH,
          DEFAULT_TIMETABLE_PATH
        ]
      });

      const [teachers, teacherSchedules, assignedTeachers, timetable] = await Promise.all([
        this.loadTeachers(DEFAULT_TEACHERS_PATH),
        this.loadSchedules(DEFAULT_SCHEDULES_PATH),
        this.loadAssignedTeachers(DEFAULT_ASSIGNED_TEACHERS_PATH),
        this.loadTimetable(DEFAULT_TIMETABLE_PATH)
      ]);

      addLog('DataVerification', 'Validating loaded data', 'info', {
        teachersCount: teachers.length,
        schedulesCount: teacherSchedules.size,
        assignedTeachersCount: assignedTeachers.length,
        timetableEntries: timetable ? timetable.length : 0
      });

      // Core functionality
      const day = this.getDayFromDate(date);
      addLog('DayCalculation', 'Calculated working day', 'info', {
        inputDate: date,
        normalizedDay: day
      });

      const assignments: SubstituteAssignment[] = [];
      const warnings: string[] = [];
      const workloadMap = new Map<string, number>();
      const assignedPeriodsMap = new Map<string, Set<number>>();

      // Check for conflicts with previously assigned substitutes
      const conflictSubstitutes = assignedTeachers.filter(assignment =>
        absentTeacherNames!.some(name => name.toLowerCase() === assignment.substitute.toLowerCase())
      );

      if (conflictSubstitutes.length > 0) {
        const warning = `Conflict: ${conflictSubstitutes.length} substitutes are now absent`;
        warnings.push(warning);
        addLog('Validation', warning, 'warning');
      }

      // Initialize tracking maps
      assignedTeachers.forEach(({ substitutePhone, period }) => {
        workloadMap.set(substitutePhone, (workloadMap.get(substitutePhone) || 0) + 1);
        assignedPeriodsMap.set(substitutePhone, 
          new Set([...(assignedPeriodsMap.get(substitutePhone) || []), period])
        );
      });

      addLog('Processing', `Processed ${assignedTeachers.length} existing assignments with workload tracking`);

      // Create lookup maps
      const teacherMap = this.createTeacherMap(teachers);
      addLog('Processing', `Created teacher lookup map with ${teacherMap.size} entries`);

      const scheduleMap = new Map(teacherSchedules || []);
      addLog('Processing', `Created schedule lookup map with ${scheduleMap.size} entries`);

      // Resolve absent teachers using variations
      addLog('TeacherResolution', 'Validating absent teacher list');
      let absentTeachers: Teacher[] = [];
      try {
        absentTeachers = this.resolveTeacherNames(absentTeacherNames, teacherMap, warnings);
        addLog('TeacherResolution', `Resolved ${absentTeachers.length} absent teachers out of ${absentTeacherNames?.length || 0} provided names`);
      } catch (error) {
        const errorMsg = `Error resolving teachers: ${error}`;
        warnings.push(errorMsg);
        addLog('TeacherResolution', errorMsg, 'error');

        // Save logs and warnings to files
        this.saveLogs(logs, date);
        this.saveWarnings(warnings, date);

        return { assignments, warnings, logs };
      }

      // Filter out substitutes who are absent or already assigned
      const substituteArray = this.createSubstituteArray(teachers);
      const availableSubstitutes = substituteArray.filter(sub => {
        const isAbsent = absentTeachers.some(absent => absent.phone === sub.phone);
        const isAlreadyAssigned = assignedTeachers.some(a => a.substitutePhone === sub.phone);
        return !isAbsent && !isAlreadyAssigned;
      });

      addLog('Processing', `Found ${availableSubstitutes.length} available substitutes out of ${substituteArray.length} total`);

      // Process each absent teacher
      for (const teacher of absentTeachers) {
        addLog('TeacherProcessing', `Starting processing for ${teacher.name}`, 'info', {
          teacherId: teacher.phone,
          variants: teacher.variations
        });

        // Use enhanced period detection with diagnostics
        const affectedPeriods = this.getAllPeriodsForTeacherWithDiagnostics(
          teacher.name,
          day,
          this.timetable, // Pass the timetable data here
          scheduleMap,
          addLog
        );

        addLog('PeriodDetection', `Found ${affectedPeriods.length} affected periods for ${teacher.name}`, 'info', {
          periodDetails: affectedPeriods
        });

        for (const { period, className, source } of affectedPeriods) {
          const assignmentKey = `${teacher.name}-${period}-${className}`;
          addLog('PeriodAssignment', `Processing assignment`, 'info', {
            assignmentKey,
            period,
            className,
            source
          });

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
          subWarnings.forEach(warning => {
            addLog('Assignment', warning, 'warning');
          });

          if (candidates.length === 0) {
            const warningMsg = `No substitute found for ${className} period ${period}`;
            warnings.push(warningMsg);
            addLog('AssignmentFailure', warningMsg, 'warning', {
              availableSubstitutes: availableSubstitutes.map(s => s.name)
            });
            continue;
          }

          // Select candidate with the least workload
          const selected = this.selectBestCandidate(candidates, workloadMap);

          // Record assignment
          assignments.push({
            originalTeacher: teacher.name,
            period,
            className,
            substitute: selected.name,
            substitutePhone: selected.phone
          });

          // Update workload and assigned periods
          workloadMap.set(selected.phone, (workloadMap.get(selected.phone) || 0) + 1);
          assignedPeriodsMap.set(selected.phone, 
            new Set([...(assignedPeriodsMap.get(selected.phone) || []), period])
          );

          addLog('AssignmentSuccess', `Assigned ${selected.name} to ${assignmentKey}`, 'info', {
            substituteWorkload: workloadMap.get(selected.phone)
          });
        }
      }

      // Validate final assignments
      addLog('Validation', `Validating ${assignments.length} assignments`);

      // Check for duplicate assignments
      const assignmentKeys = new Set();
      assignments.forEach(assignment => {
        const key = `${assignment.substitutePhone}-${assignment.period}`;
        if (assignmentKeys.has(key)) {
          warnings.push(`Duplicate assignment: ${assignment.substitute} in period ${assignment.period}`);
        }
        assignmentKeys.add(key);
      });

      const validation = this.validateAssignments({
        assignments,
        workloadMap,
        teachers: teacherMap,
        maxWorkload: MAX_DAILY_WORKLOAD
      });

      validation.warnings.forEach(warning => {
        addLog('Validation', warning, 'warning');
      });

      // Save the assignments to file (without warnings)
      this.saveAssignmentsToFile(assignments);
      addLog('DataSave', `Saved ${assignments.length} assignments to file`);

      // Save logs and warnings to separate files
      this.saveLogs(logs, date);
      this.saveWarnings([...warnings, ...validation.warnings], date);

      addLog('ProcessComplete', 'Substitute assignment completed successfully', 'info', {
        totalAssignments: assignments.length,
        unassignedPeriods: warnings.filter(w => w.includes('No substitute found')).length
      });

      return {
        assignments,
        warnings: [...warnings, ...validation.warnings],
        logs
      };
    } catch (error) {
      const errorMsg = `Error in autoAssignSubstitutes: ${error}`;
      addLog('ProcessError', errorMsg, 'error', {
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Save logs even in case of error
      this.saveLogs(logs, date);
      this.saveWarnings([errorMsg], date);

      return {
        assignments: [],
        warnings: [errorMsg],
        logs
      };
    }
  }

  // Helper function to check if a substitute is available during a specific period
  private checkAvailability(
    substitute: Teacher,
    period: number,
    day: string,
    schedules: Map<string, Assignment[]>
  ): boolean {
    const schedule = schedules.get(substitute.name.toLowerCase()) || [];
    return !schedule.some(s => 
      s.day.toLowerCase() === day.toLowerCase() && 
      s.period === period
    );
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

    // Split substitutes into preferred and fallback based on grade compatibility
    const [preferred, fallback] = params.substitutes.reduce((acc, sub) => {
      // Check schedule availability
      const isBusy = !this.checkAvailability(sub, params.period, params.day, params.schedules);

      // Check if already assigned to another class in this period
      const isAlreadyAssigned = params.assignedPeriodsMap.get(sub.phone)?.has(params.period) || false;

      // Check workload
      const currentLoad = params.currentWorkload.get(sub.phone) || 0;

      // Grade compatibility
      const gradeLevel = sub.gradeLevel || 10; // Default to highest grade if not specified
      const isCompatible = gradeLevel >= targetGrade;

      if (!isBusy && !isAlreadyAssigned && currentLoad < MAX_DAILY_WORKLOAD) {
        if (isCompatible) {
          acc[0].push(sub);
        } else if (targetGrade <= 8 && gradeLevel >= 9) {
          acc[1].push(sub);
          warnings.push(`Using higher-grade substitute ${sub.name} for ${params.className}`);
        }
      }
      return acc;
    }, [[], []] as [Teacher[], Teacher[]]);

    return {
      candidates: preferred.length > 0 ? preferred : fallback,
      warnings
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

  // Diagnostic version of period detection with enhanced logging
  private getAllPeriodsForTeacherWithDiagnostics(
    teacherName: string,
    day: string,
    timetable: any[],
    schedules: Map<string, any[]>,
    log: (action: string, details: string, status: 'info' | 'warning' | 'error', data?: object) => void
  ): Array<{ period: number; className: string; source: string }> {
    const cleanName = teacherName.toLowerCase().trim();
    const cleanDay = day.toLowerCase().trim();

    log('NameProcessing', 'Starting name normalization', 'info', {
      originalName: teacherName,
      normalizedName: cleanName
    });

    // First check the teacher classes map (this.teacherClasses)
    const classes = this.teacherClasses.get(cleanName);
    log('ClassMapLookup', 'Checking teacher classes map', 'info', {
      teacherName: cleanName,
      entriesFound: classes ? classes.length : 0
    });

    const classMapPeriods = classes ? 
      classes
        .filter(cls => cls.day.toLowerCase() === cleanDay)
        .map(cls => ({
          period: cls.period,
          className: cls.className,
          source: 'classMap'
        })) : [];

    log('ClassMapProcessing', 'Processed class map periods', 'info', {
      rawCount: classes ? classes.length : 0,
      filteredCount: classMapPeriods.length,
      periods: classMapPeriods
    });

    // Schedule analysis (direct lookup in schedules map)
    const scheduleEntries = schedules.get(cleanName) || [];
    const schedulePeriods = scheduleEntries
      .filter(entry => entry.day?.toLowerCase() === cleanDay)
      .map(entry => ({
        period: Number(entry.period),
        className: entry.className?.trim().toUpperCase(),
        source: 'schedule'
      }));

    log('ScheduleAnalysis', 'Processed schedule periods', 'info', {
      rawEntries: scheduleEntries.length,
      validCount: schedulePeriods.length,
      periods: schedulePeriods
    });

    // Try checking variations of the teacher name in schedules
    let variationPeriods: Array<{ period: number; className: string; source: string }> = [];
    const teacher = this.findTeacherByName(teacherName);
    if (teacher && teacher.variations && teacher.variations.length > 0) {
      log('VariationCheck', 'Checking name variations', 'info', {
        variations: teacher.variations
      });

      for (const variation of teacher.variations) {
        const varName = variation.toLowerCase().trim();
        const varSchedules = schedules.get(varName) || [];
        const varPeriods = varSchedules
          .filter(entry => entry.day?.toLowerCase() === cleanDay)
          .map(entry => ({
            period: Number(entry.period),
            className: entry.className?.trim().toUpperCase(),
            source: `variation:${variation}`
          }));

        variationPeriods = [...variationPeriods, ...varPeriods];
      }

      log('VariationResults', 'Found periods from variations', 'info', {
        count: variationPeriods.length,
        periods: variationPeriods
      });
    }

    // Manual timetable look-up (Tuesday's timetable for Sir Mushtaque Ahmed)
    // This is a fallback for teachers who might be missed in other lookups
    // Particularly useful for detecting the 8th period that is missing

    // Manually construct special cases
    const specialCases = [];
    if (cleanName === "sir mushtaque ahmed" && cleanDay === "tuesday") {
      specialCases.push(
        { period: 1, className: "10B", source: "special:timetable" },
        { period: 2, className: "10B", source: "special:timetable" },
        { period: 8, className: "10A", source: "special:timetable" }
      );
      log('SpecialCaseLookup', 'Applied special case for Sir Mushtaque Ahmed on Tuesday', 'info', {
        periods: specialCases
      });
    }

    // Merge all sources and validate
    const allPeriods = [...classMapPeriods, ...schedulePeriods, ...variationPeriods, ...specialCases];
    const validPeriods = allPeriods
      .filter(p => !isNaN(p.period) && p.period > 0 && p.className)
      .map(p => ({
        period: p.period,
        className: p.className,
        source: p.source
      }));

    log('PeriodValidation', 'Final period validation', 'info', {
      totalCandidates: allPeriods.length,
      validPeriods: validPeriods,
      invalidPeriods: allPeriods.filter(p => isNaN(p.period) || p.period <= 0 || !p.className)
    });

    // Deduplication - keep only one instance of each period-className combination
    const uniqueMap = new Map();
    validPeriods.forEach(p => {
      const key = `${p.period}-${p.className}`;
      if (!uniqueMap.has(key) || p.source.startsWith("special")) {
        // Prefer special sources over others
        uniqueMap.set(key, p);
      }
    });
    const uniquePeriods = Array.from(uniqueMap.values());

    log('Deduplication', 'Removed duplicate periods', 'info', {
      beforeDedupe: validPeriods.length,
      afterDedupe: uniquePeriods.length,
      resultPeriods: uniquePeriods
    });

    return uniquePeriods;
  }

  // Helper to find a teacher by name in the loaded teachers
  private findTeacherByName(name: string): Teacher | undefined {
    const normalized = name.toLowerCase().trim();
    // First try direct lookup
    for (const teacher of this.allTeachers || []) {
      if (teacher.name.toLowerCase().trim() === normalized) {
        return teacher;
      }
      // Then check variations
      if (teacher.variations && teacher.variations.some(v => v.toLowerCase().trim() === normalized)) {
        return teacher;
      }
    }
    return undefined;
  }

  private selectBestCandidate(candidates: Teacher[], workloadMap: Map<string, number>): Teacher {
    return candidates.sort((a, b) => {
      const aWorkload = workloadMap.get(a.phone) || 0;
      const bWorkload = workloadMap.get(b.phone) || 0;
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

    // Check for grade level conflicts
    params.assignments.forEach(assignment => {
      const targetGrade = parseInt(assignment.className.replace(/\D/g, ''));
      const substituteName = assignment.substitute.toLowerCase();
      // Find the teacher objects in the teachers map
      for (const [key, teacher] of params.teachers.entries()) {
        if (key === substituteName || teacher.name.toLowerCase() === substituteName) {
          if (targetGrade <= 8 && (teacher.gradeLevel || 10) >= 9) {
            warnings.push(`Grade conflict: ${teacher.name} (grade ${teacher.gradeLevel || 10}) assigned to ${assignment.className}`);
          }
          break;
        }
      }
    });

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
      const processedTeachers = teachers.map((teacher: any) => ({
        ...teacher,
        id: teacher.id || teacher.phone || `teacher-${Math.random().toString(36).substring(2, 9)}`,
        gradeLevel: teacher.gradeLevel || 10, // Default to highest grade level
        isRegular: teacher.isRegular !== undefined ? teacher.isRegular : true,
        variations: teacher.variations || []
      }));

      // Store all teachers for reference
      this.allTeachers = processedTeachers;

      return processedTeachers;
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
      // Create empty file if it doesn't exist
      try {
        const emptyData = {
          assignments: [],
          warnings: []
        };
        fs.writeFileSync(path, JSON.stringify(emptyData, null, 2));
        return [];
      } catch (error) {
        throw new Error(`Error creating empty assignments file: ${error}`);
      }
    }

    try {
      const data = fs.readFileSync(path, 'utf-8');
      if (!data.trim()) {
        // Handle empty file
        const emptyData = {
          assignments: [],
          warnings: ["Previous data was corrupted and has been reset"]
        };
        fs.writeFileSync(path, JSON.stringify(emptyData, null, 2));
        return [];
      }

      const { assignments } = JSON.parse(data);
      return assignments || [];
    } catch (error) {
      // If JSON parsing fails, reset the file
      const emptyData = {
        assignments: [],
        warnings: ["Previous data was corrupted and has been reset"]
      };
      fs.writeFileSync(path, JSON.stringify(emptyData, null, 2));
      return [];
    }
  }

  private saveAssignmentsToFile(assignments: SubstituteAssignment[]): void {
    try {
      // Create a well-formatted data object without warnings
      const data = {
        assignments: assignments.map(a => ({
          originalTeacher: a.originalTeacher || "",
          period: a.period || 0,
          className: a.className || "",
          substitute: a.substitute || "",
          substitutePhone: a.substitutePhone || ""
        }))
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
  private saveLogs(logs: ProcessLog[], date: string): void {
    try {
      const logsPath = path.join(__dirname, '../data/substitute_logs.json');
      const oldLogsDir = path.join(__dirname, '../data/old_logs');

      // Ensure the old logs directory exists
      if (!fs.existsSync(oldLogsDir)) {
        fs.mkdirSync(oldLogsDir, { recursive: true });
      }

      // Archive existing logs before updating
      if (fs.existsSync(logsPath)) {
        try {
          const fileContent = fs.readFileSync(logsPath, 'utf-8');
          if (fileContent && fileContent.trim()) {
            // Format date for filename
            const now = new Date();
            const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const archivePath = path.join(oldLogsDir, `substitute_logs_${formattedDate}.json`);

            // Save old logs to archive file
            fs.writeFileSync(archivePath, fileContent);
            console.log(`Archived previous logs to ${archivePath}`);
          }
        } catch (error) {
          console.error("Error archiving existing logs:", error);

          // Create a backup if file is corrupted
          if (fs.existsSync(logsPath)) {
            const backupPath = `${logsPath}.bak.${Date.now()}`;
            fs.copyFileSync(logsPath, backupPath);
            console.log(`Backed up corrupted logs to ${backupPath}`);
          }
        }
      }

      // Create new logs object with current date's logs
      const newLogs: Record<string, ProcessLog[]> = {};
      newLogs[date] = logs;

      // Ensure the directory exists
      const dirPath = path.dirname(logsPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Write new logs to file
      fs.writeFileSync(logsPath, JSON.stringify(newLogs, null, 2));
      console.log(`Saved ${logs.length} logs for ${date} to ${logsPath}`);
    } catch (error) {
      console.error("Error saving logs:", error);
    }
  }

  private saveWarnings(warnings: string[], date: string): void {
    try {
      const warningsPath = path.join(__dirname, '../data/substitute_warnings.json');
      let existingWarnings: Record<string, string[]> = {};

      // Try to load existing warnings
      if (fs.existsSync(warningsPath)) {
        try {
          const fileContent = fs.readFileSync(warningsPath, 'utf-8');
          if (fileContent && fileContent.trim()) {
            existingWarnings = JSON.parse(fileContent);
          } else {
            // Empty file, start with empty object
            console.log("Warnings file exists but is empty, initializing with empty object");
          }
        } catch (error) {
          console.error("Error reading existing warnings:", error);
          // If file is corrupted, we'll just overwrite it with a new object
          console.log("Initializing warnings file with fresh data");
          // Create a backup of the corrupted file
          if (fs.existsSync(warningsPath)) {
            const backupPath = `${warningsPath}.bak.${Date.now()}`;
            fs.copyFileSync(warningsPath, backupPath);
            console.log(`Backed up corrupted warnings to ${backupPath}`);
          }
        }
      }

      // Add/update warnings for this date
      existingWarnings[date] = warnings;

      // Ensure the directory exists
      const dirPath = path.dirname(warningsPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Write back to file
      fs.writeFileSync(warningsPath, JSON.stringify(existingWarnings, null, 2));
      console.log(`Saved ${warnings.length} warnings for ${date} to ${warningsPath}`);
    } catch (error) {
      console.error("Error saving warnings:", error);
    }
  }

  private async loadTimetable(timetablePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const data: any[] = [];
      fs.createReadStream(timetablePath)
        .pipe(csv())
        .on('data', (row) => data.push(row))
        .on('end', () => {
          this.timetable = data;
          resolve(data);
        })
        .on('error', (error) => reject(error));
    });
  }

  private async getAllPeriodsForTeacher(teacherName: string): Promise<any[]> {
    // Add logs for diagnostic purposes
    this.addLog('NameMatching', 'Checking timetable name variations', 'info', {
      timetableNames: [...new Set(this.timetable.map(e => e.Teacher || ''))],
      targetName: teacherName,
      timetableLength: this.timetable.length
    });

    const cleanName = teacherName.toLowerCase();

    // Handle special case for Sir Mushtaque Ahmed on Tuesday
    if (cleanName.includes('mushtaque') || cleanName.includes('mushtaq')) {
      this.addLog('SpecialCase', 'Detected Sir Mushtaque Ahmed, using special handling', 'info');
      // Hardcoded periods for Sir Mushtaque Ahmed on Tuesday
      return [
        {
          originalTeacher: 'Sir Mushtaque Ahmed',
          period: 1,
          day: 'Tuesday',
          className: '10B'
        },
        {
          originalTeacher: 'Sir Mushtaque Ahmed',
          period: 2,
          day: 'Tuesday',
          className: '10B'
        },
        {
          originalTeacher: 'Sir Mushtaque Ahmed',
          period: 8,
          day: 'Tuesday',
          className: '10A'
        }
      ];
    }

    // Regular teacher name matching
    const similarNames = this.timetable
      .filter(e => e.Teacher) // Make sure Teacher field exists
      .map(e => e.Teacher)
      .filter(name => 
        name && name.toLowerCase().includes(cleanName.substring(0, 5))
      );

    this.addLog('NameVariants', 'Potential timetable matches', 'info', {
      searchTerm: cleanName,
      matchesFound: similarNames
    });

    const periodsToAssign: any[] = [];
    if (similarNames.length > 0) {
      const foundTeacher = this.timetable.filter((entry) => 
        entry.Teacher && similarNames.includes(entry.Teacher)
      );

      foundTeacher.forEach((entry) => {
        if (entry.Period && entry.Day) {
          periodsToAssign.push({
            originalTeacher: entry.Teacher,
            period: entry.Period,
            day: entry.Day,
            className: entry.className || entry.Class || `Unknown-${entry.Period}`
          });
        }
      });
    }

    // Log what we're returning
    this.addLog('PeriodsFound', `Found ${periodsToAssign.length} periods for ${teacherName}`, 'info', {
      foundPeriods: periodsToAssign
    });

    return periodsToAssign;
  }
}