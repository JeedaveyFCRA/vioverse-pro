# Backend & Infrastructure Documentation

## Overview
VioBox Viewer backend built with Next.js 14 App Router, deployed on Render as a Node.js Web Service.

## Environment Variables

### Required for Production
```bash
# Render Platform
NODE_VERSION=20
PORT=3000                    # Dynamically set by Render

# Next.js
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_APP_URL=https://vioverse-pro.onrender.com

# Auth (NextAuth v5 - if using auth)
AUTH_URL=https://vioverse-pro.onrender.com
AUTH_TRUST_HOST=true
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_SECRET=<same-as-AUTH_SECRET>

# Git Info (auto-set by Render)
RENDER_GIT_COMMIT=<auto>
RENDER_SERVICE_NAME=<auto>
```

### Development
```bash
# .env.local
NODE_ENV=development
PORT=3000
```

## Build & Start Commands

### Package Manager
**pnpm only** - enforced via `packageManager` in package.json

### Render Configuration
```yaml
Build Command: corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm build
Start Command: pnpm start
Health Check Path: /api/health
```

### Local Commands
```bash
# Install dependencies
pnpm install

# Development server (with hot reload)
pnpm dev

# Production build
pnpm build

# Production server (after build)
PORT=3000 pnpm start

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Tests
pnpm test           # Unit tests with Vitest
pnpm test:e2e       # E2E tests with Playwright
```

## API Endpoints

### GET /api/health
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-17T12:00:00.000Z",
  "version": "3.0.0",
  "environment": "production",
  "commit": "abc123",
  "uptime": 3600
}
```

**Headers:**
- `Content-Type: application/json`
- `Cache-Control: no-cache, no-store, must-revalidate`

### GET /api/config
Returns frontend configuration (no secrets).

**Response:**
```json
{
  "ui": { /* UI configuration */ },
  "bureaus": { /* Bureau definitions */ },
  "severity": { /* Severity levels */ },
  "theme": { /* Theme configuration */ }
}
```

**Headers:**
- `Content-Type: application/json`
- `Cache-Control: public, max-age=3600`

## Static Asset Serving

### Frontend Application
- **Path**: `/frontend/**`
- **Location**: `public/frontend/`
- **Files**: index.html, CSS, JavaScript modules

### Data Files
- **Config**: `/data/config/*.json` → `public/data/config/`
- **CSV**: `/data/csv/*.csv` → `public/data/csv/`
- **PDFs**: `/data/pdfs/*.pdf` → `public/data/pdfs/`

### Important Notes
- All paths are relative, no absolute filesystem paths
- Assets served directly by Next.js from `public/`
- No `file://` or OS-specific paths anywhere
- Browser fetches use same-origin paths like `/data/config/ui.json`

## Security

### Headers (via middleware.ts)
```typescript
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Production CSP
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self' data:;
connect-src 'self';
frame-src 'none';
object-src 'none';
```

### HSTS (Production only)
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

## Testing

### Unit Tests (Vitest)
```bash
pnpm test               # Run once
pnpm test:watch         # Watch mode
pnpm test:coverage      # With coverage
```

### E2E Tests (Playwright)
```bash
# Install browsers (first time)
pnpm dlx playwright install --with-deps

# Run tests
pnpm test:e2e           # Headless
pnpm test:e2e:ui        # Interactive UI
```

### Smoke Test Coverage
- Frontend HTML loads
- CSS/JS assets return 200
- API health endpoint works
- Config endpoint returns JSON
- Bureau filters interactive
- No absolute paths in content
- Security headers present

## Deployment (Render)

### Service Configuration
- **Type**: Web Service
- **Environment**: Node
- **Region**: Oregon (us-west)
- **Branch**: fix/render-node-service (or main)
- **Auto-Deploy**: Yes

### Build Process
1. Render detects push to branch
2. Runs build command with devDependencies
3. Builds Next.js application
4. Runs start command on PORT

### Monitoring
- Health checks every 30 seconds at `/api/health`
- Logs available in Render dashboard
- Metrics: CPU, Memory, Response Time

## Performance Optimizations

### Caching Strategy
- Static assets: Immutable with long cache
- Config API: 1-hour cache
- Health endpoint: No cache
- Frontend: CDN-friendly headers

### Memory Management
- No unbounded growth on PDF operations
- Client-side processing for CSV/PDF
- Streaming responses where applicable
- Rate limiting on expensive endpoints (if needed)

## Logging

### Development
```javascript
console.log()    // Standard output
console.error()  // Error output
```

### Production
- Structured JSON logs
- No PII in logs
- Stack traces in logs, not API responses
- Request IDs for correlation (if implemented)

## Troubleshooting

### Common Issues

1. **Port binding fails**
   - Ensure using `${PORT:-3000}`
   - Don't hardcode port numbers

2. **Build fails on Render**
   - Check `--prod=false` for devDependencies
   - Verify pnpm version compatibility

3. **Health check fails**
   - Verify `/api/health` returns 200
   - Check response time < 30 seconds

4. **Assets 404**
   - Ensure files in `public/` directory
   - Check case sensitivity (Linux)

5. **CORS issues**
   - All assets same-origin
   - No external API calls from frontend

### Debug Commands
```bash
# Check production build locally
NODE_ENV=production pnpm build
PORT=4000 NODE_ENV=production pnpm start

# Test health endpoint
curl -i http://localhost:4000/api/health

# Test static assets
curl -I http://localhost:4000/frontend/index.html
curl -I http://localhost:4000/data/config/ui-text.json

# Run type checking
pnpm typecheck

# Check for absolute paths
grep -r "file://" public/ frontend/ app/
grep -r "/home/" public/ frontend/ app/
```

## Architecture Decisions

### Why Next.js App Router?
- Modern React Server Components
- Built-in API routes
- Excellent static asset serving
- TypeScript-first
- Production-ready defaults

### Why pnpm?
- Faster installs
- Disk space efficient
- Strict dependency resolution
- Lockfile reproducibility

### Why Render?
- Simple deployment
- Automatic HTTPS
- Built-in monitoring
- GitHub integration
- Reasonable free tier

### Why Client-Side Processing?
- No server memory issues with large PDFs
- Better user experience (instant)
- Reduced server costs
- Simpler architecture

## Future Enhancements
- [ ] Add request ID tracking
- [ ] Implement rate limiting with Upstash
- [ ] Add OpenTelemetry tracing
- [ ] Set up error tracking (Sentry)
- [ ] Add A/B testing capabilities
- [ ] Implement edge caching