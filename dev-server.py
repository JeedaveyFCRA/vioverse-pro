#!/usr/bin/env python3

"""
Development Server with Live Reload for VioBox Viewer
Watches for file changes and automatically refreshes the browser
Similar to VS Code's "Live Server" extension
"""

import os
import sys
import time
import json
import mimetypes
import threading
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from datetime import datetime

# Configuration
PORT = 8080
ROOT_DIR = Path(__file__).parent / 'frontend'
WATCH_EXTENSIONS = {'.html', '.css', '.js', '.json'}
DEBOUNCE_DELAY = 0.5  # seconds

# Global state
sse_clients = []
last_reload_time = 0
reload_lock = threading.Lock()

# Live reload JavaScript to inject
LIVE_RELOAD_SCRIPT = """
<script>
(function() {
    const source = new EventSource('/__live_reload_sse__');
    let retryCount = 0;
    const maxRetries = 10;

    source.onmessage = function(e) {
        const data = JSON.parse(e.data);
        if (data.action === 'reload') {
            console.log('🔄 Reloading page due to changes in:', data.file);
            location.reload();
        }
    };

    source.onerror = function(e) {
        retryCount++;
        if (retryCount > maxRetries) {
            console.error('Live reload connection failed. Please refresh manually.');
            source.close();
        }
    };

    source.onopen = function() {
        retryCount = 0;
        console.log('✅ Live reload connected on port %d', source.url);
    };

    // Keep connection alive
    setInterval(() => {
        if (source.readyState === EventSource.CONNECTING) {
            console.log('Reconnecting to live reload...');
        }
    }, 30000);
})();
</script>
""" % PORT

class FileChangeHandler(FileSystemEventHandler):
    """Handles file system events and triggers reload"""

    def __init__(self, server):
        self.server = server

    def on_modified(self, event):
        if event.is_directory:
            return

        file_path = Path(event.src_path)
        if file_path.suffix.lower() in WATCH_EXTENSIONS:
            self.trigger_reload(file_path.name)

    def trigger_reload(self, filename):
        global last_reload_time

        current_time = time.time()
        with reload_lock:
            # Debounce rapid changes
            if current_time - last_reload_time < DEBOUNCE_DELAY:
                return
            last_reload_time = current_time

        print(f"📝 File changed: {filename}")

        # Notify all connected clients
        message = json.dumps({
            'action': 'reload',
            'file': filename,
            'timestamp': datetime.now().isoformat()
        })

        # Send reload message to all SSE clients
        for client in sse_clients[:]:  # Copy list to avoid modification during iteration
            try:
                client.wfile.write(f"data: {message}\n\n".encode())
                client.wfile.flush()
            except:
                # Remove disconnected clients
                sse_clients.remove(client)

