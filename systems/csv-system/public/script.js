document.getElementById('csvFile').addEventListener('change', handleFileSelect);
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        uploadFile(file);
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('csvFile', file);

    const messageDiv = document.getElementById('message');
    const resultSection = document.getElementById('resultSection');
    const resultsDiv = document.getElementById('results');
    const historyList = document.getElementById('historyList');

    // Show loading
    messageDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="loading"></div>
            <p>กำลังประมวลผลไฟล์ CSV...</p>
        </div>
    `;

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        console.log(result);

        if (result.success) {
            messageDiv.innerHTML = `
                <div class="success-message">
                    <i class="fas fa-check-circle"></i>
                    ประมวลผลไฟล์ CSV สำเร็จ!
                </div>
            `;

            resultsDiv.innerHTML = `
                <div style="background: #f8f9fa; border-radius: 10px; padding: 20px;">
                    <h3><i class="fas fa-file-alt"></i> ${result.file.originalName}</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                        <div style="background: white; padding: 15px; border-radius: 8px;">
                            <strong>ประเภทเอกสาร:</strong><br>
                            ${getDocumentTypeText(result.parsing.documentType)}
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 8px;">
                            <strong>เลขที่เอกสาร:</strong><br>
                            ${result.summary.documentNumber || 'ไม่ระบุ'}
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 8px;">
                            <strong>ลูกค้า:</strong><br>
                            ${result.summary.customerName || 'ไม่ระบุ'}
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 8px;">
                            <strong>ยอดรวม:</strong><br>
                            ${formatCurrency(result.summary.grandTotal)}
                        </div>
                    </div>
                </div>
            `;

            // Update history
            updateHistorySection(result.file.originalName, result.summary.documentNumber, result.summary.customerName, result.summary.grandTotal);

            resultSection.style.display = 'block';
        } else {
            messageDiv.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    เกิดข้อผิดพลาด: ${result.error}
                </div>
            `;
        }

    } catch (error) {
        messageDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                เกิดข้อผิดพลาด: ${error.message}
            </div>
        `;
    }
}

function getDocumentTypeText(type) {
    switch(type) {
        case 'quotation': return 'ใบเสนอราคา';
        case 'sales_order': return 'ใบสั่งขาย';
        default: return 'ไม่ระบุ';
    }
}

function formatCurrency(amount) {
    if (!amount) return 'ไม่ระบุ';
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB'
    }).format(amount);
}

function updateHistorySection(fileName, documentNumber, customerName, grandTotal) {
    const historyList = document.getElementById('historyList');

    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
        <strong>ไฟล์:</strong> ${fileName} <br>
        <strong>เลขที่เอกสาร:</strong> ${documentNumber || 'ไม่ระบุ'} <br>
        <strong>ลูกค้า:</strong> ${customerName || 'ไม่ระบุ'} <br>
        <strong>ยอดรวม:</strong> ${formatCurrency(grandTotal)} <br>
        <small style="color:#999;">${new Date().toLocaleString('th-TH')}</small>
    `;

    historyList.prepend(historyItem);

    // Limit history to last 5 items
    const historyItems = historyList.getElementsByClassName('history-item');
    if (historyItems.length > 5) {
        historyList.removeChild(historyItems[historyItems.length - 1]);
    }
}

async function loadHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '<div>กำลังโหลด...</div>';
    try {
        const res = await fetch('/files');
        const files = await res.json();
        if (!files.length) {
            historyList.innerHTML = '<div>ยังไม่มีประวัติการอัปโหลด</div>';
            return;
        }
        historyList.innerHTML = `
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#f0f2ff;">
                        <th style="padding:8px;">ชื่อไฟล์</th>
                        <th style="padding:8px;">ขนาด</th>
                        <th style="padding:8px;">วันที่อัปโหลด</th>
                    </tr>
                </thead>
                <tbody>
                    ${files.map(f => `
                        <tr>
                            <td style="padding:8px;">${f.fileName}</td>
                            <td style="padding:8px;">${(f.size/1024).toFixed(2)} KB</td>
                            <td style="padding:8px;">${new Date(f.createdAt).toLocaleString('th-TH')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (e) {
        historyList.innerHTML = '<div style="color:red;">เกิดข้อผิดพลาดในการโหลดประวัติ</div>';
    }
}

// เรียกเมื่อโหลดหน้า
window.onload = function() {
    loadHistory();
    document.getElementById('csvFile').addEventListener('change', handleFileSelect);
};