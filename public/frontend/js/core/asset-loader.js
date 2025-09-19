// frontend/js/core/asset-loader.js
// A+ asset loader: same-origin, data-driven, no secrets, responsive

(function () {
  const CACHE_NAME = 'viobox-precache-v1';
  const PDF_MAX_WARM_MB = 25;       // warm-cache PDFs <= 25MB
  const PDF_CONCURRENCY = 2;        // no jank on mobile
  const CSV_CONCURRENCY = 4;

  // Expose a small global for other modules (non-invasive)
  window.APP = window.APP || {};
  window.APP.assets = { csv: [], pdfs: [] };
  window.APP.events = window.APP.events || new EventTarget();

  document.addEventListener('DOMContentLoaded', () => {
    // fire & forget — do not block UI
    preloadAll().catch(() => {/* silent; health over perfection */});
  });

  async function preloadAll() {
    const assets = await fetchAssetIndex();
    window.APP.assets = assets;

    // Prefetch CSVs (fast + small)
    await limitQueue(assets.csv.map(a => () => cacheAdd(a.url)), CSV_CONCURRENCY, progress => {
      dispatch('assets:csvProgress', progress);
    });

    // Warm-cache PDFs (size-limited)
    const pdfsToWarm = assets.pdfs.filter(a => a.size > 0 ? a.size <= PDF_MAX_WARM_MB * 1024 * 1024 : true);
    await limitQueue(pdfsToWarm.map(a => () => cacheAdd(a.url)), PDF_CONCURRENCY, progress => {
      dispatch('assets:pdfProgress', progress);
    });

    // Lazy-load heavy PDFs on demand (viewer will fetch; cache hit if warmed)
    dispatch('assets:ready', { csv: assets.csv.length, pdfs: assets.pdfs.length });
  }

  async function fetchAssetIndex() {
    // Prefer dynamic listing (server); fallback to static manifest if present
    try {
      const res = await fetch('/api/assets', { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch {}
    // Optional fallback: /data/config/assets.json (manually maintained)
    try {
      const res2 = await fetch('/data/config/assets.json', { cache: 'no-store' });
      if (res2.ok) return await res2.json();
    } catch {}
    return { csv: [], pdfs: [] };
  }

  async function cacheAdd(url) {
    try {
      const cache = await caches.open(CACHE_NAME);
      // HEAD first: if server honors ETag, we can avoid re-downloading unchanged assets
      try { await fetch(url, { method: 'HEAD' }); } catch {}
      await cache.add(url); // will be no-op if already cached & valid
    } catch {
      // ignore cache errors; browser may block Cache API in some modes
    }
  }

  async function limitQueue(tasks, concurrency, onProgress) {
    let i = 0, done = 0, total = tasks.length;
    if (total === 0) {
      onProgress && onProgress({ done, total });
      return;
    }
    const workers = Array.from({ length: concurrency }, async () => {
      while (i < total) {
        const idx = i++;
        try { await tasks[idx](); } catch {}
        done++;
        onProgress && onProgress({ done, total });
      }
    });
    await Promise.all(workers);
  }

  function dispatch(type, detail) {
    window.APP.events.dispatchEvent(new CustomEvent(type, { detail }));
  }
})();