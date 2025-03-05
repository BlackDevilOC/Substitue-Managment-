
export type Teacher = {
  id: string;
  name: string;
  variations: string[];
  phone: string;
  isRegular: boolean;
  gradeLevel: number;
};

export type Assignment = {
  day: string;
  period: number;
  className: string;
};

export type SubstituteAssignment = {
  originalTeacher: string;
  period: number;
  className: string;
  substitute: string;
  substitutePhone: string;
};

export interface VerificationReport {
  check: string;
  status: "PASS" | "FAIL";
  details: string;
}
