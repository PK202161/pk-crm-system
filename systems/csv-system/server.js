// PK CRM - Enhanced Server.js for CSV Processing
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3004;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'pkt_upload',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pk_crm_db',
  password: process.env.DB_PASSWORD || 'upload123',
  port: process.env.DB_PORT || 5434,
});

// N8N Webhook URL
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8npkapp.pktechnic.com/webhook-test/uploadCsv';

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.static('public'));
app.use(express.json());

// Multer configuration for CSV files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    cb(null, `csv-${timestamp}-${random}.csv`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' ||
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('กรุณาอัปโหลดไฟล์ CSV เท่านั้น'));
    }
  },
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024
  }
});

// Enhanced CSV Parser Class
class PKCSVParser {
  constructor() {
    this.debugMode = true;
    this.encoding = 'windows-874';
  }

  async parseCSVFile(filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const csvText = new TextDecoder(this.encoding).decode(fileBuffer);

      if (this.debugMode) {
        console.log('=== CSV PARSING DEBUG ===');
        console.log('File path:', filePath);
        console.log('Content length:', csvText.length);
      }

      const lines = this.cleanAndSplitLines(csvText);
      const documentType = this.detectDocumentType(lines);

      let result;
      if (documentType === 'quotation') {
        result = this.parseQuotation(lines);
      } else if (documentType === 'sales_order') {
        result = this.parseSalesOrder(lines);
      } else {
        throw new Error('ไม่สามารถระบุประเภทเอกสารได้');
      }

      return {
        success: true,
        documentType,
        data: result,
        parsedAt: new Date().toISOString(),
        version: 'pk-csv-parser-v2.0'
      };

    } catch (error) {
      console.error('CSV Parsing Error:', error);
      return {
        success: false,
        error: error.message,
        parsedAt: new Date().toISOString()
      };
    }
  }

  cleanAndSplitLines(text) {
    return text.split('\n')
      .map(line => line.replace(/^"|"$/g, '').replace(/\r/g, '').trim())
      .filter(line => line.length > 0);
  }

  detectDocumentType(lines) {
    const text = lines.join(' ');
    if (text.includes('ใบสั่งขาย') || text.includes('SO')) return 'sales_order';
    if (text.includes('ใบเสนอราคา') || text.includes('QT')) return 'quotation';
    return 'unknown';
  }

  parseSalesOrder(lines) {
    const result = {
      document_info: { document_type: 'sales_order' },
      customer_info: {},
      sales_info: {},
      line_items: [],
      financial_summary: {}
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('เลขที่ใบสั่งขาย')) {
        const soMatch = line.match(/SO(\d+)/);
        if (soMatch) result.document_info.sales_order_number = 'SO' + soMatch[1];
      }
      if (line.includes('ลูกค้า') && line.includes('CU')) {
        const custMatch = line.match(/ลูกค้า\s+([A-Z0-9]+)/);
        if (custMatch) result.customer_info.customer_code = custMatch[1];
      }
      if (line.includes('บริษัท') && !line.includes('พี.เค.เทคนิค')) {
        result.customer_info.company_name = line.replace(/"/g, '').trim();
      }
      if (line.includes('วันที่') && line.match(/\d{2}\/\d{2}\/\d{2}/)) {
        const dates = line.match(/\d{2}\/\d{2}\/\d{2}/g);
        if (dates) {
          if (line.includes('ส่งของ')) {
            result.document_info.delivery_date = dates[0];
          } else {
            result.document_info.date = dates[0];
          }
        }
      }
      if (line.includes('พนักงานขาย') && line.includes('-')) {
        const salesMatch = line.match(/(\d+)-(.+?)(?:\s|"|$)/);
        if (salesMatch) {
          result.sales_info.salesperson_code = salesMatch[1];
          result.sales_info.salesperson = salesMatch[2].trim();
        }
      }
      this.extractFinancialData(line, result.financial_summary);
    }
    return result;
  }

  parseQuotation(lines) {
    const result = {
      document_info: { document_type: 'quotation' },
      customer_info: {},
      sales_info: {},
      line_items: [],
      financial_summary: {}
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('เลขที่ใบเสนอราคา')) {
        const qtMatch = line.match(/QT(\d+)/);
        if (qtMatch) result.document_info.quotation_number = 'QT' + qtMatch[1];
      }
      if (line.includes('วันที่') && line.match(/\d{2}\/\d{2}\/\d{2}/)) {
        const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{2})/);
        if (dateMatch) result.document_info.date = dateMatch[1];
      }
      this.extractFinancialData(line, result.financial_summary);
    }
    return result;
  }

  extractFinancialData(line, summary) {
    if (line.includes('รวมเป็นเงิน') && !line.includes('หมายเหตุ')) {
      const amount = this.extractAmount(line);
      if (amount) summary.subtotal = amount;
    }
    if (line.includes('รวมทั้งสิ้น')) {
      const amount = this.extractAmount(line);
      if (amount) summary.grand_total = amount;
    }
    if (line.includes('ภาษีมูลค่าเพิ่ม')) {
      const vatMatch = line.match(/(\d+\.?\d*)%.*?([\d,]+\.?\d*)/);
      if (vatMatch) {
        summary.vat_rate = parseFloat(vatMatch[1]);
        summary.vat_amount = parseFloat(vatMatch[2].replace(/,/g, ''));
      }
    }
  }

  extractAmount(line) {
    const match = line.match(/([\d,]+\.?\d*)\s*"?\s*$/);
    return match ? parseFloat(match[1].replace(/,/g, '')) : null;
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'PK CRM CSV Processor',
    version: '2.0',
    port: PORT
  });
});
app.get('/files', (req, res) => {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  if (!fs.existsSync(uploadDir)) return res.json([]);
  const files = fs.readdirSync(uploadDir).map(file => {
    const filePath = path.join(uploadDir, file);
    const stats = fs.statSync(filePath);
    return {
      fileName: file,
      size: stats.size,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime
    };
  });
  res.json(files);
});

