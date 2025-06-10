#!/bin/bash

echo "🎯 PK CRM Systems Quick Status"
echo "=============================="

# PM2 Status
pm2 status

echo ""
echo "🌐 Health Checks:"

# CSV System
echo -n "📊 CSV System: "
if curl -s http://localhost:3005/health > /dev/null 2>&1; then
    echo "✅ Online"
else
    echo "❌ Offline"
fi

# PDF System  
echo -n "📄 PDF System: "
if curl -s http://localhost:3003/health > /dev/null 2>&1; then
    echo "✅ Online" 
else
    echo "❌ Offline"
fi

# LIFF App (ตรวจสอบ process)
echo -n "📱 LIFF App:   "
if pgrep -f liff-server.js > /dev/null; then
    echo "✅ Online"
else
    echo "❌ Offline"
fi

echo ""
echo "📊 Memory Usage:"
pm2 status | grep -E "(pk-crm|liff-app)" | awk '{print $2 ": " $7}'
