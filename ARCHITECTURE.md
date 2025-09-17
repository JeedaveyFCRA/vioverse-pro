# VIOVERSE v3.0 - ENTERPRISE ARCHITECTURE

## PROJECT CONTEXT
- **Project Name**: Vioverse - Credit Report Violation Analysis System
- **Primary Goals**:
  - Visualize FCRA violations on credit reports with pixel-perfect accuracy
  - Support multi-bureau (TransUnion, Experian, Equifax) analysis
  - Enable legal case building with court-admissible evidence
  - Achieve 100% data-driven architecture with zero hardcoding
- **KPIs**:
  - Violation detection accuracy: 100%
  - Page load time: < 2.5s
  - Mobile responsiveness: Full support 320px-1920px
  - Accessibility: WCAG 2.2 AA compliant
- **Initial Features**:
  - Evidence View: PDF display with violation overlays
  - Timeline View: Chronological violation presentation
  - Multi-bureau filtering and comparison
  - CSV/PDF bulk upload and processing
  - Real-time statistics dashboard
  - Export functionality for legal documentation

## TECHNOLOGY STACK

### Core Framework
- **Next.js 14.2+** with App Router, Server Components, and Streaming SSR
- **TypeScript 5.3+** with strict mode and all safety flags enabled
- **React 18.3+** with Concurrent Features

### UI Layer
- **Tailwind CSS 3.4+** with custom design system tokens
- **shadcn/ui** components (Radix UI primitives)
- **Framer Motion** for animations with prefers-reduced-motion support
- **Lucide React** for iconography
- **React PDF Viewer** (custom wrapper around PDF.js)

### State Management
- **TanStack Query v5** for server state and caching
- **Zustand** for client-side UI state
- **React Hook Form** + **Zod** for form validation

### Data Layer
- **PostgreSQL 15+** via **Prisma 5.7+**
- **Redis** for caching and session storage
- **pgvector** for similarity search (future AI features)
- **MinIO/S3** for PDF/CSV storage

### Content Management
- **Contentlayer** for MDX content
- **JSON schemas** with Zod validation for configuration
- **i18n** with next-intl for internationalization

### API Architecture
- **tRPC** for type-safe APIs
- **OpenAPI 3.1** specification generation
- **Rate limiting** with upstash/ratelimit
- **GraphQL** (optional) via Pothos for complex queries

### Authentication & Security
- **NextAuth.js v5** with JWT + refresh tokens
- **CSRF** protection for mutations
- **Argon2** for password hashing
- **Content Security Policy** with strict directives

### Testing & Quality
- **Vitest** for unit tests
- **Playwright** for E2E tests
- **React Testing Library** for component tests
- **Storybook 7.6+** with accessibility addon
- **Chromatic** for visual regression testing

### DevOps & Monitoring
- **GitHub Actions** for CI/CD
- **Sentry** for error tracking
- **OpenTelemetry** for distributed tracing
- **Pino** for structured logging
- **Lighthouse CI** for performance monitoring

## FILE STRUCTURE

```
vioverse-v3/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── deploy-preview.yml
│   │   └── lighthouse.yml
│   └── PULL_REQUEST_TEMPLATE.md
│
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── evidence/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   ├── timeline/
│   │   ├── reports/
│   │   └── layout.tsx
│   ├── api/
│   │   ├── trpc/
│   │   ├── violations/
│   │   └── webhooks/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── features/
│   │   ├── viobox-renderer/
│   │   ├── pdf-viewer/
│   │   ├── csv-processor/
│   │   └── violation-list/
│   ├── layouts/
│   └── providers/
│
├── lib/
│   ├── api/
│   ├── auth/
│   ├── db/
│   ├── validations/
│   └── utils/
│
├── server/
│   ├── api/
│   │   ├── routers/
│   │   └── trpc.ts
│   ├── db/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── services/
│       ├── violation-detector.ts
│       ├── pdf-processor.ts
│       └── csv-parser.ts
│
├── content/                      # MDX content
│   ├── docs/
│   └── legal/
│
├── config/                       # Configuration files
│   ├── site.ts
│   ├── bureaus.ts
│   ├── severity.ts
│   └── features.ts
│
├── schemas/                      # Zod schemas
│   ├── violation.schema.ts
│   ├── bureau.schema.ts
│   ├── config.schema.ts
│   └── index.ts
│
├── styles/
│   ├── tokens/
│   └── themes/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
│
├── public/
│   ├── fonts/
│   └── images/
│
├── locales/                      # i18n translations
│   ├── en/
│   └── es/
│
├── docs/
│   ├── ADR/                     # Architecture Decision Records
│   ├── API.md
│   └── DEPLOYMENT.md
│
├── scripts/
│   ├── migrate.ts
│   ├── seed.ts
│   └── generate-types.ts
│
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── commitlint.config.js
├── next.config.mjs
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

## DATA ARCHITECTURE

### Core Entities

```typescript
// Violation Entity
interface Violation {
  id: string;
  pdfFileId: string;
  csvSourceId: string;
  bureau: Bureau;
  severity: Severity;
  ruleId: string;
  violationType: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  };
  extractedText: string;
  detectedAt: Date;
  metadata: Record<string, unknown>;
}

