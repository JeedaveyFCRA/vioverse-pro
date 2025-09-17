# Known Offenses (to be fixed next)
- Replace any remaining hard-coded UI strings with config-driven values
- Add unit tests (config loader) and e2e (health, basic a11y)
- Add Lighthouse CI budgets (≥0.9 perf/a11y/seo)
- Verify CSP/security headers with middleware + tests
- Add responsive sweep tests for 320–1920 widths
Acceptance criteria: CI fails if any of the above is missing or regresses.
