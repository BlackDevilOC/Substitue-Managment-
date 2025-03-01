import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

interface Teacher {
  canonicalName: string;
  phone: string;
  variations: Set<string>;
}

// Constants
const TEACHER_MAP = new Map<string, Teacher>();
const SIMILARITY_THRESHOLD = 0.90; // Increased threshold for stricter matching
const EXPECTED_TEACHER_COUNT = 34;

// Improved name normalization with better handling of titles and special cases
const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/(sir|miss|mr|ms|mrs|sr|dr)\.?\s*/gi, '')
    .replace(/[^a-z\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(part => part.length > 1) // Filter out single letters
    .sort()
    .join(' ');
};

// Improved metaphone implementation
const simplifiedMetaphone = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[aeiou]/g, 'a') // Replace all vowels with 'a'
    .replace(/[^a-z]/g, '')  // Remove non-letters
    .replace(/(.)\1+/g, '$1') // Remove consecutive duplicates
    .slice(0, 8); // Take first 8 characters for comparison
};

// Enhanced Levenshtein distance with custom weights
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
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[b.length][a.length];
};

// Enhanced name similarity check
const nameSimilarity = (a: string, b: string): number => {
  const aMeta = simplifiedMetaphone(a);
  const bMeta = simplifiedMetaphone(b);
  const distance = levenshtein(aMeta, bMeta);
  const similarity = 1 - distance / Math.max(aMeta.length, bMeta.length, 1);

  // Add additional checks for very similar names
  if (a.includes(b) || b.includes(a)) {
    return Math.max(similarity, 0.95);
  }

  return similarity;
};

// Enhanced teacher registration with duplicate prevention
const registerTeacher = (rawName: string, phone: string = ''): boolean => {
  if (!rawName || rawName.toLowerCase() === 'empty' || rawName.trim().length < 2) {
    return false;
  }

  const normalized = normalizeName(rawName);
  if (!normalized) return false;

  // Check for exact matches first
  if (TEACHER_MAP.has(normalized)) {
    const existing = TEACHER_MAP.get(normalized)!;
    existing.variations.add(rawName);
    if (phone && !existing.phone) existing.phone = phone;
    return true;
  }

  // Check for similar names
  const existing = Array.from(TEACHER_MAP.values()).find(teacher => 
    nameSimilarity(normalized, normalizeName(teacher.canonicalName)) > SIMILARITY_THRESHOLD
  );

  if (existing) {
    existing.variations.add(rawName);
    if (phone && !existing.phone) existing.phone = phone;
    return true;
  }

  // Add new teacher
  TEACHER_MAP.set(normalized, {
    canonicalName: rawName.trim().replace(/\s+/g, ' '),
    phone,
    variations: new Set([rawName])
  });

  return true;
};

// Main processing function with validation
export const processTeacherFiles = async (timetableContent: string, substitutesContent: string): Promise<string> => {
  TEACHER_MAP.clear();
  console.log('Starting teacher extraction process...');

  try {
    // Process substitute teachers first
    const subRecords = parse(substitutesContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true
    });

    let subTeacherCount = 0;
    subRecords.forEach((row: any) => {
      if (row[0] && registerTeacher(row[0], row[1] || '')) {
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
          if (registerTeacher(name)) {
            timetableTeachers.add(name.toLowerCase().trim());
          }
        }
      });
    });

    console.log(`Processed ${timetableTeachers.size} unique teachers from timetable`);

    // Validate teacher count
    const uniqueTeachers = Array.from(TEACHER_MAP.values());
    console.log(`Total unique teachers extracted: ${uniqueTeachers.length}`);

    if (uniqueTeachers.length > EXPECTED_TEACHER_COUNT) {
      console.warn('Too many teachers extracted. Attempting to merge similar entries...');
      // Additional similarity check to merge very similar entries
      for (let i = 0; i < uniqueTeachers.length; i++) {
        for (let j = i + 1; j < uniqueTeachers.length; j++) {
          const similarity = nameSimilarity(
            normalizeName(uniqueTeachers[i].canonicalName),
            normalizeName(uniqueTeachers[j].canonicalName)
          );
          if (similarity > 0.95) {
            // Merge teachers
            uniqueTeachers[i].variations = new Set([
              ...uniqueTeachers[i].variations,
              ...uniqueTeachers[j].variations
            ]);
            uniqueTeachers.splice(j, 1);
            j--;
          }
        }
      }
    }

    // Generate CSV output
    let csv = 'Canonical Name,Phone Number,Variations\n';
    uniqueTeachers.forEach(teacher => {
      csv += `"${teacher.canonicalName}","${teacher.phone}","${Array.from(teacher.variations).join('|')}"\n`;
    });

    // Final validation
    if (uniqueTeachers.length === EXPECTED_TEACHER_COUNT) {
      console.log(`✅ Successfully extracted exactly ${EXPECTED_TEACHER_COUNT} teachers!`);
    } else {
      console.warn(`⚠️ Extracted ${uniqueTeachers.length} teachers, expected ${EXPECTED_TEACHER_COUNT}`);
    }

    return csv;
  } catch (error) {
    console.error('Error processing teacher files:', error);
    throw new Error('Failed to process teacher files');
  }
};

// Helper functions for external use
export const getUniqueTeachers = (): Teacher[] => {
  return Array.from(TEACHER_MAP.values());
};

export const getTeacherCount = (): number => {
  return TEACHER_MAP.size;
};

export const verifyTeacherCount = (): boolean => {
  return TEACHER_MAP.size === EXPECTED_TEACHER_COUNT;
};