// PDF File Entity
interface PDFFile {
  id: string;
  filename: string;
  bureau: Bureau;
  uploadedAt: Date;
  processedAt?: Date;
  pageCount: number;
  violations: Violation[];
  storageUrl: string;
  checksum: string;
}

// CSV Source Entity
interface CSVSource {
  id: string;
  filename: string;
  uploadedAt: Date;
  processedAt: Date;
  rowCount: number;
  violationCount: number;
  bureau: Bureau;
}
```

## RESPONSIVE DESIGN SYSTEM

### Breakpoints
```typescript
export const breakpoints = {
  'ultra-compact': 320,    // Small phones
  'compact': 375,          // iPhone SE
  'mobile': 414,           // iPhone Pro
  'phablet': 480,          // Large phones
  'tablet': 768,           // iPad
  'laptop': 1024,          // Small laptops
  'desktop': 1280,         // Desktop
  'wide': 1440,           // Wide desktop
  'ultra-wide': 1920      // Large monitors
} as const;
```

### Container Queries
```css
@container (min-width: 320px) { /* ultra-compact */ }
@container (min-width: 375px) { /* compact */ }
@container (min-width: 768px) { /* tablet+ */ }
```

## PERFORMANCE TARGETS

- **LCP**: ≤ 2.5s on 4G throttled
- **FID**: < 100ms
- **CLS**: < 0.1
- **TTI**: < 3.8s
- **TBT**: < 200ms
- **Bundle Size**: < 200KB (JS), < 50KB (CSS)
- **Lighthouse Score**: ≥ 90 all categories

## SECURITY REQUIREMENTS

### Headers
```typescript
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'nonce-{nonce}'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
```

### Input Validation
- All inputs validated with Zod schemas
- SQL injection prevention via Prisma parameterized queries
- XSS protection through React's default escaping
- CSRF tokens for state-changing operations

## ACCESSIBILITY REQUIREMENTS

- **WCAG 2.2 AA** compliance
- **ARIA landmarks** and proper heading hierarchy
- **Keyboard navigation** with visible focus indicators
- **Screen reader** announcements for dynamic content
- **Color contrast** ≥ 4.5:1 (normal text), ≥ 3:1 (large text)
- **Skip links** for main content
- **Reduced motion** support

## MIGRATION PLAN

### Phase 1: Foundation (Week 1)
1. Set up Next.js project with TypeScript
2. Configure Tailwind CSS and shadcn/ui
3. Set up Prisma with PostgreSQL
4. Implement authentication

### Phase 2: Core Features (Week 2-3)
1. Migrate CSV processing to TypeScript
2. Implement PDF viewer with Server Components
3. Build VioBox renderer with Canvas API
4. Create violation management system

### Phase 3: Advanced Features (Week 4)
1. Timeline view implementation
2. Export functionality
3. Real-time statistics
4. Multi-bureau comparison

### Phase 4: Polish & Deploy (Week 5)
1. Performance optimization
2. Accessibility audit
3. Security hardening
4. Production deployment

## DEVELOPMENT WORKFLOW

### Commands
```bash
# Development
pnpm dev              # Start dev server
pnpm db:push         # Push schema changes
pnpm db:seed         # Seed database
pnpm typecheck       # Type checking
pnpm lint            # Lint code
pnpm test            # Run tests
pnpm test:e2e        # Run E2E tests

# Production
pnpm build           # Build for production
pnpm start           # Start production server
pnpm migrate:deploy  # Deploy migrations
```

### Git Workflow
- Feature branches: `feature/violation-timeline`
- Conventional commits: `feat:`, `fix:`, `docs:`, `perf:`
- PR reviews required
- CI must pass before merge

## MONITORING & OBSERVABILITY

### Metrics
- Violation processing time
- PDF render performance
- API response times
- Error rates by endpoint
- User engagement metrics

### Alerts
- Processing failures
- Performance degradation
- Security incidents
- High error rates

## SUCCESS CRITERIA

1. ✅ Zero hardcoded values - all content from config/CMS
2. ✅ WCAG 2.2 AA compliant with axe-core validation
3. ✅ Lighthouse scores ≥ 90 across all metrics
4. ✅ Full responsive support 320px-1920px
5. ✅ TypeScript strict mode with no any types
6. ✅ 80%+ test coverage
7. ✅ Sub-3s load time on 3G network
8. ✅ CSP Level 2 compliance
9. ✅ Automated CI/CD pipeline
10. ✅ Production-ready documentation