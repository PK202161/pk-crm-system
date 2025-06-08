#!/bin/bash

echo "=== PK CRM Systems Status ==="
echo "Date: $(date)"
echo ""

echo "PDF System (Port 3003):"
curl -s http://localhost:3003/health || echo "❌ PDF System not responding"
echo ""

echo "CSV System (Port 3004):" 
curl -s http://localhost:3004/health || echo "❌ CSV System not responding"
echo ""

echo "PM2 Status:"
pm2 status
echo ""

echo "System Resources:"
free -h
df -h | grep -E "(Filesystem|/dev/)"
