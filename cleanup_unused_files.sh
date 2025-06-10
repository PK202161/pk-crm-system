#!/bin/bash
# cleanup_unused_files.sh - ลบไฟล์ที่ไม่ได้ใช้ใน PK CRM

echo "🧹 PK CRM File Cleanup Utility"
echo "=============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_section() { echo -e "\n${BLUE}$1${NC}"; echo "$(echo "$1" | sed 's/./=/g')"; }
print_info() { echo -e "${GREEN}✓${NC} $1"; }
print_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
print_remove() { echo -e "${RED}🗑${NC} $1"; }

# Function to ask user for confirmation
ask_remove() {
    local file="$1"
    local description="$2"
    local default="$3"
    
    if [ "$default" = "y" ]; then
        read -p "Remove $file ($description)? [Y/n]: " choice
        choice=${choice:-y}
    else
        read -p "Remove $file ($description)? [y/N]: " choice
        choice=${choice:-n}
    fi
    
    if [[ $choice =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Create backup before cleanup
print_section "📦 Creating Backup"
BACKUP_DIR="../pk-crm-before-cleanup-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP_DIR"
print_info "Backup created at: $BACKUP_DIR"

print_section "🔍 Analyzing Files"

# Files to potentially remove
declare -A files_to_check
files_to_check["docker-compose.yml"]="Docker compose config (not needed for PM2 setup)"
files_to_check["docker-compose.yml.prod"]="Docker production config (not needed for PM2 setup)"
files_to_check["Dockerfile"]="Docker build file (not needed for PM2 setup)"
files_to_check["nginx.conf"]="Nginx config (may not be used if using Cloudflare tunnel)"
files_to_check["login_patch.js"]="Login patch file (may be obsolete)"

echo "Current directory contents:"
ls -la

echo ""
print_section "📋 Files Analysis"

# Check which files exist and their usage
for file in "${!files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "📄 $file - ${files_to_check[$file]}"
        
        # Check if file is referenced anywhere
        if grep -r "$file" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | grep -v "Binary file" | grep -v "$0"; then
            print_warn "  Referenced in other files"
        else
            print_info "  Not referenced in code"
        fi
        
        # Show file size
        size=$(du -h "$file" | cut -f1)
        echo "  Size: $size"
        echo ""
    fi
done

print_section "🗑️ Cleanup Process"

# Process each file
REMOVED_COUNT=0
TOTAL_SIZE_SAVED=0

for file in "${!files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo ""
        echo "📄 File: $file"
        echo "Description: ${files_to_check[$file]}"
        
        # Get file size for tracking
        size_bytes=$(stat -c%s "$file" 2>/dev/null || echo "0")
        size_human=$(du -h "$file" | cut -f1)
        
        # Default suggestions based on file type
        default_action="n"
        if [[ "$file" == docker* ]] || [[ "$file" == "Dockerfile" ]]; then
            default_action="y"  # Docker files usually safe to remove if using PM2
        fi
        
        if ask_remove "$file" "${files_to_check[$file]}" "$default_action"; then
            rm "$file"
            print_remove "Removed $file (saved $size_human)"
            REMOVED_COUNT=$((REMOVED_COUNT + 1))
            TOTAL_SIZE_SAVED=$((TOTAL_SIZE_SAVED + size_bytes))
        else
            print_info "Kept $file"
        fi
    fi
done

print_section "📂 Directory Cleanup"

# Check for empty directories or unused directories
if [ -d "scripts" ]; then
    if [ "$(ls -A scripts)" ]; then
        echo "📁 scripts/ directory contains:"
        ls -la scripts/
        if ask_remove "scripts/" "Scripts directory (check contents first)" "n"; then
            rm -rf scripts/
            print_remove "Removed scripts/ directory"
        fi
    else
        echo "📁 scripts/ directory is empty"
        if ask_remove "scripts/" "Empty scripts directory" "y"; then
            rmdir scripts/
            print_remove "Removed empty scripts/ directory"
        fi
    fi
fi

print_section "🧹 Log Files Cleanup"

# Check log files
if [ -d "logs" ]; then
    echo "📁 Log files:"
    ls -la logs/
    echo ""
    
    # Find old log files (older than 30 days)
    old_logs=$(find logs/ -name "*.log" -mtime +30 2>/dev/null || echo "")
    if [ ! -z "$old_logs" ]; then
        echo "Old log files (>30 days):"
        echo "$old_logs"
        if ask_remove "old log files" "Log files older than 30 days" "y"; then
            find logs/ -name "*.log" -mtime +30 -delete 2>/dev/null || true
            print_remove "Removed old log files"
        fi
    else
        print_info "No old log files found"
    fi
fi

print_section "🔄 Additional Cleanup Options"

# Check for potential temporary files
temp_files=$(find . -name "*.tmp" -o -name "*.bak" -o -name "*~" -o -name ".DS_Store" 2>/dev/null || echo "")
if [ ! -z "$temp_files" ]; then
    echo "Temporary files found:"
    echo "$temp_files"
    if ask_remove "temporary files" "Temporary and backup files" "y"; then
        find . -name "*.tmp" -delete 2>/dev/null || true
        find . -name "*.bak" -delete 2>/dev/null || true
        find . -name "*~" -delete 2>/dev/null || true
        find . -name ".DS_Store" -delete 2>/dev/null || true
        print_remove "Removed temporary files"
    fi
fi

# Check uploads directory
if [ -d "uploads" ]; then
    upload_count=$(find uploads/ -type f 2>/dev/null | wc -l)
    upload_size=$(du -sh uploads 2>/dev/null | cut -f1 || echo "0")
    echo ""
    echo "📁 Uploads directory: $upload_count files, $upload_size total"
    
    if [ $upload_count -gt 0 ]; then
        echo "Recent uploads:"
        ls -lt uploads/ | head -5
        if ask_remove "old upload files" "Files in uploads/ directory (keep recent ones)" "n"; then
            echo "Which files to remove?"
            echo "1) All files"
            echo "2) Files older than 7 days"
            echo "3) Files older than 30 days"
            echo "4) Cancel"
            read -p "Choice [1-4]: " upload_choice
            
            case $upload_choice in
                1)
                    rm -rf uploads/*
                    print_remove "Removed all upload files"
                    ;;
                2)
                    find uploads/ -type f -mtime +7 -delete 2>/dev/null || true
                    print_remove "Removed files older than 7 days"
                    ;;
                3)
                    find uploads/ -type f -mtime +30 -delete 2>/dev/null || true
                    print_remove "Removed files older than 30 days"
                    ;;
                *)
                    print_info "Kept all upload files"
                    ;;
            esac
        fi
    fi
fi

print_section "📊 Cleanup Summary"

echo "Files removed: $REMOVED_COUNT"
if [ $TOTAL_SIZE_SAVED -gt 0 ]; then
    # Convert bytes to human readable
    if [ $TOTAL_SIZE_SAVED -gt 1048576 ]; then
        size_mb=$((TOTAL_SIZE_SAVED / 1048576))
        echo "Space saved: ~${size_mb}MB"
    elif [ $TOTAL_SIZE_SAVED -gt 1024 ]; then
        size_kb=$((TOTAL_SIZE_SAVED / 1024))
        echo "Space saved: ~${size_kb}KB"
    else
        echo "Space saved: ${TOTAL_SIZE_SAVED} bytes"
    fi
fi

echo ""
print_section "📁 Final Directory Structure"
echo "Current contents:"
ls -la

echo ""
print_section "✅ Cleanup Complete"
echo "Backup available at: $BACKUP_DIR"
echo ""
echo "🔄 Next steps:"
echo "1. Test system: curl http://localhost:3003/health"
echo "2. Check PM2 status: pm2 status"
echo "3. If issues, restore from backup:"
echo "   rm -rf ~/pk-crm && mv $BACKUP_DIR ~/pk-crm"
echo ""

# Final system test
echo "🧪 Quick system test:"
if curl -sf http://localhost:3003/health >/dev/null 2>&1; then
    print_info "System health check: PASSED"
else
    print_warn "System health check: FAILED - check PM2 status"
fi
