import { z } from 'zod';

// Enum schemas
export const BureauSchema = z.enum(['TU', 'EX', 'EQ', 'UNKNOWN']);
export type Bureau = z.infer<typeof BureauSchema>;

export const SeveritySchema = z.enum(['extreme', 'severe', 'serious', 'minor', 'unknown']);
export type Severity = z.infer<typeof SeveritySchema>;

export const ViolationTypeSchema = z.enum([
  'Pay_Status_Bankruptcy',
  'High_Balance',
  'Remarks_Chapter13',
  'Account_Status',
  'Date_Updated',
  'Account_Included',
  'Discharge_Status',
  'Balance_Reporting',
  'Payment_History',
  'Collection_Status',
  'Public_Record',
  'OTHER'
]);
export type ViolationType = z.infer<typeof ViolationTypeSchema>;

// Coordinate schema with strict validation
export const CoordinateSchema = z.object({
  x: z.number().min(0).describe('X coordinate in PDF space'),
  y: z.number().min(0).describe('Y coordinate in PDF space'),
  width: z.number().positive().describe('Width of violation box'),
  height: z.number().positive().describe('Height of violation box'),
  page: z.number().int().positive().describe('PDF page number'),
}).strict();

export type Coordinate = z.infer<typeof CoordinateSchema>;

// Main Violation schema
export const ViolationSchema = z.object({
  id: z.string().uuid().describe('Unique violation identifier'),
  pdfFileId: z.string().uuid().describe('Associated PDF file ID'),
  csvSourceId: z.string().uuid().describe('Source CSV file ID'),
  bureau: BureauSchema,
  severity: SeveritySchema,
  violationType: ViolationTypeSchema,
  ruleId: z.string().regex(/^[A-Z]{2,4}-\d{3}$/).describe('Rule identifier (e.g., EXT-001)'),
  coordinates: CoordinateSchema,
  extractedText: z.string().min(1).max(500).describe('Text extracted from PDF'),
  fullText: z.string().optional().describe('Full violation description'),
  confidence: z.number().min(0).max(1).describe('Detection confidence score'),
  detectedAt: z.date().describe('When violation was detected'),
  verifiedAt: z.date().optional().describe('When violation was manually verified'),
  verifiedBy: z.string().uuid().optional().describe('User who verified'),
  notes: z.string().max(1000).optional().describe('Additional notes'),
  metadata: z.record(z.unknown()).default({}).describe('Additional metadata'),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
}).strict();

export type Violation = z.infer<typeof ViolationSchema>;

// CSV import schema (less strict for raw data)
export const ViolationCSVRowSchema = z.object({
  pdf_filename: z.string(),
  rule_id: z.string(),
  violation_type: z.string(),
  severity: z.string(),
  full_text: z.string().optional(),
  x: z.union([z.string(), z.number()]).transform(val => parseFloat(String(val))),
  y: z.union([z.string(), z.number()]).transform(val => parseFloat(String(val))),
  width: z.union([z.string(), z.number()]).transform(val => parseFloat(String(val))),
  height: z.union([z.string(), z.number()]).transform(val => parseFloat(String(val))),
  page: z.union([z.string(), z.number()]).transform(val => parseInt(String(val), 10)).optional(),
}).passthrough(); // Allow additional fields

export type ViolationCSVRow = z.infer<typeof ViolationCSVRowSchema>;

// Violation filter schema
export const ViolationFilterSchema = z.object({
  bureaus: z.array(BureauSchema).optional(),
  severities: z.array(SeveritySchema).optional(),
  types: z.array(ViolationTypeSchema).optional(),
  pdfFileIds: z.array(z.string().uuid()).optional(),
  dateRange: z.object({
    start: z.date(),
    end: z.date(),
  }).optional(),
  verified: z.boolean().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['detectedAt', 'severity', 'bureau', 'type']).default('detectedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

export type ViolationFilter = z.infer<typeof ViolationFilterSchema>;

// Violation statistics schema
export const ViolationStatsSchema = z.object({
  total: z.number().int().min(0),
  bySeverity: z.object({
    extreme: z.number().int().min(0),
    severe: z.number().int().min(0),
    serious: z.number().int().min(0),
    minor: z.number().int().min(0),
    unknown: z.number().int().min(0),
  }),
  byBureau: z.object({
    TU: z.number().int().min(0),
    EX: z.number().int().min(0),
    EQ: z.number().int().min(0),
    UNKNOWN: z.number().int().min(0),
  }),
  byType: z.record(ViolationTypeSchema, z.number().int().min(0)),
  withCoordinates: z.number().int().min(0),
  withoutCoordinates: z.number().int().min(0),
  verified: z.number().int().min(0),
  unverified: z.number().int().min(0),
  averageConfidence: z.number().min(0).max(1),
}).strict();

export type ViolationStats = z.infer<typeof ViolationStatsSchema>;

// Batch operations schema
export const ViolationBatchCreateSchema = z.object({
  violations: z.array(ViolationSchema.omit({ id: true, createdAt: true, updatedAt: true })),
  csvSourceId: z.string().uuid(),
  skipDuplicates: z.boolean().default(true),
}).strict();

export type ViolationBatchCreate = z.infer<typeof ViolationBatchCreateSchema>;

export const ViolationBatchUpdateSchema = z.object({
  ids: z.array(z.string().uuid()),
  update: ViolationSchema.partial().omit({ id: true, createdAt: true }),
}).strict();

export type ViolationBatchUpdate = z.infer<typeof ViolationBatchUpdateSchema>;

// Export validation schema
export const ViolationExportSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf', 'excel']),
  filter: ViolationFilterSchema.optional(),
  includeMetadata: z.boolean().default(true),
  includeCoordinates: z.boolean().default(true),
  groupBy: z.enum(['bureau', 'severity', 'type', 'pdf']).optional(),
}).strict();

export type ViolationExport = z.infer<typeof ViolationExportSchema>;