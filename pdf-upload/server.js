const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  connectionString: 'postgresql://pkt_upload:upload123@localhost:5434/pk_crm_db'
});

const app = express();
const PORT = 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure Multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'PK CRM ULTIMATE DEBUG PDF Upload Server',
    timestamp: new Date().toISOString(),
    port: PORT,
    features: ['PDF Upload', 'ULTIMATE DEBUG', 'Specific Pattern Matching', 'Enhanced PDF Parser', 'File Management', 'N8N Integration', 'Database Storage'],
    version: 'ultimate_debug_v5'
  });
});

// Main upload page with file management
app.get('/', async (req, res) => {
  try {
    // Get file list from database
    const query = `
      SELECT 
        attachment_id,
        original_filename,
        stored_filename,
        file_size,
        created_at
      FROM file_attachments 
      WHERE entity_type = 'pdf_upload'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query);
    const files = result.rows.map(file => ({
      ...file,
      uploadDateFormatted: new Date(file.created_at).toLocaleString('th-TH'),
      fileSizeFormatted: (file.file_size / 1024).toFixed(1) + ' KB',
      fileExists: fs.existsSync(path.join(__dirname, 'uploads', file.stored_filename))
    }));

    const html = `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PK CRM - ULTIMATE DEBUG PDF Upload System</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 15px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .status { 
            background: rgba(255,255,255,0.2);
            padding: 10px 20px;
            border-radius: 25px;
            display: inline-block;
            margin-top: 10px;
        }
        .content { padding: 30px; }
        .upload-section {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 30px;
            border: 2px dashed #ff6b6b;
        }
        .upload-form { 
            display: flex; 
            gap: 15px; 
            align-items: center;
            flex-wrap: wrap;
        }
        input[type="file"] { 
            flex: 1;
            padding: 12px; 
            border: 2px solid #ddd; 
            border-radius: 8px;
            min-width: 300px;
            font-size: 16px;
        }
        .btn { 
            background: #ff6b6b; 
            color: white; 
            padding: 12px 25px; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: all 0.3s;
        }
        .btn:hover { background: #ee5a24; transform: translateY(-2px); }
        .btn-danger { background: #dc3545; }
        .btn-danger:hover { background: #c82333; }
        .btn-success { background: #28a745; }
        .btn-success:hover { background: #218838; }
        
        .files-section { margin-top: 30px; }
        .files-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            margin-bottom: 20px;
        }
        .file-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }
        .file-card { 
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            transition: all 0.3s;
        }
        .file-card:hover { 
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .file-name { 
            font-weight: bold; 
            color: #333; 
            margin-bottom: 8px;
            font-size: 16px;
        }
        .file-details { 
            color: #666; 
            font-size: 13px; 
            margin-bottom: 15px;
            line-height: 1.4;
        }
        .file-actions { 
            display: flex; 
            gap: 10px; 
            justify-content: flex-end;
        }
        .file-actions button { 
            padding: 8px 15px;
            font-size: 14px;
        }
        .empty-state { 
            text-align: center; 
            color: #666; 
            padding: 60px 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        .empty-state h3 { margin-bottom: 10px; }
        .stats { 
            display: flex; 
            gap: 20px; 
            margin-bottom: 20px;
        }
        .stat-card { 
            background: #ff6b6b;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            text-align: center;
            flex: 1;
        }
        .stat-value { font-size: 24px; font-weight: bold; }
        .stat-label { font-size: 12px; opacity: 0.9; }
        .progress { 
            display: none; 
            margin-top: 15px;
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
        }
        .progress-bar { 
            height: 6px; 
            background: #ff6b6b; 
            width: 0%; 
            transition: width 0.3s;
        }
        .alert { 
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            display: none;
        }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        
        @media (max-width: 768px) {
            .upload-form { flex-direction: column; }
            input[type="file"] { min-width: auto; width: 100%; }
            .file-grid { grid-template-columns: 1fr; }
            .stats { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏢 PK CRM</h1>
            <h2>ULTIMATE DEBUG PDF Upload System</h2>
            <div class="status">✅ ระบบออนไลน์ | ULTIMATE DEBUG v5 | Full Logging | Database เชื่อมต่อ | N8N พร้อม</div>
        </div>
        
        <div class="content">
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-value">${files.length}</div>
                    <div class="stat-label">ไฟล์ทั้งหมด</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${files.filter(f => f.fileExists).length}</div>
                    <div class="stat-label">ไฟล์ที่พร้อมใช้</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Math.round(files.reduce((sum, f) => sum + f.file_size, 0) / 1024)} KB</div>
                    <div class="stat-label">ขนาดรวม</div>
                </div>
            </div>
            
            <div class="upload-section">
                <h3>📄 อัพโหลด PDF ใหม่ (ULTIMATE DEBUG - Full Console Logging)</h3>
                <form class="upload-form" id="uploadForm" enctype="multipart/form-data">
                    <input type="file" name="pdf" accept=".pdf" required id="fileInput">
                    <button type="submit" class="btn" id="uploadBtn">🚀 อัพโหลด</button>
                </form>
                <div class="progress" id="progress">
                    <div class="progress-bar" id="progressBar"></div>
                </div>
                <div class="alert alert-success" id="successAlert"></div>
                <div class="alert alert-error" id="errorAlert"></div>
            </div>
            
            <div class="files-section">
                <div class="files-header">
                    <h3>📁 ไฟล์ที่อัพโหลดแล้ว</h3>
                    <button class="btn btn-success" onclick="refreshFiles()">🔄 รีเฟรช</button>
                </div>
                
                ${files.length > 0 ? `
                <div class="file-grid">
                    ${files.map(file => `
                    <div class="file-card">
                        <div class="file-name">${file.original_filename}</div>
                        <div class="file-details">
                            📅 ${file.uploadDateFormatted}<br>
                            📦 ${file.fileSizeFormatted}<br>
                            🆔 ${file.stored_filename}<br>
                            ${file.fileExists ? '✅ ไฟล์พร้อมใช้' : '❌ ไฟล์ไม่พบ'}
                        </div>
                        <div class="file-actions">
                            ${file.fileExists ? `
                                <button class="btn" onclick="downloadFile('${file.stored_filename}')" title="ดาวน์โหลด">
                                    ⬇️ ดาวน์โหลด
                                </button>
                            ` : ''}
                            <button class="btn btn-danger" onclick="deleteFile('${file.stored_filename}', '${file.original_filename}')" title="ลบไฟล์">
                                🗑️ ลบ
                            </button>
                        </div>
                    </div>
                    `).join('')}
                </div>
                ` : `
                <div class="empty-state">
                    <h3>📂 ยังไม่มีไฟล์ PDF</h3>
                    <p>อัพโหลดไฟล์ PDF แรกของคุณเพื่อเริ่มต้นใช้งานระบบ CRM</p>
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
                showAlert('กรุณาเลือกไฟล์ PDF', 'error');
                return;
            }
            
            formData.append('pdf', file);
            
            // Show progress
            showProgress(true);
            setButtonState(true);
            
            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('อัพโหลดสำเร็จ! 🎉 ULTIMATE DEBUG v5 ประมวลผลแล้ว (ดู Console Log)...', 'success');
                    fileInput.value = '';
                    setTimeout(() => location.reload(), 2000);
                } else {
                    showAlert('อัพโหลดไม่สำเร็จ: ' + (result.message || 'Unknown error'), 'error');
                }
            } catch (error) {
                showAlert('เกิดข้อผิดพลาด: ' + error.message, 'error');
            } finally {
                showProgress(false);
                setButtonState(false);
            }
        });
        
        // Delete file function
        async function deleteFile(filename, originalName) {
            if (!confirm('ต้องการลบไฟล์ "' + originalName + '" หรือไม่?\\n\\nการลบนี้ไม่สามารถย้อนกลับได้')) {
                return;
            }
            
            try {
                const response = await fetch('/delete/' + encodeURIComponent(filename), {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('ลบไฟล์สำเร็จ! 🗑️', 'success');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showAlert('ลบไฟล์ไม่สำเร็จ: ' + (result.message || 'Unknown error'), 'error');
                }
            } catch (error) {
                showAlert('เกิดข้อผิดพลาด: ' + error.message, 'error');
            }
        }
        
        // Download file function
        function downloadFile(filename) {
            window.open('/download/' + encodeURIComponent(filename), '_blank');
        }
        
        // Refresh files
        function refreshFiles() {
            location.reload();
        }
        
        // Helper functions
        function showAlert(message, type) {
            const alertElement = document.getElementById(type === 'error' ? 'errorAlert' : 'successAlert');
            alertElement.textContent = message;
            alertElement.style.display = 'block';
            
            setTimeout(() => {
                alertElement.style.display = 'none';
            }, 5000);
        }
        
        function showProgress(show) {
            document.getElementById('progress').style.display = show ? 'block' : 'none';
            if (show) {
                document.getElementById('progressBar').style.width = '100%';
            }
        }
        
        function setButtonState(uploading) {
            const btn = document.getElementById('uploadBtn');
            btn.disabled = uploading;
            btn.textContent = uploading ? '⏳ กำลังอัพโหลด...' : '🚀 อัพโหลด';
        }
    </script>
</body>
</html>`;
    
    res.send(html);
  } catch (error) {
    console.error('❌ Main page error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// File upload endpoint
app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('📄 PDF uploaded:', req.file.filename);

    // Extract text from PDF
    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBuffer);
    const extractedText = pdfData.text;

    console.log('📝 Extracted text length:', extractedText.length);

    // ULTIMATE DEBUG PDF parsing
    const parsedData = await ultimateDebugParsePDFContent(extractedText);

    // Save upload record to database
    const uploadRecord = await saveUploadRecord(req.file, extractedText, parsedData);

    // Send to N8N for processing (if available)
    try {
      const n8nResult = await sendToN8N(req.file, extractedText, parsedData);
      console.log('✅ N8N processing successful');
    } catch (n8nError) {
      console.error('❌ N8N processing failed:', n8nError.message);
      // Continue even if N8N fails
    }

    res.json({
      success: true,
      message: 'PDF uploaded and processed successfully with ULTIMATE DEBUG v5',
      data: {
        fileId: uploadRecord.attachment_id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        extractedText: extractedText.substring(0, 500) + '...', // First 500 chars
        parsedData: parsedData,
        uploadTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process PDF',
      error: error.message
    });
  }
});

// Get upload history
app.get('/uploads', async (req, res) => {
  try {
    const query = `
      SELECT 
        attachment_id,
        original_filename,
        stored_filename,
        file_size,
        created_at,
        entity_type,
        entity_id
      FROM file_attachments 
      WHERE entity_type = 'pdf_upload'
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      uploads: result.rows
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch uploads',
      error: error.message
    });
  }
});

// Get specific upload details
app.get('/upload/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT * FROM file_attachments 
      WHERE attachment_id = $1 AND entity_type = 'pdf_upload'
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found'
      });
    }

    res.json({
      success: true,
      upload: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upload details',
      error: error.message
    });
  }
});

// Delete file endpoint
app.delete('/delete/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Check if file exists in database
    const dbQuery = `
      SELECT * FROM file_attachments 
      WHERE stored_filename = $1 AND entity_type = 'pdf_upload'
    `;
    const dbResult = await pool.query(dbQuery, [filename]);
    
    if (dbResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found in database'
      });
    }
    
    const fileRecord = dbResult.rows[0];
    const filePath = path.join(__dirname, 'uploads', filename);
    
    // Delete physical file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Physical file deleted:', filename);
    }
    
    // Delete from database
    const deleteQuery = `
      DELETE FROM file_attachments 
      WHERE attachment_id = $1
    `;
    await pool.query(deleteQuery, [fileRecord.attachment_id]);
    
    // Log the deletion
    await logSystemActivity('file_deleted', {
      filename: filename,
      originalName: fileRecord.original_filename,
      deletedBy: 'user',
      deletedAt: new Date().toISOString()
    });
    
    console.log('✅ File deleted successfully:', filename);
    
    res.json({
      success: true,
      message: 'File deleted successfully',
      filename: filename
    });
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message
    });
  }
});

// Download file endpoint
app.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Get file info from database
    const dbQuery = `
      SELECT * FROM file_attachments 
      WHERE stored_filename = $1 AND entity_type = 'pdf_upload'
    `;
    const dbResult = await pool.query(dbQuery, [filename]);
    
    if (dbResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    const fileRecord = dbResult.rows[0];
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Physical file not found'
      });
    }
    
    // Log the download
    await logSystemActivity('file_downloaded', {
      filename: filename,
      originalName: fileRecord.original_filename,
      downloadedBy: 'user',
      downloadedAt: new Date().toISOString()
    });
    
    console.log('⬇️ File downloaded:', filename);
    
    // Send file with original name
    res.download(filePath, fileRecord.original_filename);
    
  } catch (error) {
    console.error('❌ Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error.message
    });
  }
});

// Get file list API
app.get('/api/files', async (req, res) => {
  try {
    const query = `
      SELECT 
        attachment_id,
        original_filename,
        stored_filename,
        file_size,
        created_at,
        mime_type
      FROM file_attachments 
      WHERE entity_type = 'pdf_upload'
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    
    // Add file existence check
    const filesWithStatus = result.rows.map(file => {
      const filePath = path.join(__dirname, 'uploads', file.stored_filename);
      return {
        ...file,
        fileExists: fs.existsSync(filePath),
        uploadDateFormatted: new Date(file.created_at).toLocaleString('th-TH'),
        fileSizeFormatted: (file.file_size / 1024).toFixed(1) + ' KB'
      };
    });
    
    res.json({
      success: true,
      files: filesWithStatus,
      count: filesWithStatus.length
    });
  } catch (error) {
    console.error('❌ API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ULTIMATE DEBUG TEXT CLEANING FUNCTION
function ultimateCleanText(text) {
  console.log('🧹🧹🧹 ULTIMATE TEXT CLEANING START 🧹🧹🧹');
  console.log('📏 Original text length:', text.length);
  console.log('🔍 Original text sample (chars 1000-1500):');
  console.log(text.substring(1000, 1500));
  
  let cleaned = text;
  
  // Step 1: Show control characters before removal
  const controlChars = text.match(/[\u0000-\u001F\u007F-\u009F]/g);
  if (controlChars) {
    console.log('🚫 Found control characters:', controlChars.map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')));
  }
  
  // Step 2: Remove all control characters
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
  console.log('✅ Step 1: Removed control characters, length:', cleaned.length);
  
  // Step 3: Fix specific broken patterns we know exist
  const brokenPatterns = [
    { pattern: /เลขที[^Q]*QT(\d{7})/gi, replacement: 'เลขที่ใบเสนอราคา QT$1', name: 'quotation number' },
    { pattern: /จํานวนเงินรวมทั[^0-9]+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi, replacement: 'จํานวนเงินรวมทั้งสิ้น $1', name: 'total amount' },
    { pattern: /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)[^ร]*รวมเป็นเงิน/gi, replacement: '$1 รวมเป็นเงิน', name: 'subtotal' },
    { pattern: /(\d+\.?\d*)\s*%[^0-9]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)[^จ]*จํานวนภาษี/gi, replacement: '$1% $2 จํานวนภาษีมูลค่าเพิ่ม', name: 'VAT' },
    { pattern: /เคเบิ[^ล]*ล/gi, replacement: 'เคเบิล', name: 'cable word' },
    { pattern: /([ก-ฮ])[^ก-ฮA-Za-z0-9]*([ก-ฮ])/g, replacement: '$1$2', name: 'broken Thai words' },
    { pattern: /([A-Za-z0-9])[^ก-ฮA-Za-z0-9]*([A-Za-z0-9])/g, replacement: '$1$2', name: 'broken English/numbers' }
  ];
  
  brokenPatterns.forEach((bp, index) => {
    const beforeLength = cleaned.length;
    const matches = cleaned.match(bp.pattern);
    if (matches) {
      console.log(`🔧 Step ${index + 3}: Found ${bp.name}:`, matches.slice(0, 3));
    }
    cleaned = cleaned.replace(bp.pattern, bp.replacement);
    if (cleaned.length !== beforeLength) {
      console.log(`✅ Step ${index + 3}: Fixed ${bp.name}, length change:`, beforeLength, '->', cleaned.length);
    }
  });
  
  // Final cleanup
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  console.log('📏 Final cleaned length:', cleaned.length);
  console.log('🔍 Cleaned text sample (chars 1000-1500):');
  console.log(cleaned.substring(1000, 1500));
  console.log('🧹🧹🧹 ULTIMATE TEXT CLEANING END 🧹🧹🧹');
  
  return cleaned;
}

// Helper Functions

async function ultimateDebugParsePDFContent(text) {
  console.log('🚀🚀🚀 ULTIMATE DEBUG PARSING START 🚀🚀🚀');
  
  const data = {
    type: 'unknown',
    quotationNumber: null,
    customerName: null,
    customerCode: null,
    date: null,
    total: null,
    subtotal: null,
    vatAmount: null,
    vatPercent: null,
    discount: null,
    items: [],
    summary: {},
    rawText: text,
    parsingEnhancements: {
      ultimateDebug: true,
      specificPatternMatching: true,
      fullLogging: true,
      version: 'ultimate_debug_v5'
    }
  };

  try {
    // ULTIMATE CLEAN TEXT
    const cleanText = ultimateCleanText(text);

    // EXTRACT QUOTATION NUMBER - ULTIMATE DEBUG
    console.log('🔍 EXTRACTING QUOTATION NUMBER...');
    const quotationPatterns = [
      /QT(\d{7})/gi,
      /เลขที่[^Q]*QT(\d{7})/gi,
      /Quotation[^Q]*QT(\d{7})/gi
    ];
    
    for (let i = 0; i < quotationPatterns.length; i++) {
      const pattern = quotationPatterns[i];
      const matches = [...cleanText.matchAll(pattern)];
      console.log(`📋 Quotation pattern ${i + 1}:`, pattern, 'found:', matches.length);
      if (matches.length > 0) {
        data.quotationNumber = 'QT' + matches[0][1];
        console.log(`✅ FOUND QUOTATION NUMBER: ${data.quotationNumber}`);
        break;
      }
    }

    // EXTRACT DOCUMENT TYPE
    if (cleanText.includes('ใบเสนอราคา') || cleanText.includes('QUOTATION') || data.quotationNumber) {
      data.type = 'quotation';
      console.log('✅ DOCUMENT TYPE: quotation');
    }

    // EXTRACT CUSTOMER CODE
    console.log('🔍 EXTRACTING CUSTOMER CODE...');
    const customerCodeMatch = cleanText.match(/(CU\d+)/i);
    if (customerCodeMatch) {
      data.customerCode = customerCodeMatch[1];
      console.log(`✅ FOUND CUSTOMER CODE: ${data.customerCode}`);
    }

    // EXTRACT CUSTOMER NAME - ULTIMATE DEBUG
    console.log('🔍 EXTRACTING CUSTOMER NAME...');
    const customerPatterns = [
      /CU\d+\s+บริษัท\s+([^บ]+?)\s+จำกัด/gi,
      /CU\d+\s+บริษัท\s+([^บ]+?)\s+จํากัด/gi,
      /To\s+CU\d+\s+บริษัท\s+([^บ]+?)\s+จำกัด/gi,
      /บริษัท\s+([กขคงจชซฎดตถทธนบปพฟภมยรลวศษสหลอฮ][^บ]+?)\s+จำกัด/gi
    ];
    
    for (let i = 0; i < customerPatterns.length; i++) {
      const pattern = customerPatterns[i];
      const matches = [...cleanText.matchAll(pattern)];
      console.log(`👤 Customer pattern ${i + 1}:`, pattern, 'found:', matches.length);
      if (matches.length > 0) {
        let customerName = matches[0][1].trim();
        if (!customerName.includes('พี.เค.เทคนิค') && customerName.length > 3) {
          data.customerName = `บริษัท ${customerName} จำกัด`;
          console.log(`✅ FOUND CUSTOMER NAME: ${data.customerName}`);
          break;
        }
      }
    }

    // EXTRACT DATE
    console.log('🔍 EXTRACTING DATE...');
    const datePatterns = [
      /วันที่\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/gi,
      /Date\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/gi,
      /(\d{2}\/\d{2}\/\d{2})/g
    ];
    
    for (let i = 0; i < datePatterns.length; i++) {
      const pattern = datePatterns[i];
      const matches = [...cleanText.matchAll(pattern)];
      console.log(`📅 Date pattern ${i + 1}:`, pattern, 'found:', matches.length);
      if (matches.length > 0) {
        data.date = matches[0][1] || matches[0][0];
        console.log(`✅ FOUND DATE: ${data.date}`);
        break;
      }
    }

    // EXTRACT TOTAL AMOUNT - ULTIMATE DEBUG
    console.log('🔍 EXTRACTING TOTAL AMOUNT...');
    const totalPatterns = [
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*จํานวนเงินรวมทั้งสิ้น/gi,
      /จํานวนเงินรวมทั้งสิ้น\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /\(ห้าพัน[^)]+\)[^0-9]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*Net\s+Amount/gi,
      /(\d{1,3}(?:,\d{3})*\.\d{2})/g
    ];
    
    let foundAmounts = [];
    for (let i = 0; i < totalPatterns.length; i++) {
      const pattern = totalPatterns[i];
      const matches = [...cleanText.matchAll(pattern)];
      console.log(`💰 Total pattern ${i + 1}:`, pattern, 'found:', matches.length);
      for (const match of matches) {
        const amountStr = match[1];
        const amount = parseFloat(amountStr.replace(/,/g, ''));
        if (amount > 100) {
          const context = cleanText.substr(Math.max(0, match.index - 100), 200);
          foundAmounts.push({
            amount,
            original: amountStr,
            priority: i,
            context: context.trim()
          });
          console.log(`💰 Found amount: ${amountStr} (${amount}) in context: "${context.trim().substring(0, 50)}..."`);
        }
      }
    }
    
    foundAmounts.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.amount - a.amount;
    });
    
    if (foundAmounts.length > 0) {
      data.total = foundAmounts[0].amount;
      console.log(`✅ SELECTED TOTAL: ${foundAmounts[0].original} (${foundAmounts[0].amount})`);
    } else {
      console.log('❌ NO TOTAL AMOUNT FOUND');
    }

    // EXTRACT SUBTOTAL
    console.log('🔍 EXTRACTING SUBTOTAL...');
    const subtotalMatch = cleanText.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*รวมเป็นเงิน/gi);
    if (subtotalMatch) {
      data.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));
      console.log(`✅ FOUND SUBTOTAL: ${data.subtotal}`);
    } else {
      console.log('❌ NO SUBTOTAL FOUND');
    }

    // EXTRACT VAT
    console.log('🔍 EXTRACTING VAT...');
    const vatMatch = cleanText.match(/(\d+\.?\d*)\s*%\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*จํานวนภาษี/gi);
    if (vatMatch) {
      data.vatPercent = parseFloat(vatMatch[1]);
      data.vatAmount = parseFloat(vatMatch[2].replace(/,/g, ''));
      console.log(`✅ FOUND VAT: ${data.vatPercent}% = ${data.vatAmount}`);
    } else {
      console.log('❌ NO VAT FOUND');
    }

    // EXTRACT DISCOUNT
    data.discount = 0; // Default
    console.log(`✅ DISCOUNT: ${data.discount} (default)`);

    // EXTRACT LINE ITEMS - ULTIMATE DEBUG
    console.log('🔍 EXTRACTING LINE ITEMS...');
    data.items = ultimateDebugExtractLineItems(cleanText);

    // CREATE SUMMARY
    data.summary = {
      subtotal: data.subtotal,
      discount: data.discount,
      netBeforeVat: data.subtotal - (data.discount || 0),
      vatPercent: data.vatPercent,
      vatAmount: data.vatAmount,
      grandTotal: data.total,
      itemCount: data.items.length,
      itemsWithRemarks: data.items.filter(item => item.hasRemarks).length,
      totalRemarksCount: data.items.reduce((sum, item) => sum + (item.remarkCount || 0), 0),
      totalItemsValue: data.items.reduce((sum, item) => sum + item.amount, 0)
    };

    // FINAL DEBUG LOG
    console.log('🎯🎯🎯 ULTIMATE DEBUG FINAL RESULTS 🎯🎯🎯');
    console.log('Type:', data.type);
    console.log('Quotation Number:', data.quotationNumber);
    console.log('Customer Name:', data.customerName);
    console.log('Customer Code:', data.customerCode);
    console.log('Date:', data.date);
    console.log('Total:', data.total);
    console.log('Subtotal:', data.subtotal);
    console.log('VAT Amount:', data.vatAmount);
    console.log('Items Count:', data.items.length);
    console.log('Summary:', data.summary);
    console.log('🚀🚀🚀 ULTIMATE DEBUG PARSING END 🚀🚀🚀');
    
    return data;

  } catch (error) {
    console.error('❌ ULTIMATE DEBUG parsing error:', error);
    return data;
  }
}

// ULTIMATE DEBUG LINE ITEMS EXTRACTION
function ultimateDebugExtractLineItems(cleanText) {
  console.log('📋📋📋 ULTIMATE DEBUG LINE ITEMS START 📋📋📋');
  
  const items = [];
  
  try {
    // Find item patterns with ULTIMATE DEBUG
    const itemPatterns = [
      // Pattern 1: Standard format
      /(\d+)\s*([^0-9]+?)\s+(\d+\.?\d*)\s+(ห่อ|ตัว|อัน|หลอด|ม้วน|แผ่น|เมตร|ชิ้น)\s+(\d+\.?\d*)\s+(\d{1,3}(?:,\d{3})*\.?\d*)/g,
      
      // Pattern 2: Flexible format
      /(\d+)[^0-9]*([ก-ฮa-zA-Z][^0-9]{10,80}?)\s+(\d+\.?\d*)\s+(ห่อ|ตัว|อัน|หลอด|ม้วน)\s+(\d+\.?\d*)\s+(\d{1,3}(?:,\d{3})*\.?\d*)/g,
      
      // Pattern 3: Very loose format
      /(\d+)[^ก-ฮa-zA-Z]*([ก-ฮa-zA-Z].{5,100}?)\s+(\d+\.?\d*)\s+(\w+)\s+(\d+\.?\d*)\s+(\d{1,3}(?:,\d{3})*\.?\d*)/g
    ];
    
    for (let patternIndex = 0; patternIndex < itemPatterns.length; patternIndex++) {
      const pattern = itemPatterns[patternIndex];
      const matches = [...cleanText.matchAll(pattern)];
      
      console.log(`📋 Line items pattern ${patternIndex + 1}: Found ${matches.length} matches`);
      
      for (const match of matches) {
        try {
          const [fullMatch, lineNo, description, qty, unit, unitPrice, amount] = match;
          
          console.log(`🔍 Processing match: [${lineNo}] "${description.substring(0, 30)}..." ${qty} ${unit} × ${unitPrice} = ${amount}`);
          
          // Clean description
          let cleanDesc = description
            .replace(/^\s*/, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Filter invalid items
          const invalidKeywords = ['รวมเป็นเงิน', 'หัก', 'ภาษี', 'รวมทั้งสิ้น', 'Subtotal', 'VAT', 'Net Amount'];
          const isInvalid = invalidKeywords.some(keyword => cleanDesc.includes(keyword));
          
          if (isInvalid || cleanDesc.length < 5) {
            console.log(`❌ Rejected item: "${cleanDesc}" (invalid)`);
            continue;
          }
          
          const parsedQty = parseFloat(qty);
          const parsedUnitPrice = parseFloat(unitPrice);
          const parsedAmount = parseFloat(amount.replace(/,/g, ''));
          
          if (parsedQty > 0 && parsedUnitPrice > 0 && parsedAmount > 0) {
            const item = {
              lineNumber: parseInt(lineNo),
              description: cleanDesc,
              fullDescription: cleanDesc,
              quantity: parsedQty,
              unit: unit,
              unitPrice: parsedUnitPrice,
              amount: parsedAmount,
              calculatedAmount: parsedQty * parsedUnitPrice,
              remarks: [],
              hasRemarks: false,
              remarkCount: 0,
              extractionMethod: `ultimate_debug_pattern_${patternIndex + 1}`
            };
            
            // Check for duplicates
            const isDuplicate = items.some(existing => 
              existing.lineNumber === item.lineNumber || 
              (existing.description === item.description && existing.amount === item.amount)
            );
            
            if (!isDuplicate) {
              items.push(item);
              console.log(`✅ Added item ${item.lineNumber}: ${item.description} (${item.quantity} ${item.unit} × ${item.unitPrice} = ${item.amount})`);
            } else {
              console.log(`❌ Rejected duplicate item: ${item.lineNumber}`);
            }
          } else {
            console.log(`❌ Rejected item with invalid numbers: qty=${parsedQty}, price=${parsedUnitPrice}, amount=${parsedAmount}`);
          }
        } catch (itemError) {
          console.log(`⚠️ Error processing item: ${itemError.message}`);
        }
      }
      
      if (items.length > 0) {
        console.log(`✅ Successfully extracted ${items.length} items using pattern ${patternIndex + 1}`);
        break;
      }
    }
    
    // Sort by line number
    items.sort((a, b) => a.lineNumber - b.lineNumber);
    
    console.log(`📋 ULTIMATE DEBUG line items extraction complete: ${items.length} items found`);
    items.forEach((item, index) => {
      console.log(`  ${index + 1}. [${item.lineNumber}] ${item.description} - ${item.quantity} ${item.unit} × ${item.unitPrice} = ${item.amount}`);
    });
    console.log('📋📋📋 ULTIMATE DEBUG LINE ITEMS END 📋📋📋');
    
    return items;
    
  } catch (error) {
    console.error('❌ ULTIMATE DEBUG line items extraction error:', error);
    return [];
  }
}

async function saveUploadRecord(file, extractedText, parsedData) {
  try {
    const query = `
      INSERT INTO file_attachments (
        entity_type,
        entity_id,
        original_filename,
        stored_filename,
        file_path,
        file_size,
        mime_type,
        uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      'pdf_upload',
      0, // No specific entity ID for now
      file.originalname,
      file.filename,
      file.path,
      file.size,
      file.mimetype,
      1 // Default user ID
    ];

    const result = await pool.query(query, values);
    
    // Also log the processing
    await logSystemActivity('pdf_upload_ultimate_debug_v5', {
      file: file.filename,
      originalName: file.originalname,
      parsedType: parsedData.type,
      documentNumber: parsedData.quotationNumber,
      customerName: parsedData.customerName,
      customerCode: parsedData.customerCode,
      totalAmount: parsedData.total,
      subtotal: parsedData.subtotal,
      vatAmount: parsedData.vatAmount,
      itemCount: parsedData.items.length,
      itemsWithRemarks: parsedData.summary.itemsWithRemarks,
      totalRemarksCount: parsedData.summary.totalRemarksCount,
      textLength: extractedText.length,
      parsingVersion: 'ultimate_debug_v5'
    });

    console.log('✅ ULTIMATE DEBUG upload record saved:', result.rows[0].attachment_id);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Database save error:', error);
    throw error;
  }
}

async function sendToN8N(file, extractedText, parsedData) {
  try {
    const n8nWebhookUrl = 'https://n8npkapp.pktechnic.com/webhook-test/uploadPdf';
    
    const payload = {
      fileName: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      extractedText: extractedText,
      fullText: extractedText, // Full text for N8N processing
      parsedData: parsedData,
      documentType: parsedData.type,
      documentNumber: parsedData.quotationNumber,
      customerName: parsedData.customerName,
      customerCode: parsedData.customerCode,
      totalAmount: parsedData.total,
      subtotal: parsedData.subtotal,
      vatAmount: parsedData.vatAmount,
      vatPercent: parsedData.vatPercent,
      discount: parsedData.discount,
      itemCount: parsedData.items.length,
      itemsWithRemarks: parsedData.summary.itemsWithRemarks,
      totalRemarksCount: parsedData.summary.totalRemarksCount,
      items: parsedData.items, // Include line items with remarks
      summary: parsedData.summary, // Include summary
      documentDate: parsedData.date,
      source: 'pk-crm-pdf-upload-ultimate-debug-v5',
      webhookUrl: n8nWebhookUrl,
      timestamp: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      parsingVersion: 'ultimate_debug_v5'
    };

    console.log('🔗 Sending ULTIMATE DEBUG data to N8N:', n8nWebhookUrl);
    console.log('📊 ULTIMATE DEBUG Payload summary:', {
      documentType: payload.documentType,
      documentNumber: payload.documentNumber,
      totalAmount: payload.totalAmount,
      subtotal: payload.subtotal,
      vatAmount: payload.vatAmount,
      itemCount: payload.itemCount,
      itemsWithRemarks: payload.itemsWithRemarks,
      totalRemarksCount: payload.totalRemarksCount
    });

    const response = await axios.post(n8nWebhookUrl, payload, {
      timeout: 15000, // เพิ่ม timeout เพราะ payload ใหญ่ขึ้น
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ ULTIMATE DEBUG N8N webhook successful:', response.status);
    return response.data;
  } catch (error) {
    console.error('❌ N8N webhook failed:', error.response?.status, error.message);
    throw error;
  }
}

async function logSystemActivity(action, details) {
  try {
    const query = `
      INSERT INTO system_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        new_values,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const values = [
      1, // Default user ID
      action,
      'pdf_upload',
      0,
      JSON.stringify(details),
      new Date()
    ];

    await pool.query(query, values);
  } catch (error) {
    console.error('❌ Logging error:', error);
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 PK CRM ULTIMATE DEBUG PDF Upload Server running on port', PORT);
  console.log('📄 Local: http://localhost:' + PORT);
  console.log('🌐 Public: https://pkcrm.pktechnic.com');
  console.log('🔍 Health: http://localhost:' + PORT + '/health');
  console.log('📊 API: http://localhost:' + PORT + '/api/files');
  console.log('🔗 N8N Webhook: https://n8npkapp.pktechnic.com/webhook-test/uploadPdf');
  console.log('✨ Features: ULTIMATE DEBUG, Full Console Logging, Specific Pattern Matching, Enhanced PDF Parser v5, File Management, N8N Integration');
  console.log('🔧 Parser Version: ULTIMATE DEBUG v5 with Full Logging and Pattern Analysis');
  console.log('🚨 Special Features: Step-by-step debugging, Pattern match analysis, Context extraction');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Server shutting down gracefully...');
  pool.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Server shutting down gracefully...');
  pool.end();
  process.exit(0);
});
