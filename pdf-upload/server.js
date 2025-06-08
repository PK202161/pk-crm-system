const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3003;
const UPLOAD_DIR = 'uploads';

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR);
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const filename = `pdf-${timestamp}-${file.originalname}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to get file list with details
function getFileList() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(UPLOAD_DIR);
  return files
    .filter(file => file.endsWith('.pdf'))
    .map(file => {
      const filePath = path.join(UPLOAD_DIR, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        originalName: file.replace(/^pdf-\d+-/, ''),
        size: stats.size,
        uploadDate: stats.birthtime.toISOString(),
        uploadDateFormatted: stats.birthtime.toLocaleString('th-TH')
      };
    })
    .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
}

// Routes
app.get('/', (req, res) => {
  const fileList = getFileList();
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>PK CRM - PDF Upload</title>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            padding: 20px; 
            background: #f5f5f5;
            margin: 0;
          }
          .container { 
            max-width: 1000px; 
            margin: 0 auto; 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding-bottom: 20px;
            border-bottom: 3px solid #007bff;
          }
          .status { 
            color: #28a745; 
            font-weight: bold;
            background: #d4edda;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .upload-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .upload-form { 
            display: flex; 
            gap: 10px; 
            align-items: center;
            flex-wrap: wrap;
          }
          input[type="file"] { 
            flex: 1;
            padding: 10px; 
            border: 2px solid #ddd; 
            border-radius: 5px;
            min-width: 250px;
          }
          button { 
            background: #007bff; 
            color: white; 
            padding: 10px 20px; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer;
            font-size: 14px;
          }
          button:hover { background: #0056b3; }
          button.delete { background: #dc3545; }
          button.delete:hover { background: #c82333; }
          
          .files-section { margin-top: 30px; }
          .file-list { margin-top: 20px; }
          .file-item { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            padding: 15px; 
            border: 1px solid #ddd; 
            border-radius: 5px; 
            margin-bottom: 10px;
            background: #fff;
          }
          .file-info { flex: 1; }
          .file-name { font-weight: bold; color: #333; }
          .file-details { color: #666; font-size: 12px; margin-top: 5px; }
          .file-actions { display: flex; gap: 10px; }
          
          .empty-state { 
            text-align: center; 
            color: #666; 
            padding: 40px;
            background: #f8f9fa;
            border-radius: 8px;
          }
          
          .progress { display: none; margin-top: 10px; }
          .progress-bar { 
            width: 100%; 
            height: 20px; 
            background: #f0f0f0; 
            border-radius: 10px; 
            overflow: hidden;
          }
          .progress-fill { 
            height: 100%; 
            background: #007bff; 
            width: 0%; 
            transition: width 0.3s;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏢 PK CRM - PDF Upload System</h1>
            <div class="status">✅ ระบบออนไลน์ | Database เชื่อมต่อแล้ว</div>
          </div>
          
          <div class="upload-section">
            <h3>📄 อัพโหลด PDF ใหม่</h3>
            <form class="upload-form" action="/upload" method="post" enctype="multipart/form-data" id="uploadForm">
              <input type="file" name="pdf" accept=".pdf" required id="fileInput">
              <button type="submit" id="uploadBtn">🚀 อัพโหลด</button>
            </form>
            <div class="progress" id="progress">
              <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
              </div>
              <div id="progressText">กำลังประมวลผล...</div>
            </div>
          </div>
          
          <div class="files-section">
            <h3>📁 ไฟล์ที่อัพโหลดแล้ว (${fileList.length} ไฟล์)</h3>
            <div class="file-list">
              ${fileList.length > 0 ? fileList.map(file => `
                <div class="file-item">
                  <div class="file-info">
                    <div class="file-name">${file.originalName}</div>
                    <div class="file-details">
                      📅 ${file.uploadDateFormatted} | 
                      📦 ${(file.size / 1024).toFixed(1)} KB |
                      🗂️ ${file.filename}
                    </div>
                  </div>
                  <div class="file-actions">
                    <button onclick="downloadFile('${file.filename}')" title="ดาวน์โหลด">⬇️</button>
                    <button class="delete" onclick="deleteFile('${file.filename}')" title="ลบไฟล์">🗑️</button>
                  </div>
                </div>
              `).join('') : `
                <div class="empty-state">
                  <h4>ยังไม่มีไฟล์ PDF</h4>
                  <p>อัพโหลดไฟล์ PDF แรกของคุณเพื่อเริ่มต้นใช้งาน</p>
                </div>
              `}
            </div>
          </div>
        </div>

        <script>
          // Upload form handling
          document.getElementById('uploadForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            const fileInput = document.getElementById('fileInput');
            const file = fileInput.files[0];
            
            if (!file) {
              alert('กรุณาเลือกไฟล์ PDF');
              return;
            }
            
            formData.append('pdf', file);
            
            // Show progress
            document.getElementById('progress').style.display = 'block';
            document.getElementById('uploadBtn').disabled = true;
            document.getElementById('uploadBtn').textContent = 'กำลังอัพโหลด...';
            
            try {
              const response = await fetch('/upload', {
                method: 'POST',
                body: formData
              });
              
              const result = await response.json();
              
              if (result.success) {
                alert('อัพโหลดสำเร็จ! 🎉');
                location.reload(); // Refresh to show new file
              } else {
                alert('อัพโหลดไม่สำเร็จ: ' + (result.error || 'Unknown error'));
              }
            } catch (error) {
              alert('เกิดข้อผิดพลาด: ' + error.message);
            } finally {
              document.getElementById('progress').style.display = 'none';
              document.getElementById('uploadBtn').disabled = false;
              document.getElementById('uploadBtn').textContent = '🚀 อัพโหลด';
            }
          });
          
          // Delete file function
          async function deleteFile(filename) {
            if (!confirm('ต้องการลบไฟล์ "' + filename + '" หรือไม่?')) {
              return;
            }
            
            try {
              const response = await fetch('/delete/' + encodeURIComponent(filename), {
                method: 'DELETE'
              });
              
              const result = await response.json();
              
              if (result.success) {
                alert('ลบไฟล์สำเร็จ! 🗑️');
                location.reload();
              } else {
                alert('ลบไฟล์ไม่สำเร็จ: ' + (result.error || 'Unknown error'));
              }
            } catch (error) {
              alert('เกิดข้อผิดพลาด: ' + error.message);
            }
          }
          
          // Download file function
          function downloadFile(filename) {
            window.open('/download/' + encodeURIComponent(filename), '_blank');
          }
        </script>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  const fileCount = getFileList().length;
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'PDF Upload System Running',
    fileCount: fileCount,
    systemInfo: {
      uploadDir: UPLOAD_DIR,
      maxFileSize: '10MB',
      supportedTypes: ['PDF']
    }
  });
});

// N8N Webhook Configuration
const N8N_WEBHOOK_URL = 'https://n8npkapp.pktechnic.com/webhook-test/uploadPdf';

// Function to send data to N8N webhook
async function sendToN8N(data) {
  try {
    console.log('🔗 Sending data to N8N webhook...');
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      const result = await response.text();
      console.log('✅ N8N webhook successful:', response.status);
      return { success: true, response: result };
    } else {
      console.error('❌ N8N webhook failed:', response.status, response.statusText);
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    console.error('❌ N8N webhook error:', error.message);
    return { success: false, error: error.message };
  }
}

app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No PDF file uploaded' 
      });
    }

    console.log('📄 Processing PDF:', req.file.originalname);

    // Read and parse PDF
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    
    // Enhanced document type detection with regex patterns
    const text = pdfData.text;
    let documentType = 'unknown';
    let documentNumber = null;
    let customerName = null;
    let customerCode = null;
    let totalAmount = null;
    let documentDate = null;
    
    // Document type detection
    if (text.includes('ใบเสนอราคา') || /QT\d{7}/.test(text)) {
      documentType = 'quotation';
      // Extract quotation number
      const qtMatch = text.match(/QT\d{7}/);
      if (qtMatch) documentNumber = qtMatch[0];
    } else if (text.includes('ใบสั่งขาย') || /SO\d{7}/.test(text)) {
      documentType = 'sales_order';
      // Extract sales order number  
      const soMatch = text.match(/SO\d{7}/);
      if (soMatch) documentNumber = soMatch[0];
    }
    
    // Extract customer info
    const customerMatch = text.match(/(?:บริษัท|ลูกค้า)[:\s]*([^\n\r]+?)(?:\s+CU\d+|\s*$)/);
    if (customerMatch) customerName = customerMatch[1].trim();
    
    const customerCodeMatch = text.match(/(CU\d+)/);
    if (customerCodeMatch) customerCode = customerCodeMatch[1];
    
    // Extract total amount
    const totalMatch = text.match(/(?:รวมทั้งสิ้น|จำนวนเงินรวม)[:\s]*([\d,]+\.?\d*)/);
    if (totalMatch) totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
    
    // Extract date
    const dateMatch = text.match(/วันที่[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (dateMatch) documentDate = dateMatch[1];
    
    const result = {
      success: true,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      documentType: documentType,
      documentNumber: documentNumber,
      customerName: customerName,
      customerCode: customerCode,
      totalAmount: totalAmount,
      documentDate: documentDate,
      extractedText: pdfData.text.substring(0, 1000) + '...', // First 1000 chars
      fullText: pdfData.text, // Full text for N8N processing
      fullTextLength: pdfData.text.length,
      timestamp: new Date().toISOString(),
      message: 'PDF processed successfully'
    };

    console.log('✅ PDF processed successfully:', {
      filename: req.file.originalname,
      type: documentType,
      number: documentNumber,
      customer: customerName,
      customerCode: customerCode,
      total: totalAmount,
      size: req.file.size
    });

    // Send to N8N webhook
    const n8nResult = await sendToN8N({
      ...result,
      source: 'pk-crm-pdf-upload',
      webhookUrl: N8N_WEBHOOK_URL,
      processedAt: new Date().toISOString()
    });

    // Include N8N result in response
    result.n8nWebhook = n8nResult;

    res.json(result);

  } catch (error) {
    console.error('❌ PDF processing error:', error);
    res.status(500).json({ 
      success: false,
      error: 'PDF processing failed: ' + error.message 
    });
  }
});

// Delete file endpoint
app.delete('/delete/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    fs.unlinkSync(filePath);
    
    console.log('🗑️ File deleted:', filename);
    
    res.json({
      success: true,
      message: 'File deleted successfully',
      filename: filename
    });
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file: ' + error.message
    });
  }
});

// Download file endpoint
app.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    const originalName = filename.replace(/^pdf-\d+-/, '');
    res.download(filePath, originalName);
    
  } catch (error) {
    console.error('❌ Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file: ' + error.message
    });
  }
});

// Get files list API
app.get('/api/files', (req, res) => {
  try {
    const fileList = getFileList();
    res.json({
      success: true,
      files: fileList,
      count: fileList.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log('🚀 Enhanced PDF Upload Server running on port', PORT);
  console.log('📄 Local: http://localhost:' + PORT);
  console.log('🌐 Public: https://pkcrm.pktechnic.com');
  console.log('✨ Features: Upload, Delete, Download, File Management');
  
  // Create upload directory if it doesn't exist
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
    console.log('📁 Created upload directory:', UPLOAD_DIR);
  } else {
    const fileCount = getFileList().length;
    console.log('📊 Current files:', fileCount);
  }
});
