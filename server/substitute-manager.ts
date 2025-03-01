
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Assignment {
    day: string;
    period: number;
    className: string;
    originalTeacher: string;
    substitute: string;
    substitutePhone?: string;
}

interface VerificationReport {
    check: string;
    status: "PASS" | "FAIL";
    details: string;
}

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
        const defaultTimetablePath = path.join(__dirname, '../data/timetable_file.csv');
        const defaultSubstitutePath = path.join(__dirname, '../data/Substitude_file.csv');
        
        // Use provided paths or defaults
        const actualTimetablePath = timetablePath || defaultTimetablePath;
        const actualSubstitutePath = substitutesPath || defaultSubstitutePath;
        
        console.log(`Loading data from timetable: ${actualTimetablePath}`);
        console.log(`Loading data from substitutes: ${actualSubstitutePath}`);
        
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
                const rows = parse(subData, {
                    columns: false,
                    skip_empty_lines: true,
                    trim: true
                });
                
                rows.forEach(row => {
                    const name = row[0]?.trim();
                    const phone = row[1]?.trim();
                    if (name) this.substitutes.set(this.normalizeName(name), phone);
                });
                console.log(`Loaded ${this.substitutes.size} substitute teachers`);
            } catch (error) {
                console.error('Error parsing substitute file:', error);
            }
        } else {
            console.warn(`Substitute file not found: ${actualSubstitutePath}`);
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
                            });
                        }
                    });
                }
                console.log(`Loaded schedule for ${this.teacherClasses.size} teachers across ${this.schedule.size} days`);
            } catch (error) {
                console.error('Error parsing timetable file:', error);
            }
        } else {
            console.warn(`Timetable file not found: ${actualTimetablePath}`);
        }
    }

    assignSubstitutes(absentTeacher: string, day: string): Assignment[] {
        const normalized = this.normalizeName(absentTeacher);
        const normalizedDay = this.normalizeDay(day);
        console.log(`Assigning substitutes for ${normalized} on ${normalizedDay}`);
        
        const assignments: Assignment[] = [];
        const absentPeriods = this.findAbsentPeriods(normalized, normalizedDay);
        
        console.log(`Found ${absentPeriods.length} periods to cover`);

        for (const { period, className } of absentPeriods) {
            const candidates = this.getAvailableSubstitutes(normalizedDay, period, normalized);
            
            if (candidates.length === 0) {
                console.log(`No candidates available for period ${period}, class ${className}`);
                continue;
            }

            // Prioritize substitutes with the least assignments and workload
            const chosen = candidates.sort((a, b) => {
                const aAssignments = this.substituteAssignments.get(a)?.length || 0;
                const bAssignments = this.substituteAssignments.get(b)?.length || 0;
                const aWorkload = this.teacherWorkload.get(a) || 0;
                const bWorkload = this.teacherWorkload.get(b) || 0;
                return aAssignments - bAssignments || aWorkload - bWorkload;
            })[0];

            const assignment: Assignment = {
                day: normalizedDay,
                period,
                className,
                originalTeacher: normalized,
                substitute: chosen,
                substitutePhone: this.substitutes.get(chosen),
            };

            this.recordAssignment(chosen, assignment);
            assignments.push(assignment);
            console.log(`Assigned ${chosen} to cover period ${period}, class ${className}`);
        }

        return assignments;
    }

    private findAbsentPeriods(teacher: string, day: string): { period: number; className: string }[] {
        const periods = this.teacherClasses.get(teacher)?.filter(a => a.day === day) || [];
        return periods.map(p => ({ period: p.period, className: p.className }));
    }

    private getAvailableSubstitutes(day: string, period: number, originalTeacher: string): string[] {
        const busyTeachers = new Set(this.schedule.get(day)?.get(period) || []);
        
        // Get available substitute teachers
        const availableSubs = Array.from(this.substitutes.keys()).filter(sub =>
            !busyTeachers.has(sub) &&
            (this.substituteAssignments.get(sub)?.length || 0) < this.MAX_SUBSTITUTE_ASSIGNMENTS &&
            this.isAvailableThisPeriod(sub, day, period)
        );

        // Get available regular teachers who could substitute
        const availableRegulars = Array.from(this.teacherClasses.keys()).filter(teacher =>
            !busyTeachers.has(teacher) &&
            teacher !== originalTeacher &&
            !this.substitutes.has(teacher) &&
            (this.teacherWorkload.get(teacher) || 0) < this.MAX_REGULAR_TEACHER_ASSIGNMENTS &&
            this.isAvailableThisPeriod(teacher, day, period)
        );

        return [...availableSubs, ...availableRegulars];
    }

    private isAvailableThisPeriod(teacher: string, day: string, period: number): boolean {
        const periodTeachers = this.schedule.get(day)?.get(period) || [];
        return !periodTeachers.includes(teacher);
    }

    private recordAssignment(substitute: string, assignment: Assignment): void {
        if (!this.substituteAssignments.has(substitute)) {
            this.substituteAssignments.set(substitute, []);
        }
        this.substituteAssignments.get(substitute)!.push(assignment);

        this.teacherWorkload.set(substitute, (this.teacherWorkload.get(substitute) || 0) + 1);
        this.allAssignments.push(assignment);
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
            const { day, period, substitute } = assignment;
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

    generateReport(): any {
        return {
            assignments: this.allAssignments,
            verification: this.verifyAssignments(),
            statistics: {
                totalAssignments: this.allAssignments.length,
                substitutesUsed: this.substituteAssignments.size,
                regularTeachersUsed: Array.from(this.teacherWorkload.keys()).filter(t => !this.substitutes.has(t)).length,
            },
        };
    }

    getSubstituteAssignments(date?: string): Record<string, any> {
        // Convert assignments to a more useful format
        const result: Record<string, any> = {};
        
        this.allAssignments.forEach(assignment => {
            const key = `${assignment.period}-${assignment.className}`;
            result[key] = {
                originalTeacher: assignment.originalTeacher,
                substitute: assignment.substitute,
                substitutePhone: assignment.substitutePhone,
                period: assignment.period,
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
}
