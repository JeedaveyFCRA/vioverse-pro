import { z } from 'zod';

// Breakpoint schema
export const BreakpointSchema = z.object({
  'ultra-compact': z.number().int().positive(),
  'compact': z.number().int().positive(),
  'mobile': z.number().int().positive(),
  'phablet': z.number().int().positive(),
  'tablet': z.number().int().positive(),
  'laptop': z.number().int().positive(),
  'desktop': z.number().int().positive(),
  'wide': z.number().int().positive(),
  'ultra-wide': z.number().int().positive(),
}).strict();

export type Breakpoint = z.infer<typeof BreakpointSchema>;

// Color schema with accessibility validation
const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const RGBAColorSchema = z.string().regex(/^rgba?\(\d{1,3},\s*\d{1,3},\s*\d{1,3}(,\s*[\d.]+)?\)$/);

export const ColorSchemeSchema = z.object({
  primary: HexColorSchema,
  secondary: HexColorSchema,
  accent: HexColorSchema,
  background: HexColorSchema,
  foreground: HexColorSchema,
  muted: HexColorSchema,
  mutedForeground: HexColorSchema,
  border: HexColorSchema,
  ring: HexColorSchema,
  destructive: HexColorSchema,
  destructiveForeground: HexColorSchema,
  warning: HexColorSchema,
  warningForeground: HexColorSchema,
  success: HexColorSchema,
  successForeground: HexColorSchema,
  info: HexColorSchema,
  infoForeground: HexColorSchema,
}).strict();

export type ColorScheme = z.infer<typeof ColorSchemeSchema>;

// Theme schema
export const ThemeSchema = z.object({
  name: z.string(),
  mode: z.enum(['light', 'dark', 'system']),
  colors: ColorSchemeSchema,
  fonts: z.object({
    sans: z.string(),
    serif: z.string(),
    mono: z.string(),
    display: z.string().optional(),
  }),
  spacing: z.object({
    xs: z.string(),
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
    xl: z.string(),
    '2xl': z.string(),
    '3xl': z.string(),
  }),
  borderRadius: z.object({
    none: z.string(),
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
    full: z.string(),
  }),
}).strict();

export type Theme = z.infer<typeof ThemeSchema>;

// Navigation schema
export const NavItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string().optional(),
  icon: z.string().optional(),
  badge: z.string().optional(),
  disabled: z.boolean().default(false),
  external: z.boolean().default(false),
  children: z.lazy(() => z.array(NavItemSchema)).optional(),
}).strict();

export type NavItem = z.infer<typeof NavItemSchema>;

export const NavigationSchema = z.object({
  main: z.array(NavItemSchema),
  footer: z.array(NavItemSchema),
  social: z.array(z.object({
    name: z.string(),
    href: z.string().url(),
    icon: z.string(),
  })),
}).strict();

export type Navigation = z.infer<typeof NavigationSchema>;

// Feature flags schema
export const FeatureFlagSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  targetGroups: z.array(z.string()).optional(),
  conditions: z.record(z.unknown()).optional(),
  expiresAt: z.date().optional(),
}).strict();

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

export const FeatureFlagsSchema = z.record(z.string(), z.boolean().or(FeatureFlagSchema));
export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

// Site metadata schema
export const SiteMetadataSchema = z.object({
  name: z.string(),
  description: z.string(),
  url: z.string().url(),
  ogImage: z.string().url().optional(),
  author: z.object({
    name: z.string(),
    url: z.string().url().optional(),
    email: z.string().email().optional(),
  }),
  keywords: z.array(z.string()),
  language: z.string().default('en'),
  themeColor: HexColorSchema,
  twitterHandle: z.string().optional(),
}).strict();

export type SiteMetadata = z.infer<typeof SiteMetadataSchema>;

// API configuration schema
export const APIConfigSchema = z.object({
  baseUrl: z.string().url(),
  timeout: z.number().positive(),
  retries: z.number().int().min(0).max(5),
  rateLimit: z.object({
    requests: z.number().positive(),
    windowMs: z.number().positive(),
  }),
  cache: z.object({
    enabled: z.boolean(),
    ttl: z.number().positive(),
    maxSize: z.number().positive(),
  }),
}).strict();

