import { describe, it, expect } from 'vitest';
import {
  isValidBureau,
  isValidSeverity,
  isValidCoordinate,
  isValidPDFFilename,
  parseReportDate,
} from './validation';

describe('Validation Utils', () => {
  describe('isValidBureau', () => {
    it('should accept valid bureau codes', () => {
      expect(isValidBureau('TU')).toBe(true);
      expect(isValidBureau('EQ')).toBe(true);
      expect(isValidBureau('EX')).toBe(true);
      expect(isValidBureau('UNKNOWN')).toBe(true);
    });

    it('should accept lowercase bureau codes', () => {
      expect(isValidBureau('tu')).toBe(true);
      expect(isValidBureau('eq')).toBe(true);
    });

    it('should reject invalid bureau codes', () => {
      expect(isValidBureau('INVALID')).toBe(false);
      expect(isValidBureau('XX')).toBe(false);
      expect(isValidBureau('')).toBe(false);
    });
  });

  describe('isValidSeverity', () => {
    it('should accept valid severity levels', () => {
      expect(isValidSeverity('extreme')).toBe(true);
      expect(isValidSeverity('severe')).toBe(true);
      expect(isValidSeverity('serious')).toBe(true);
      expect(isValidSeverity('minor')).toBe(true);
      expect(isValidSeverity('unknown')).toBe(true);
    });

    it('should accept uppercase severity levels', () => {
      expect(isValidSeverity('EXTREME')).toBe(true);
      expect(isValidSeverity('Severe')).toBe(true);
    });

    it('should reject invalid severity levels', () => {
      expect(isValidSeverity('critical')).toBe(false);
      expect(isValidSeverity('low')).toBe(false);
      expect(isValidSeverity('')).toBe(false);
    });
  });

  describe('isValidCoordinate', () => {
    it('should accept valid coordinates', () => {
      expect(isValidCoordinate(0)).toBe(true);
      expect(isValidCoordinate(100)).toBe(true);
      expect(isValidCoordinate(500.5)).toBe(true);
      expect(isValidCoordinate(9999)).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(isValidCoordinate(-1)).toBe(false);
      expect(isValidCoordinate(10001)).toBe(false);
      expect(isValidCoordinate(undefined)).toBe(false);
    });
  });

  describe('isValidPDFFilename', () => {
    it('should accept valid PDF filenames', () => {
      expect(isValidPDFFilename('document.pdf')).toBe(true);
      expect(isValidPDFFilename('REPORT.PDF')).toBe(true);
      expect(isValidPDFFilename('my-file-2024.pdf')).toBe(true);
    });

    it('should reject invalid filenames', () => {
      expect(isValidPDFFilename('document.txt')).toBe(false);
      expect(isValidPDFFilename('report')).toBe(false);
      expect(isValidPDFFilename('')).toBe(false);
    });
  });

  describe('parseReportDate', () => {
    it('should parse valid date formats', () => {
      const date1 = parseReportDate('2024-01-15');
      expect(date1).toBeInstanceOf(Date);
      expect(date1?.getFullYear()).toBe(2024);

      const date2 = parseReportDate('01/15/2024');
      expect(date2).toBeInstanceOf(Date);

      const date3 = parseReportDate('01-15-2024');
      expect(date3).toBeInstanceOf(Date);
    });

    it('should return null for invalid dates', () => {
      expect(parseReportDate('')).toBe(null);
      expect(parseReportDate('invalid')).toBe(null);
      expect(parseReportDate('2024/13/45')).toBe(null);
      expect(parseReportDate('15-Jan-2024')).toBe(null);
    });
  });
});