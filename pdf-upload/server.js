const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://pkt_upload:upload123@localhost:5434/pk_crm_db'
});

const app = express();
const PORT = 3003; // ใช้ port 3003 เพื่อไม่ชนกับระบบเดิม

// Database configuration

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
    message: 'PK CRM PDF Upload Server is running',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Main upload page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

    // Basic PDF parsing (can be enhanced)
    const parsedData = await parsePDFContent(extractedText);

    // Save upload record to database
    const uploadRecord = await saveUploadRecord(req.file, extractedText, parsedData);

    // Send to N8N for processing (if available)
    try {
      await sendToN8N(req.file, extractedText, parsedData);
    } catch (n8nError) {
      console.error('N8N processing failed:', n8nError.message);
      // Continue even if N8N fails
    }

    res.json({
      success: true,
      message: 'PDF uploaded and processed successfully',
      data: {
        fileId: uploadRecord.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        extractedText: extractedText.substring(0, 500) + '...', // First 500 chars
        parsedData: parsedData,
        uploadTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
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
    console.error('Database error:', error);
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
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upload details',
      error: error.message
    });
  }
});

// Helper Functions

async function parsePDFContent(text) {
  const data = {
    type: 'unknown',
    quotationNumber: null,
    customerName: null,
    date: null,
    total: null,
    items: [],
    rawText: text
  };

  try {
    // Detect document type
    if (text.includes('ใบเสนอราคา') || text.includes('QUOTATION')) {
      data.type = 'quotation';
      
      // Extract quotation number
      const quoteMatch = text.match(/เลขที[\s]*[:]*[\s]*([A-Z0-9\-\/]+)/i);
      if (quoteMatch) data.quotationNumber = quoteMatch[1].trim();
      
      // Extract customer name
      const customerMatch = text.match(/บริษัท[\s]+([^\n\r]+)/i) || 
                           text.match(/ลูกค้า[\s]*[:]*[\s]*([^\n\r]+)/i);
      if (customerMatch) data.customerName = customerMatch[1].trim();
      
      // Extract date
      const dateMatch = text.match(/วันที[\s]*[:]*[\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      if (dateMatch) data.date = dateMatch[1];
      
      // Extract total amount
      const totalMatch = text.match(/รวมทั้งสิ้น[\s]*[:]*[\s]*([\d,]+\.?\d*)/i) ||
                        text.match(/ยอดรวม[\s]*[:]*[\s]*([\d,]+\.?\d*)/i);
      if (totalMatch) {
        data.total = parseFloat(totalMatch[1].replace(/,/g, ''));
      }
    }
    
    else if (text.includes('ใบสั่งขาย') || text.includes('SALES ORDER')) {
      data.type = 'sales_order';
      
      // Extract SO number
      const soMatch = text.match(/SO[\s]*[:]*[\s]*([A-Z0-9\-\/]+)/i);
      if (soMatch) data.quotationNumber = soMatch[1].trim();
    }

    console.log('📊 Parsed data:', data);
    return data;

  } catch (error) {
    console.error('PDF parsing error:', error);
    return data;
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
    await logSystemActivity('pdf_upload', {
      file: file.filename,
      parsedType: parsedData.type,
      textLength: extractedText.length,
      quotationNumber: parsedData.quotationNumber
    });

    return result.rows[0];
  } catch (error) {
    console.error('Database save error:', error);
    throw error;
  }
}

async function sendToN8N(file, extractedText, parsedData) {
  try {
    const n8nWebhookUrl = 'https://n8npkapp.pktechnic.com/webhook-test/pdfupload';
    
    const payload = {
      fileName: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      extractedText: extractedText,
      parsedData: parsedData,
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(n8nWebhookUrl, payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ N8N processing initiated:', response.status);
    return response.data;
  } catch (error) {
    console.error('❌ N8N webhook failed:', error.message);
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
      'file_upload',
      0,
      JSON.stringify(details),
      new Date()
    ];

    await pool.query(query, values);
  } catch (error) {
    console.error('Logging error:', error);
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
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
  console.log(`🚀 PK CRM PDF Upload Server running on port ${PORT}`);
  console.log(`📄 Upload page: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Upload history: http://localhost:${PORT}/uploads`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Server shutting down...');
  pool.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Server shutting down...');
  pool.end();
  process.exit(0);
});
