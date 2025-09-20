# Known Offenses (to be fixed next)

## Last QC Check: September 20, 2025

### 🔴 Critical Violations (Must Fix)

#### 1. Hardcoded Values Found
- **frontend/js/app.js:453**: Font size hardcoded as `11 * this.scale}px Arial`
- **frontend/css/mobile-fixes.css**: Multiple hardcoded pixel values:
  - Line with `min-width: 44px`
  - Line with `width: 20px`
  - Line with `width: 40px`
  - Multiple hardcoded breakpoints (768px, 896px, 375px)
**Acceptance Criteria**: All values must come from `/data/config/*.json` files

#### 2. Incomplete Data-driven Architecture
- Some UI text elements still use data attributes instead of fetching from config
- Bureau filters and severity levels not fully config-driven in all views
**Acceptance Criteria**: 100% of UI strings, colors, sizes from JSON configs

### ⚠️ Moderate Violations

#### 3. Testing Coverage
- No unit tests for config loader
- Missing E2E tests for health endpoint
- No accessibility automated tests
**Acceptance Criteria**: Minimum 80% test coverage, CI must fail if tests fail

#### 4. Performance Monitoring
- Lighthouse CI configured but no enforcement of budgets
- No performance metrics tracking in production
**Acceptance Criteria**: Lighthouse scores ≥90, automated performance regression detection

#### 5. Responsive Testing Gaps
- No automated tests for all breakpoints (320-1920px)
- Manual testing only for mobile views
**Acceptance Criteria**: Automated responsive sweep tests for all defined breakpoints

### ✅ Passing Areas (Compliant)

- **Security Headers**: Properly configured in middleware.ts
- **Accessibility**: Basic ARIA labels and roles present
- **TypeScript**: Configured with strict mode
- **CI/CD**: Scripts configured for lint, test, build
- **File Structure**: Proper separation of concerns

### 📋 Priority Fix Order

1. **Immediate**: Remove all hardcoded values from JS/CSS
2. **High**: Complete data-driven migration for all UI elements
3. **Medium**: Add comprehensive test coverage
4. **Low**: Set up performance monitoring

### Remediation Timeline
- Phase 1 (Week 1): Fix all hardcoded values
- Phase 2 (Week 2): Complete data-driven architecture
- Phase 3 (Week 3): Implement test coverage
- Phase 4 (Week 4): Performance monitoring setup

Acceptance criteria: CI must fail if any A+ standard is violated after fixes.