export type APIConfig = z.infer<typeof APIConfigSchema>;

// Performance budget schema
export const PerformanceBudgetSchema = z.object({
  lcp: z.number().positive().describe('Largest Contentful Paint in ms'),
  fid: z.number().positive().describe('First Input Delay in ms'),
  cls: z.number().positive().describe('Cumulative Layout Shift'),
  fcp: z.number().positive().describe('First Contentful Paint in ms'),
  ttfb: z.number().positive().describe('Time to First Byte in ms'),
  tti: z.number().positive().describe('Time to Interactive in ms'),
  tbt: z.number().positive().describe('Total Blocking Time in ms'),
  bundleSize: z.object({
    js: z.number().positive().describe('JavaScript bundle size in KB'),
    css: z.number().positive().describe('CSS bundle size in KB'),
    total: z.number().positive().describe('Total bundle size in KB'),
  }),
}).strict();

export type PerformanceBudget = z.infer<typeof PerformanceBudgetSchema>;

// Security configuration schema
export const SecurityConfigSchema = z.object({
  csp: z.object({
    enabled: z.boolean(),
    directives: z.record(z.string()),
    reportUri: z.string().url().optional(),
  }),
  cors: z.object({
    enabled: z.boolean(),
    origins: z.array(z.string()),
    methods: z.array(z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])),
    credentials: z.boolean(),
    maxAge: z.number().positive(),
  }),
  rateLimit: z.object({
    enabled: z.boolean(),
    global: z.object({
      requests: z.number().positive(),
      windowMs: z.number().positive(),
    }),
    endpoints: z.record(z.object({
      requests: z.number().positive(),
      windowMs: z.number().positive(),
    })).optional(),
  }),
  auth: z.object({
    sessionTimeout: z.number().positive(),
    refreshTokenTTL: z.number().positive(),
    passwordPolicy: z.object({
      minLength: z.number().int().min(8),
      requireUppercase: z.boolean(),
      requireLowercase: z.boolean(),
      requireNumbers: z.boolean(),
      requireSymbols: z.boolean(),
    }),
    mfa: z.object({
      enabled: z.boolean(),
      methods: z.array(z.enum(['totp', 'sms', 'email'])),
    }),
  }),
}).strict();

export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

// Main application configuration schema
export const AppConfigSchema = z.object({
  site: SiteMetadataSchema,
  theme: ThemeSchema,
  breakpoints: BreakpointSchema,
  navigation: NavigationSchema,
  features: FeatureFlagsSchema,
  api: APIConfigSchema,
  performance: PerformanceBudgetSchema,
  security: SecurityConfigSchema,
  i18n: z.object({
    defaultLocale: z.string(),
    locales: z.array(z.string()),
    fallbackLocale: z.string(),
  }),
  analytics: z.object({
    enabled: z.boolean(),
    providers: z.array(z.enum(['vercel', 'google', 'plausible', 'umami'])),
  }),
  seo: z.object({
    enableOgImages: z.boolean(),
    twitterCard: z.enum(['summary', 'summary_large_image', 'app', 'player']),
    jsonLd: z.boolean(),
    sitemap: z.boolean(),
    robots: z.object({
      index: z.boolean(),
      follow: z.boolean(),
    }),
  }),
  experimental: z.record(z.boolean()).optional(),
}).strict();

export type AppConfig = z.infer<typeof AppConfigSchema>;

// Environment variables schema
export const EnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_URL_NON_POOLING: z.string().url().optional(),

  // Redis
  REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Auth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),

  // Storage
  S3_ENDPOINT: z.string().url().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Analytics
  NEXT_PUBLIC_VERCEL_ANALYTICS_ID: z.string().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),

  // API Keys
  OPENAI_API_KEY: z.string().optional(),

  // Public URLs
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),

  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']),
}).strict();

export type Env = z.infer<typeof EnvSchema>;