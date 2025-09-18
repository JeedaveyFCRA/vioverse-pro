#!/usr/bin/env node

/**
 * Development Server with Live Reload
 * Watches for file changes and automatically refreshes the browser
 * Similar to VS Code's "Live Server" extension
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const PORT = 8080;
const ROOT_DIR = path.join(__dirname, 'frontend');
const WATCH_EXTENSIONS = ['.html', '.css', '.js', '.json'];
const DEBOUNCE_DELAY = 100;

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.csv': 'text/csv',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Store connected SSE clients
const sseClients = new Set();

// Live reload script to inject into HTML
const LIVE_RELOAD_SCRIPT = `
<script>
(function() {
  const source = new EventSource('/__live-reload__');
  let retryCount = 0;
  const maxRetries = 10;

  source.onmessage = function(e) {
    if (e.data === 'reload') {
      console.log('🔄 Reloading page due to file changes...');
      location.reload();
    }
  };

  source.onerror = function(e) {
    console.error('Live reload connection error:', e);
    retryCount++;

    if (retryCount > maxRetries) {
      console.error('Max retries reached. Live reload disabled.');
      source.close();
    } else {
      console.log(\`Retrying connection... (attempt \${retryCount}/\${maxRetries})\`);
    }
  };

  source.onopen = function() {
    retryCount = 0;
    console.log('✅ Live reload connected');
  };

  // Heartbeat to keep connection alive
  setInterval(() => {
    if (source.readyState === EventSource.OPEN) {
      // Connection is alive
    }
  }, 30000);
})();
</script>
`;

// Create HTTP server
const server = http.createServer((req, res) => {
  // Handle SSE endpoint for live reload
  if (req.url === '/__live-reload__') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection message
    res.write('data: connected\n\n');

    // Add client to set
    sseClients.add(res);

    // Remove client on disconnect
    req.on('close', () => {
      sseClients.delete(res);
    });

    // Keep connection alive with periodic pings
    const keepAlive = setInterval(() => {
      res.write(':ping\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
    });

    return;
  }

  // Resolve file path
  let filePath = path.join(ROOT_DIR, req.url === '/' ? 'index.html' : req.url);

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if path is directory and serve index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Serve file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    // Inject live reload script into HTML files
    if (ext === '.html') {
      const htmlString = content.toString();
      const modifiedHtml = htmlString.replace('</body>', `${LIVE_RELOAD_SCRIPT}</body>`);
      content = Buffer.from(modifiedHtml);
    }

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  });
});

// File watcher with debouncing
let reloadTimeout;
const watchedDirs = [
  path.join(ROOT_DIR),
  path.join(ROOT_DIR, 'css'),
  path.join(ROOT_DIR, 'js'),
  path.join(ROOT_DIR, 'js', 'core'),
  path.join(ROOT_DIR, 'js', 'views'),
  path.join(ROOT_DIR, 'data', 'config')
];

function notifyClients() {
  sseClients.forEach(client => {
    client.write('data: reload\n\n');
  });
}

function setupWatchers() {
  console.log('📁 Watching directories:');
  watchedDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`  ⚠️  ${dir} (not found, skipping)`);
      return;
    }

    console.log(`  ✓ ${dir}`);

    fs.watch(dir, { recursive: false }, (eventType, filename) => {
      if (!filename) return;

      const ext = path.extname(filename).toLowerCase();
      if (!WATCH_EXTENSIONS.includes(ext)) return;

      // Debounce reload notifications
      clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(() => {
        console.log(`📝 File changed: ${filename}`);
        notifyClients();
      }, DEBOUNCE_DELAY);
    });
  });
}

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('🚀 VioBox Viewer Development Server');
  console.log('====================================');
  console.log(`📡 Server:     http://localhost:${PORT}`);
  console.log(`📂 Root:       ${ROOT_DIR}`);
  console.log(`🔄 Live Reload: Enabled`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('');

  setupWatchers();

  // Try to open browser (works on most platforms)
  const url = `http://localhost:${PORT}`;
  const platform = process.platform;

  let command;
  if (platform === 'win32') {
    command = `start ${url}`;
  } else if (platform === 'darwin') {
    command = `open ${url}`;
  } else {
    command = `xdg-open ${url} 2>/dev/null || echo "Please open ${url} in your browser"`;
  }

  exec(command, (err) => {
    if (!err) {
      console.log('🌐 Browser opened automatically');
    }
  });
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');

  // Close all SSE connections
  sseClients.forEach(client => {
    client.end();
  });

  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});

// Handle errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.error('   Try one of these solutions:');
    console.error(`   1. Stop the other process using port ${PORT}`);
    console.error('   2. Change the PORT variable in this script');
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});