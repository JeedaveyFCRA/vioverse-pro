#!/bin/bash

# Start a simple HTTP server for the professional layout
echo "🚀 Starting VIOVERSE Professional Layout Server..."
echo "📍 Navigate to: http://localhost:8080/frontend/index-pro.html"
echo ""
echo "Features:"
echo "✅ Page Grid Visualization (Gray=Normal, Orange=Violations, Red=Current)"
echo "✅ Bureau Selector (EQ/EX/TU)"
echo "✅ Date Navigation (13 report dates)"
echo "✅ Click any page box to navigate"
echo "✅ Save/Load session support"
echo "✅ Responsive design (Desktop/Tablet/Mobile)"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd /home/avid_arrajeedavey/vioverse-clean-site/public
python3 -m http.server 8080