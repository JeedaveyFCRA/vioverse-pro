/**
 * Validation utility functions
 */

/**
 * Validate bureau code
 */
export function isValidBureau(bureau: string): boolean {
  const validBureaus = ['TU', 'EQ', 'EX', 'UNKNOWN'];
  return validBureaus.includes(bureau.toUpperCase());
}

/**
 * Validate severity level
 */
export function isValidSeverity(severity: string): boolean {
  const validSeverities = ['extreme', 'severe', 'serious', 'minor', 'unknown'];
  return validSeverities.includes(severity.toLowerCase());
}

/**
 * Validate coordinates
 */
export function isValidCoordinate(coord: number | undefined): boolean {
  if (coord === undefined) return false;
  return coord >= 0 && coord <= 10000;
}

/**
 * Validate PDF filename
 */
export function isValidPDFFilename(filename: string): boolean {
  if (!filename) return false;
  return filename.toLowerCase().endsWith('.pdf');
}

/**
 * Parse and validate date string
 */
export function parseReportDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try common date formats
  const patterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
  ];

  if (!patterns.some(p => p.test(dateStr))) {
    return null;
  }

  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}