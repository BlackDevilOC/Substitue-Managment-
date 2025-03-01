import { parse } from 'csv-parse/sync';

interface Teacher {
  canonicalName: string;
  phone: string;
  variations: Set<string>;
}

const TEACHER_MAP = new Map<string, Teacher>();
const SIMILARITY_THRESHOLD = 0.85;

// Simplified metaphone implementation
const simplifiedMetaphone = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[aeiou]/g, '') // Remove vowels
    .replace(/[^a-z]/g, '') // Remove non-letters
    .slice(0, 6); // Take first 6 characters
};

// Levenshtein distance implementation
const levenshtein = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[b.length][a.length];
};

// Name normalization
const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/(sir|miss|mr|ms|mrs|sr)\.?\s*/gi, '')
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .split(/\s+/)
    .sort()
    .join(' ');
};

// Name similarity check
const nameSimilarity = (a: string, b: string): number => {
  const aMeta = simplifiedMetaphone(a);
  const bMeta = simplifiedMetaphone(b);
  const distance = levenshtein(aMeta, bMeta);
  return 1 - distance / Math.max(aMeta.length, bMeta.length);
};

// Teacher registration
const registerTeacher = (rawName: string, phone: string = '') => {
  const normalized = normalizeName(rawName);
  
  const existing = Array.from(TEACHER_MAP.values()).find(teacher => 
    nameSimilarity(normalized, teacher.canonicalName.toLowerCase()) > SIMILARITY_THRESHOLD
  );

  if (!existing) {
    TEACHER_MAP.set(normalized, {
      canonicalName: rawName.trim().replace(/\s+/g, ' '),
      phone,
      variations: new Set([rawName])
    });
  } else {
    existing.variations.add(rawName);
    if (phone && !existing.phone) existing.phone = phone;
  }
};

export const processTeacherFiles = (timetableContent: string, substitutesContent: string): string => {
  TEACHER_MAP.clear(); // Reset the map before processing

  try {
    // Process substitute teachers
    const subRecords = parse(substitutesContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true
    });
    
    subRecords.forEach((row: any) => {
      if (row[0]) registerTeacher(row[0], row[1] || '');
    });

    // Process timetable teachers
    const ttRecords = parse(timetableContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true
    });

    ttRecords.slice(1).forEach((row: any) => {
      row.slice(2).forEach((name: any) => {
        if (name && name.toLowerCase() !== 'empty') {
          registerTeacher(name);
        }
      });
    });

    // Generate CSV output
    let csv = 'Canonical Name,Phone Number,Variations\n';
    Array.from(TEACHER_MAP.values()).forEach(teacher => {
      csv += `"${teacher.canonicalName}","${teacher.phone}","${Array.from(teacher.variations).join('|')}"\n`;
    });

    return csv;
  } catch (error) {
    console.error('Error processing teacher files:', error);
    throw new Error('Failed to process teacher files');
  }
};

import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

interface Teacher {
  canonicalName: string;
  phone: string;
  variations: Set<string>;
}

const TEACHER_MAP = new Map<string, Teacher>();
const SIMILARITY_THRESHOLD = 0.85;
const EXPECTED_TEACHER_COUNT = 34;

// 1. Name Normalization Pipeline
const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/(sir|miss|mr|ms|mrs|sr)\.?\s*/gi, '')
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .split(/\s+/)
    .sort()
    .join(' ');
};

// Simple Levenshtein distance implementation
const levenshtein = (a: string, b: string): number => {
  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

// Simplified metaphone function
const simplifiedMetaphone = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[aeiou]/g, 'a')
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1+/g, '$1'); // Remove duplicate consecutive chars
};

// 3. Similarity Check
const nameSimilarity = (a: string, b: string): number => {
  const aMeta = simplifiedMetaphone(a);
  const bMeta = simplifiedMetaphone(b);
  const distance = levenshtein(aMeta, bMeta);
  return 1 - distance / Math.max(aMeta.length, bMeta.length, 1);
};

// 4. Teacher Registry
const registerTeacher = (rawName: string, phone: string = '') => {
  if (!rawName || rawName.toLowerCase() === 'empty') return;
  
  const normalized = normalizeName(rawName);
  
  const existing = Array.from(TEACHER_MAP.values()).find(teacher => 
    nameSimilarity(normalized, normalizeName(teacher.canonicalName)) > SIMILARITY_THRESHOLD
  );

  if (!existing) {
    TEACHER_MAP.set(normalized, {
      canonicalName: rawName.trim().replace(/\s+/g, ' '),
      phone,
      variations: new Set([rawName])
    });
  } else {
    existing.variations.add(rawName);
    if (phone && !existing.phone) existing.phone = phone;
  }
};

export const processTeacherFiles = (timetableContent: string, substitutesContent: string): string => {
  TEACHER_MAP.clear(); // Reset the map before processing

  try {
    // Process substitute teachers
    const subRecords = parse(substitutesContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true
    });
    
    let subTeacherCount = 0;
    subRecords.forEach((row: any) => {
      if (row[0]) {
        registerTeacher(row[0], row[1] || '');
        subTeacherCount++;
      }
    });
    
    console.log(`Processed ${subTeacherCount} teachers from substitute file`);

    // Process timetable teachers
    const ttRecords = parse(timetableContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true
    });

    const timetableTeachers = new Set<string>();
    ttRecords.slice(1).forEach((row: any) => {
      row.slice(2).forEach((name: any) => {
        if (name && name.toLowerCase() !== 'empty') {
          registerTeacher(name);
          timetableTeachers.add(name.toLowerCase().trim());
        }
      });
    });
    
    console.log(`Processed ${timetableTeachers.size} unique teachers from timetable file`);

    // Generate CSV output
    let csv = 'Canonical Name,Phone Number,Variations\n';
    const uniqueTeachers = Array.from(TEACHER_MAP.values());
    uniqueTeachers.forEach(teacher => {
      csv += `"${teacher.canonicalName}","${teacher.phone}","${Array.from(teacher.variations).join('|')}"\n`;
    });

    // Verify teacher count
    const extractedCount = uniqueTeachers.length;
    console.log(`Total unique teachers extracted: ${extractedCount}`);
    
    if (extractedCount === EXPECTED_TEACHER_COUNT) {
      console.log(`✅ Successfully extracted all ${EXPECTED_TEACHER_COUNT} teachers!`);
    } else if (extractedCount < EXPECTED_TEACHER_COUNT) {
      console.warn(`⚠️ Only extracted ${extractedCount}/${EXPECTED_TEACHER_COUNT} teachers. Some teachers might be missing.`);
    } else {
      console.warn(`⚠️ Extracted ${extractedCount} teachers, which is more than the expected ${EXPECTED_TEACHER_COUNT}. There might be duplicates.`);
    }

    return csv;
  } catch (error) {
    console.error('Error processing teacher files:', error);
    throw new Error('Failed to process teacher files');
  }
};

export const getUniqueTeachers = (): Teacher[] => {
  return Array.from(TEACHER_MAP.values());
};

export const getTeacherCount = (): number => {
  return TEACHER_MAP.size;
};

export const verifyTeacherCount = (): boolean => {
  return TEACHER_MAP.size === EXPECTED_TEACHER_COUNT;
};
