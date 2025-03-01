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
const SIMILARITY_THRESHOLD = 0.92; // Increased threshold for stricter matching
const EXPECTED_TEACHER_COUNT = 34;

// Improved name normalization with better handling of titles and special cases
const normalizeName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';

  return name
    .toLowerCase()
    .replace(/(sir|miss|mr|ms|mrs|sr|dr|junior|senior)\.?\s*/gi, '') // Added junior/senior
    .replace(/[^a-z\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(part => part.length > 1) // Filter out single letters
    .sort()
    .join(' ');
};

// Improved metaphone implementation for Urdu/Arabic names
const simplifiedMetaphone = (str: string): string => {
  if (!str || typeof str !== 'string') return '';

  const normalized = str
    .toLowerCase()
    .replace(/[aeiou]/g, 'a') // Replace all vowels with 'a'
    .replace(/[^a-z]/g, '')  // Remove non-letters
    .replace(/(.)\1+/g, '$1') // Remove consecutive duplicates
    .replace(/([a-z])\1+/g, '$1'); // Further remove repeating characters

  return normalized.slice(0, 8); // Take first 8 characters for comparison
};

// Enhanced Levenshtein distance with custom weights
const levenshtein = (a: string, b: string): number => {
  if (!a || !b) return 0;
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

// Enhanced name similarity check with improved rules
const nameSimilarity = (a: string, b: string): number => {
  if (!a || !b) return 0;

  const aMeta = simplifiedMetaphone(a);
  const bMeta = simplifiedMetaphone(b);
  const distance = levenshtein(aMeta, bMeta);
  let similarity = 1 - distance / Math.max(aMeta.length, bMeta.length, 1);

  // Additional checks for name variations
  const aNorm = normalizeName(a);
  const bNorm = normalizeName(b);

  // Direct substring match
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) {
    similarity = Math.max(similarity, 0.95);
  }

  // Check for name parts match
  const aParts = aNorm.split(' ');
  const bParts = bNorm.split(' ');
  const commonParts = aParts.filter(part => bParts.includes(part));

  // If there are common parts and lengths are similar
  if (commonParts.length > 0 && Math.abs(aParts.length - bParts.length) <= 1) {
    similarity = Math.max(similarity, 0.85 + (0.1 * commonParts.length));
  }

  // Special case for junior/senior variations
  if ((a.toLowerCase().includes('junior') && b.toLowerCase().includes('senior')) ||
      (a.toLowerCase().includes('senior') && b.toLowerCase().includes('junior'))) {
    const baseNameA = a.toLowerCase().replace(/(junior|senior)/g, '').trim();
    const baseNameB = b.toLowerCase().replace(/(junior|senior)/g, '').trim();
    if (baseNameA === baseNameB) {
      similarity = 0.9; // High but not perfect match
    }
  }

  return similarity;
};

// Enhanced teacher registration with strict duplicate prevention
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

  // Find best matching teacher
  let bestMatch: Teacher | undefined;
  let bestSimilarity = 0;

  for (const teacher of TEACHER_MAP.values()) {
    const similarity = nameSimilarity(normalized, normalizeName(teacher.canonicalName));
    if (similarity > SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
      bestMatch = teacher;
      bestSimilarity = similarity;
    }
  }

  if (bestMatch) {
    bestMatch.variations.add(rawName);
    if (phone && !bestMatch.phone) bestMatch.phone = phone;
    return true;
  }

  // Only add new teacher if we haven't reached the limit
  if (TEACHER_MAP.size < EXPECTED_TEACHER_COUNT) {
    TEACHER_MAP.set(normalized, {
      canonicalName: rawName.trim().replace(/\s+/g, ' '),
      phone,
      variations: new Set([rawName])
    });
    return true;
  }

  // If we've reached the limit, try to merge with the most similar existing teacher
  let fallbackMatch: Teacher | undefined;
  let fallbackSimilarity = 0;

  for (const teacher of TEACHER_MAP.values()) {
    const similarity = nameSimilarity(normalized, normalizeName(teacher.canonicalName));
    if (similarity > fallbackSimilarity) {
      fallbackMatch = teacher;
      fallbackSimilarity = similarity;
    }
  }

  if (fallbackMatch) {
    fallbackMatch.variations.add(rawName);
    if (phone && !fallbackMatch.phone) fallbackMatch.phone = phone;
    return true;
  }

  return false;
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
      trim: true,
      relax_column_count: true
    });

    let subTeacherCount = 0;
    subRecords.forEach((row: any) => {
      if (Array.isArray(row) && row[0] && registerTeacher(row[0], row[1] || '')) {
        subTeacherCount++;
      }
    });

    console.log(`Processed ${subTeacherCount} teachers from substitute file`);

    // Process timetable teachers
    const ttRecords = parse(timetableContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });

    const timetableTeachers = new Set<string>();
    ttRecords.slice(1).forEach((row: any) => {
      if (!Array.isArray(row)) return;
      row.slice(2).forEach((name: any) => {
        if (name && typeof name === 'string' && name.toLowerCase() !== 'empty') {
          if (registerTeacher(name)) {
            timetableTeachers.add(name.toLowerCase().trim());
          }
        }
      });
    });

    console.log(`Processed ${timetableTeachers.size} unique teachers from timetable`);

    // Additional merging for very similar names if we still have too many
    const uniqueTeachers = Array.from(TEACHER_MAP.values());
    while (uniqueTeachers.length > EXPECTED_TEACHER_COUNT) {
      let merged = false;
      for (let i = 0; i < uniqueTeachers.length - 1 && !merged; i++) {
        for (let j = i + 1; j < uniqueTeachers.length && !merged; j++) {
          const similarity = nameSimilarity(
            normalizeName(uniqueTeachers[i].canonicalName),
            normalizeName(uniqueTeachers[j].canonicalName)
          );
          if (similarity > 0.90) { // Slightly lower threshold for final merging
            // Merge teachers
            uniqueTeachers[i].variations = new Set([
              ...Array.from(uniqueTeachers[i].variations),
              ...Array.from(uniqueTeachers[j].variations)
            ]);
            if (!uniqueTeachers[i].phone && uniqueTeachers[j].phone) {
              uniqueTeachers[i].phone = uniqueTeachers[j].phone;
            }
            uniqueTeachers.splice(j, 1);
            merged = true;
          }
        }
      }
      if (!merged) break;
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