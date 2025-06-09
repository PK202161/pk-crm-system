// PK CRM CSV Upload System - Enhanced JavaScript v2.1
// วางไฟล์นี้ที่: ~/pk-crm/systems/csv-system/public/script.js

class PKCRMUploader {
    constructor() {
        this.uploadInProgress = false;
        this.uploadHistory = [];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadHistory();
        this.startPeriodicUpdates();
        
        console.log('🚀 PK CRM CSV Upload System v2.1 initialized');
    }

    bindEvents() {
        const fileInput = document.getElementById('csvFile');
        const uploadArea = document.getElementById('uploadArea');

        // Click to select file
        uploadArea.addEventListener('click', (e) => {
            if (!this.uploadInProgress && !e.target.closest('.upload-btn')) {
                fileInput.click();
            }
        });

        // File selection
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                if (!this.uploadInProgress) {
                    uploadArea.classList.add('dragover');
                }
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            }, false);
        });

        uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);

        // Clear history button
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        const confirmModal = document.getElementById('confirmModal');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

        clearHistoryBtn.addEventListener('click', () => {
            confirmModal.classList.add('show');
        });

        cancelDeleteBtn.addEventListener('click', () => {
            confirmModal.classList.remove('show');
        });

        confirmDeleteBtn.addEventListener('click', () => {
            this.clearOldFiles();
            confirmModal.classList.remove('show');
        });

        // Close modal on outside click
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                confirmModal.classList.remove('show');
            }
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.uploadFile(file);
        }
        // Clear input for re-selection
        event.target.value = null;
    }

    handleDrop(event) {
        const dt = event.dataTransfer;
        const file = dt.files[0];
        if (file && !this.uploadInProgress) {
            this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        if (this.uploadInProgress) {
            this.showMessage('การอัปโหลดกำลังดำเนินการอยู่', 'info');
            return;
        }

        // Validate file
        const validation = this.validateFile(file);
        if (!validation.valid) {
            this.showMessage(validation.message, 'error');
            return;
        }

        this.uploadInProgress = true;
        
        try {
            // Show processing UI
            this.showProcessingState(file.name);
            
            // Prepare form data
            const formData = new FormData();
            formData.append('csvFile', file);

            // Upload file
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                let errorMsg = `เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: ${response.status} ${response.statusText}`;
                try {
                    const errorResult = await response.json();
                    errorMsg = errorResult.error || JSON.stringify(errorResult);
                } catch (e) {
                    const textError = await response.text();
                    if (textError) errorMsg = textError;
                }
                throw new Error(errorMsg);
            }

            const result = await response.json();
            
            if (result.success) {
                this.handleUploadSuccess(result);
                await this.loadHistory();
            } else {
                throw new Error(result.error || 'เกิดข้อผิดพลาดที่ไม่รู้จัก');
            }

        } catch (error) {
            console.error('Upload Failed:', error);
            this.handleUploadError(error);
        } finally {
            this.uploadInProgress = false;
            this.hideProcessingState();
        }
    }

    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['text/csv', 'application/vnd.ms-excel'];
        const allowedExtensions = ['.csv'];

        if (!file) {
            return { valid: false, message: 'กรุณาเลือกไฟล์' };
        }

        if (file.size > maxSize) {
            return { valid: false, message: `ไฟล์มีขนาดใหญ่เกินไป (${this.formatFileSize(file.size)}) ขนาดสูงสุด 10MB` };
        }

        const isValidType = allowedTypes.includes(file.type) || 
                           allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

        if (!isValidType) {
            return { valid: false, message: 'กรุณาอัปโหลดไฟล์ CSV เท่านั้น' };
        }

        return { valid: true };
    }

    showProcessingState(fileName) {
        const overlay = document.getElementById('processingOverlay');
        const processingText = document.getElementById('processingText');
        
        processingText.textContent = `กำลังประมวลผล: ${fileName}`;
        overlay.classList.add('show');
    }

    hideProcessingState() {
        const overlay = document.getElementById('processingOverlay');
        overlay.classList.remove('show');
    }

    handleUploadSuccess(result) {
        this.showMessage('ประมวลผลไฟล์ CSV สำเร็จ!', 'success');
        
        this.displayResults(result);
        this.showResultSection();
        
        // Store in upload history
        this.uploadHistory.unshift({
            ...result,
            uploadTime: new Date()
        });
    }

    handleUploadError(error) {
        this.showMessage(error.message, 'error');
        this.hideResultSection();
    }

    showMessage(message, type = 'info') {
        const messageBox = document.getElementById('messageBox');
        const alertClass = `alert-${type}`;
        const iconClass = type === 'success' ? 'fa-check-circle' : 
                         type === 'error' ? 'fa-exclamation-triangle' : 
                         'fa-info-circle';

        messageBox.innerHTML = `
            <div class="alert ${alertClass}">
                <i class="fas ${iconClass}"></i>
                <span>${message}</span>
            </div>
        `;

        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                messageBox.innerHTML = '';
            }, 5000);
        }
    }

    displayResults(result) {
        const container = document.getElementById('resultsContainer');
        const summary = result.summary;

        container.innerHTML = `
            <div class="result-card">
                <div class="result-header">
                    <i class="fas fa-file-alt" style="color: var(--primary-color); font-size: 1.5rem;"></i>
                    <h3>${result.file.originalName}</h3>
                    <span style="margin-left: auto; background: var(--success-color); color: white; padding: 5px 12px; border-radius: 20px; font-size: 0.85rem;">
                        <i class="fas fa-check"></i> สำเร็จ
                    </span>
                </div>
                
                <div class="result-grid">
                    <div class="result-item">
                        <div class="result-label">ประเภทเอกสาร</div>
                        <div class="result-value">${this.getDocumentTypeText(summary.documentType)}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">เลขที่เอกสาร</div>
                        <div class="result-value">${summary.documentNumber || 'ไม่ระบุ'}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">รหัสลูกค้า</div>
                        <div class="result-value">${summary.customerCode || 'ไม่ระบุ'}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">ชื่อลูกค้า</div>
                        <div class="result-value">${summary.customerName || 'ไม่ระบุ'}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">พนักงานขาย</div>
                        <div class="result-value">${summary.salesperson || 'ไม่ระบุ'}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">ยอดรวม</div>
                        <div class="result-value" style="color: var(--success-color); font-weight: 600;">
                            ${this.formatCurrency(summary.grandTotal)}
                        </div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">วันที่เอกสาร</div>
                        <div class="result-value">${summary.date || 'ไม่ระบุ'}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">จำนวนรายการ</div>
                        <div class="result-value">${summary.itemCount || 0} รายการ</div>
                    </div>
                    ${summary.profitMargin ? `
                    <div class="result-item">
                        <div class="result-label">อัตรากำไร</div>
                        <div class="result-value" style="color: var(--warning-color); font-weight: 600;">
                            ${summary.profitMargin}%
                        </div>
                    </div>
                    ` : ''}
                    ${summary.validityDays ? `
                    <div class="result-item">
                        <div class="result-label">ยืนราคา</div>
                        <div class="result-value">${summary.validityDays} วัน</div>
                    </div>
                    ` : ''}
                </div>

                <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--gray-200);">
                    <h4 style="color: var(--gray-600); margin-bottom: 15px; font-size: 1rem;">
                        <i class="fas fa-cog"></i> รายละเอียดการประมวลผล
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; font-size: 0.9rem;">
                        <div><strong>File Size:</strong> ${this.formatFileSize(result.file.size)}</div>
                        <div><strong>Encoding:</strong> ${result.parsing?.metadata?.encoding || 'auto'}</div>
                        <div>
                            <strong>N8N Webhook:</strong> 
                            <span style="color: ${result.webhook?.success ? 'var(--success-color)' : 'var(--error-color)'};">
                                ${result.webhook?.success ? '✓ สำเร็จ' : '✗ ล้มเหลว'}
                            </span>
                        </div>
                        <div><strong>Version:</strong> 2.1</div>
                    </div>
                </div>
            </div>
        `;
    }

    showResultSection() {
        const section = document.getElementById('resultSection');
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    hideResultSection() {
        const section = document.getElementById('resultSection');
        section.style.display = 'none';
    }

    async loadHistory() {
        const container = document.getElementById('historyContainer');
        
        try {
            const response = await fetch('/files');
            if (!response.ok) throw new Error('Failed to load history');
            
            const files = await response.json();
            
            if (!files || files.length === 0) {
                container.innerHTML = this.getNoDataHTML('ยังไม่มีประวัติการอัปโหลด');
                return;
            }

            // Display recent files (last 10)
            const recentFiles = files.slice(0, 10);
            container.innerHTML = this.generateHistoryTable(recentFiles);
            
        } catch (error) {
            console.error('Failed to load history:', error);
            container.innerHTML = this.getNoDataHTML('เกิดข้อผิดพลาดในการโหลดประวัติ');
        }
    }

    generateHistoryTable(files) {
        const rows = files.map(file => `
            <tr>
                <td>
                    <i class="fas fa-file-csv file-icon"></i>
                    ${this.truncateText(file.fileName, 20)}
                </td>
                <td>${this.formatFileSize(file.size)}</td>
                <td>${this.formatDateTime(file.createdAt)}</td>
            </tr>
        `).join('');

        return `
            <table class="history-table">
                <thead>
                    <tr>
                        <th>ชื่อไฟล์</th>
                        <th>ขนาด</th>
                        <th>วันที่</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    async clearOldFiles() {
        const clearBtn = document.getElementById('clearHistoryBtn');
        
        try {
            clearBtn.disabled = true;
            clearBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังลบ...';
            
            const response = await fetch('/cleanup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('ไม่สามารถลบข้อมูลได้');
            }

            const result = await response.json();
            
            if (result.success) {
                this.showMessage(`ลบข้อมูลเก่าสำเร็จ: ${result.message}`, 'success');
                await this.loadHistory(); // Refresh history
            } else {
                throw new Error(result.error || 'เกิดข้อผิดพลาดในการลบข้อมูล');
            }

        } catch (error) {
            console.error('Clear files failed:', error);
            this.showMessage(error.message, 'error');
        } finally {
            clearBtn.disabled = false;
            clearBtn.innerHTML = '<i class="fas fa-trash-alt"></i> ลบข้อมูลเก่า';
        }
    }

    startPeriodicUpdates() {
        // Refresh history every 2 minutes
        setInterval(() => {
            this.loadHistory();
        }, 120000);
    }

    // Utility Functions
    getDocumentTypeText(type) {
        const types = {
            'quotation': 'ใบเสนอราคา',
            'sales_order': 'ใบสั่งขาย',
            'unknown': 'ไม่ระบุประเภท'
        };
        return types[type] || 'ไม่ระบุ';
    }

    formatCurrency(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) {
            return 'ไม่ระบุ';
        }
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 2
        }).format(amount);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('th-TH', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    getNoDataHTML(message) {
        return `
            <div class="no-data">
                <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.pkCrmUploader = new PKCRMUploader();
});