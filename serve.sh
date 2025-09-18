#!/bin/bash

# Simple development server for VioBox Viewer
# Serves the frontend with proper CORS headers for local development

echo "Starting VioBox Viewer Development Server..."
echo "================================================"
echo ""
echo "Server will be available at: http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

cd frontend

# Use Python's built-in HTTP server if available
if command -v python3 &> /dev/null; then
    echo "Using Python 3 HTTP server..."
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "Using Python 2 HTTP server..."
    python -m SimpleHTTPServer 8000
else
    echo "Error: Python is not installed. Please install Python to run the development server."
    echo "Alternatively, you can use any static file server pointing to the 'frontend' directory."
    exit 1
fi