class LiveReloadHTTPHandler(SimpleHTTPRequestHandler):
    """HTTP handler with live reload support"""

    def __init__(self, *args, **kwargs):
        # Change to frontend directory
        os.chdir(ROOT_DIR)
        super().__init__(*args, **kwargs)

    def do_GET(self):
        # Handle SSE endpoint
        if self.path == '/__live_reload_sse__':
            self.handle_sse()
            return

        # Serve files normally but inject script into HTML
        if self.path == '/':
            self.path = '/index.html'

        file_path = Path(os.getcwd()) / self.path.lstrip('/')

        # Security check
        try:
            file_path.resolve().relative_to(Path(os.getcwd()))
        except ValueError:
            self.send_error(403, "Forbidden")
            return

        if file_path.exists() and file_path.suffix == '.html':
            self.serve_html_with_injection(file_path)
        else:
            super().do_GET()

    def serve_html_with_injection(self, file_path):
        """Serve HTML with live reload script injected"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Inject live reload script before </body>
            modified_content = content.replace('</body>', f'{LIVE_RELOAD_SCRIPT}</body>')

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Content-Length', str(len(modified_content.encode())))
            self.end_headers()
            self.wfile.write(modified_content.encode())

        except Exception as e:
            self.send_error(500, f"Internal server error: {e}")

    def handle_sse(self):
        """Handle Server-Sent Events connection"""
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Connection', 'keep-alive')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        # Send initial connection message
        self.wfile.write(b'data: {"action": "connected"}\n\n')
        self.wfile.flush()

        # Add to connected clients
        sse_clients.append(self)

        # Keep connection alive with periodic heartbeat
        try:
            while True:
                time.sleep(30)
                self.wfile.write(b':heartbeat\n\n')
                self.wfile.flush()
        except:
            # Client disconnected
            if self in sse_clients:
                sse_clients.remove(self)

    def log_message(self, format, *args):
        """Custom log format"""
        timestamp = datetime.now().strftime('%H:%M:%S')
        message = format % args

        # Color code based on status
        if "200" in message or "304" in message:
            # Success - green
            print(f"  [{timestamp}] ✓ {message}")
        elif "404" in message:
            # Not found - yellow
            print(f"  [{timestamp}] ⚠ {message}")
        elif "500" in message or "403" in message:
            # Error - red
            print(f"  [{timestamp}] ✗ {message}")
        else:
            # Info - default
            print(f"  [{timestamp}] → {message}")

def setup_file_watcher(server):
    """Set up file system watching"""
    observer = Observer()
    handler = FileChangeHandler(server)

    # Watch directories
    watch_paths = [
        ROOT_DIR,
        ROOT_DIR / 'css',
        ROOT_DIR / 'js',
        ROOT_DIR / 'js' / 'core',
        ROOT_DIR / 'js' / 'views',
        ROOT_DIR / 'data' / 'config'
    ]

    print("\n📁 Watching for changes in:")
    for path in watch_paths:
        if path.exists():
            observer.schedule(handler, str(path), recursive=False)
            print(f"  ✓ {path.relative_to(Path.cwd())}")
        else:
            print(f"  ⚠ {path.relative_to(Path.cwd())} (not found)")

    observer.start()
    return observer

def check_dependencies():
    """Check if required packages are installed"""
    try:
        import watchdog
        return True
    except ImportError:
        print("❌ Missing required package: watchdog")
        print("\nPlease install it using:")
        print("  pip install watchdog")
        print("\nOr use the basic server without live reload:")
        print("  ./serve.sh")
        return False

def main():
    """Main entry point"""

    if not check_dependencies():
        sys.exit(1)

    # Ensure frontend directory exists
    if not ROOT_DIR.exists():
        print(f"❌ Frontend directory not found: {ROOT_DIR}")
        sys.exit(1)

    print("\n🚀 VioBox Viewer Development Server with Live Reload")
    print("=" * 50)
    print(f"📡 Server URL:    http://localhost:{PORT}")
    print(f"📂 Serving from:  {ROOT_DIR.relative_to(Path.cwd())}")
    print(f"🔄 Live Reload:   Enabled")
    print(f"👀 Watching:      {', '.join(WATCH_EXTENSIONS)}")
    print("\nPress Ctrl+C to stop the server")

    # Create and start server
    try:
        server = HTTPServer(('', PORT), LiveReloadHTTPHandler)

        # Set up file watching in background thread
        observer = setup_file_watcher(server)

        # Open browser
        print("\n🌐 Opening browser...")
        webbrowser.open(f'http://localhost:{PORT}')

        print("\n📊 Server Activity:")
        print("-" * 50)

        # Start serving
        server.serve_forever()

    except KeyboardInterrupt:
        print("\n\n👋 Shutting down...")
        observer.stop()
        observer.join()
        server.shutdown()
        print("✅ Server stopped")
    except OSError as e:
        if 'Address already in use' in str(e):
            print(f"\n❌ Port {PORT} is already in use!")
            print("   Try one of these:")
            print(f"   1. Kill the process using port {PORT}")
            print("   2. Use a different port by editing PORT in this script")
        else:
            print(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()