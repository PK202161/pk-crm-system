// Function to run when the window has finished loading
window.onload = function() {
    // Get references to DOM elements
    const fileInput = document.getElementById('csvFile');
    const uploadArea = document.querySelector('.upload-area');

    // Initial load of upload history
    loadHistory();

    // --- Event Listeners Setup ---

    // 1. Trigger file input click when the upload area is clicked
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // 2. Handle file selection from the file input dialog
    fileInput.addEventListener('change', handleFileSelect);

    // 3. Handle Drag and Drop events
    // Prevent default behavior for drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Add visual feedback when a file is dragged over the upload area
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.add('active'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('active'), false);
    });

    // Handle the dropped file
    uploadArea.addEventListener('drop', handleDrop, false);
};

/**
 * Handles the file selection event.
 * @param {Event} event The file input change event.
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        uploadFile(file);
    }
    // Clear the input value to allow re-selecting the same file
    event.target.value = null;
}

/**
 * Handles the file drop event.
 * @param {DragEvent} event The drop event.
 */
function handleDrop(event) {
    const dt = event.dataTransfer;
    const file = dt.files[0];
    if (file) {
        uploadFile(file);
    }
}

/**
 * Uploads the selected file to the server and handles the response.
 * @param {File} file The file to upload.
 */
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('csvFile', file);

    const messageDiv = document.getElementById('message');
    const resultSection = document.getElementById('resultSection');
    const resultsDiv = document.getElementById('results');

    // Show loading indicator
    resultSection.style.display = 'none'; // Hide previous results
    messageDiv.innerHTML = `
        <div class="loading-container">
            <div class="loading"></div>
            <p>กำลังประมวลผลไฟล์: ${file.name}</p>
        </div>
    `;

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        // Robust error handling: check if response is ok
        if (!response.ok) {
            let errorMsg = `เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: ${response.status} ${response.statusText}`;
            try {
                // Try to get a more specific error message from the server's JSON response
                const errorResult = await response.json();
                errorMsg = errorResult.error || JSON.stringify(errorResult);
            } catch (e) {
                // If the response is not JSON, use the raw text
                const textError = await response.text();
                if (textError) errorMsg = textError;
            }
            throw new Error(errorMsg);
        }

        const result = await response.json();

        if (result.success) {
            // Display success message
            messageDiv.innerHTML = `
                <div class="success-message">
                    <i class="fas fa-check-circle"></i>
                    <span>ประมวลผลไฟล์ CSV สำเร็จ!</span>
                </div>
            `;

            // Display processing results
            resultsDiv.innerHTML = `
                <div style="background: #f8f9fa; border-radius: 10px; padding: 20px;">
                    <h3><i class="fas fa-file-alt"></i> ${result.file.originalName}</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <strong>ประเภทเอกสาร:</strong><br>
                            ${getDocumentTypeText(result.parsing.documentType)}
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <strong>เลขที่เอกสาร:</strong><br>
                            ${result.summary.documentNumber || 'ไม่ระบุ'}
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <strong>ลูกค้า:</strong><br>
                            ${result.summary.customerName || 'ไม่ระบุ'}
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <strong>ยอดรวม:</strong><br>
                            ${formatCurrency(result.summary.grandTotal)}
                        </div>
                    </div>
                </div>
            `;
            resultSection.style.display = 'block';

            // Refresh the history to include the new file
            await loadHistory();

        } else {
            throw new Error(result.error || 'เกิดข้อผิดพลาดที่ไม่รู้จัก');
        }

    } catch (error) {
        console.error('Upload Failed:', error);
        messageDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${error.message}</span>
            </div>
        `;
    }
}

/**
 * Fetches and displays the upload history from the server.
 */
async function loadHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = `<div class="loading-container"><div class="loading"></div><p>กำลังโหลดประวัติ...</p></div>`;

    try {
        const response = await fetch('/files');
        if (!response.ok) {
            throw new Error(`ไม่สามารถโหลดประวัติได้: ${response.statusText}`);
        }
        const files = await response.json();

        if (!files || files.length === 0) {
            historyList.innerHTML = '<div class="no-history">ยังไม่มีประวัติการอัปโหลด</div>';
            return;
        }

        const tableRows = files.map(f => `
            <tr>
                <td><i class="fas fa-file-csv" style="margin-right: 8px; color: #777;"></i>${f.fileName}</td>
                <td>${(f.size / 1024).toFixed(2)} KB</td>
                <td>${new Date(f.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'medium' })}</td>
            </tr>
        `).join('');

        historyList.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ชื่อไฟล์</th>
                        <th>ขนาด</th>
                        <th>วันที่อัปโหลด</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;
    } catch (e) {
        console.error('Failed to load history:', e);
        historyList.innerHTML = '<div class="error-message">เกิดข้อผิดพลาดในการโหลดประวัติ</div>';
    }
}


// --- Helper Functions ---

/**
 * Converts a document type identifier to a human-readable Thai string.
 * @param {string} type The document type identifier.
 * @returns {string} The Thai document type.
 */
function getDocumentTypeText(type) {
    switch (type) {
        case 'quotation': return 'ใบเสนอราคา';
        case 'sales_order': return 'ใบสั่งขาย';
        default: return 'ไม่ระบุ';
    }
}

/**
 * Formats a number as Thai Baht currency.
 * @param {number} amount The amount to format.
 * @returns {string} The formatted currency string.
 */
function formatCurrency(amount) {
    if (typeof amount !== 'number') {
        return 'ไม่ระบุ';
    }
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB'
    }).format(amount);
}