// Main upload endpoint
app.post('/upload', upload.single('csvFile'), async (req, res) => {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  // ลบไฟล์เก่าก่อนประมวลผล
  deleteOldFiles(uploadDir);

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาเลือกไฟล์ CSV'
      });
    }
    console.log(`\n=== Processing CSV File: ${req.file.originalname} ===`);
    const parser = new PKCSVParser();
    const parseResult = await parser.parseCSVFile(req.file.path);
    if (!parseResult.success) {
      // ลบไฟล์ที่อัปโหลดถ้า parse ไม่สำเร็จ
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถประมวลผลไฟล์ CSV ได้: ' + parseResult.error
      });
    }
    console.log('✅ CSV parsed successfully');
    const webhookResult = await sendToN8N(parseResult, req.file);
    console.log('🔗 N8N webhook result:', webhookResult.success ? 'SUCCESS' : 'FAILED');
    const response = {
      success: true,
      message: 'ประมวลผลไฟล์ CSV สำเร็จ',
      file: {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        size: req.file.size,
        path: req.file.path
      },
      parsing: parseResult,
      webhook: webhookResult,
      summary: generateSummary(parseResult.data)
    };
    // ลบไฟล์หลังประมวลผลเสร็จ
    fs.unlinkSync(req.file.path);
    res.json(response);
  } catch (error) {
    // ลบไฟล์ถ้ามี error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการประมวลผลไฟล์: ' + error.message
    });
  }
});

async function sendToN8N(parseResult, fileInfo) {
  try {
    const payload = {
      fileName: fileInfo.filename,
      originalName: fileInfo.originalname,
      filePath: fileInfo.path,
      fileSize: fileInfo.size,
      documentType: parseResult.documentType,
      parsedData: parseResult.data,
      source: 'pk-crm-csv-upload-v2'
    };
    const response = await axios.post(N8N_WEBHOOK_URL, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: true, statusCode: response.status, webhookUrl: N8N_WEBHOOK_URL };
  } catch (error) {
    console.error('N8N webhook error:', error.message);
    return { success: false, error: error.message, webhookUrl: N8N_WEBHOOK_URL };
  }
}

function generateSummary(data) {
  return {
    documentType: data.document_info.document_type,
    documentNumber: data.document_info.quotation_number || data.document_info.sales_order_number,
    customerCode: data.customer_info.customer_code,
    customerName: data.customer_info.company_name,
    salesperson: data.sales_info.salesperson,
    grandTotal: data.financial_summary.grand_total,
  };
}

// เพิ่มฟังก์ชันลบไฟล์เก่ากว่า 1 วัน
function deleteOldFiles(uploadDir, maxAgeMs = 24 * 60 * 60 * 1000) {
  if (!fs.existsSync(uploadDir)) return;
  const files = fs.readdirSync(uploadDir);
  const now = Date.now();
  files.forEach(file => {
    const filePath = path.join(uploadDir, file);
    try {
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted old file: ${file}`);
      }
    } catch (e) {
      // ignore error
    }
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)' });
    }
  }
  res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PK CRM CSV Processor running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
});

module.exports = app;
