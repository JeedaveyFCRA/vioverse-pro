#!/bin/bash

# Installation script for development server dependencies

echo "🔧 VioBox Viewer Development Setup"
echo "=================================="
echo ""

# Check Python version
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
    PIP_CMD=pip3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
    PIP_CMD=pip
else
    echo "❌ Python is not installed!"
    echo "   Please install Python 3.7+ to continue"
    exit 1
fi

echo "✓ Found Python: $($PYTHON_CMD --version)"
echo ""

# Check if pip is installed
if ! command -v $PIP_CMD &> /dev/null; then
    echo "❌ pip is not installed!"
    echo "   Installing pip..."
    curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
    $PYTHON_CMD get-pip.py
    rm get-pip.py
fi

echo "📦 Installing required packages for live reload..."
echo ""

# Install watchdog for file watching
$PIP_CMD install watchdog --user

echo ""
echo "✅ Installation complete!"
echo ""
echo "🚀 You can now run the development server with live reload:"
echo ""
echo "   Option 1 (Python with live reload):"
echo "   python3 dev-server.py"
echo ""
echo "   Option 2 (Node.js with live reload - if Node.js is installed):"
echo "   node dev-server.js"
echo ""
echo "   Option 3 (Basic Python server - no live reload):"
echo "   ./serve.sh"
echo ""
echo "The server will automatically open your browser and reload"
echo "whenever you make changes to HTML, CSS, JS, or JSON files."