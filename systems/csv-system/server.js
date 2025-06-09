// PK CRM - Enhanced Server.js for CSV Processing v2.1
// วางไฟล์นี้ที่: ~/pk-crm/systems/csv-system/server.js

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { Pool } = require('pg');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3005;

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
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Enhanced logging
const logInfo = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const logError = (message, error = null) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`, error ? error.message : '');
};

// Multer configuration for CSV files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fsSync.existsSync(uploadDir)) {
      fsSync.mkdirSync(uploadDir, { recursive: true });
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
    this.debugMode = process.env.DEBUG_MODE === 'true';
    this.encoding = process.env.CSV_ENCODING || 'windows-874';
  }

  async parseCSVFile(filePath) {
    try {
      logInfo(`Starting CSV parsing for file: ${filePath}`);
      
      const fileBuffer = await fs.readFile(filePath);
      const csvText = new TextDecoder(this.encoding).decode(fileBuffer);

      if (this.debugMode) {
        logInfo('CSV Parsing Debug', {
          filePath,
          contentLength: csvText.length,
          encoding: this.encoding,
          firstLines: csvText.split('\n').slice(0, 3)
        });
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

      logInfo('CSV parsing completed successfully', { documentType });
      
      return {
        success: true,
        documentType,
        data: result,
        metadata: {
          encoding: this.encoding,
          linesProcessed: lines.length,
          parsedAt: new Date().toISOString(),
          version: 'pk-csv-parser-v2.1'
        }
      };

    } catch (error) {
      logError('CSV Parsing Failed', error);
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
    const text = lines.join(' ').toLowerCase();
    
    if (text.includes('ใบสั่งขาย') || text.includes('sales order') || text.includes('so6')) {
      return 'sales_order';
    }
    
    if (text.includes('ใบเสนอราคา') || text.includes('quotation') || text.includes('qt6')) {
      return 'quotation';
    }
    
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
      
      // Sales Order number
      if (line.includes('เลขที่ใบสั่งขาย') || line.includes('SO')) {
        const soMatch = line.match(/SO(\d+)/i);
        if (soMatch) result.document_info.sales_order_number = 'SO' + soMatch[1];
      }
      
      // Customer information
      if (line.includes('ลูกค้า') && line.includes('CU')) {
        const custMatch = line.match(/ลูกค้า\s+([A-Z0-9]+)/);
        if (custMatch) result.customer_info.customer_code = custMatch[1];
      }
      
      if (line.includes('บริษัท') && !line.includes('พี.เค.เทคนิค')) {
        result.customer_info.company_name = line.replace(/"/g, '').trim();
      }
      
      // Date extraction
      if (line.includes('วันที่') && line.match(/\d{2}\/\d{2}\/\d{2}/)) {
        const dates = line.match(/\d{2}\/\d{2}\/\d{2}/g);
        if (dates) {
          result.document_info.date = dates[0];
          if (line.includes('ส่งของ') && dates[1]) {
            result.document_info.delivery_date = dates[1];
          }
        }
      }
      
      // Sales person information
      if (line.includes('พนักงานขาย') && line.includes('-')) {
        const salesMatch = line.match(/(\d+)-(.+?)(?:\s|"|$)/);
        if (salesMatch) {
          result.sales_info.salesperson_code = salesMatch[1];
          result.sales_info.salesperson = salesMatch[2].trim();
        }
      }
      
      // PO Reference
      if (line.includes('PO') || line.includes('ใบสั่งซื้อ')) {
        const poMatch = line.match(/PO[:\s]*([A-Z0-9]+)/i);
        if (poMatch) result.sales_info.po_reference = poMatch[1];
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
      financial_summary: {},
      validity_info: {}
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Quotation number
      if (line.includes('เลขที่ใบเสนอราคา') || line.includes('QT')) {
        const qtMatch = line.match(/QT(\d+)/i);
        if (qtMatch) result.document_info.quotation_number = 'QT' + qtMatch[1];
      }
      
      // Date extraction
      if (line.includes('วันที่') && line.match(/\d{2}\/\d{2}\/\d{2}/)) {
        const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{2})/);
        if (dateMatch) result.document_info.date = dateMatch[1];
      }
      
      // Validity period
      if (line.includes('ยืนราคา') || line.includes('valid')) {
        const validMatch = line.match(/(\d+)\s*วัน/);
        if (validMatch) result.validity_info.validity_days = parseInt(validMatch[1]);
        
        const dateMatch = line.match(/ถึง.*?(\d{2}\/\d{2}\/\d{2})/);
        if (dateMatch) result.validity_info.valid_until = dateMatch[1];
      }
      
      // Customer information
      if (line.includes('ลูกค้า') && line.includes('CU')) {
        const custMatch = line.match(/ลูกค้า\s+([A-Z0-9]+)/);
        if (custMatch) result.customer_info.customer_code = custMatch[1];
      }
      
      if (line.includes('บริษัท') && !line.includes('พี.เค.เทคนิค')) {
        result.customer_info.company_name = line.replace(/"/g, '').trim();
      }
      
      // Sales person
      if (line.includes('พนักงานขาย')) {
        const salesMatch = line.match(/พนักงานขาย[:\s]*(.+?)(?:\s|"|$)/);
        if (salesMatch) result.sales_info.salesperson = salesMatch[1].trim();
      }
      
      this.extractFinancialData(line, result.financial_summary);
    }
    
    return result;
  }

  extractFinancialData(line, summary) {
    // Subtotal
    if (line.includes('รวมเป็นเงิน') && !line.includes('หมายเหตุ')) {
      const amount = this.extractAmount(line);
      if (amount) summary.subtotal = amount;
    }
    
    // Grand total
    if (line.includes('รวมทั้งสิ้น')) {
      const amount = this.extractAmount(line);
      if (amount) summary.grand_total = amount;
    }
    
    // VAT
    if (line.includes('ภาษีมูลค่าเพิ่ม') || line.includes('VAT')) {
      const vatMatch = line.match(/(\d+\.?\d*)%.*?([\d,]+\.?\d*)/);
      if (vatMatch) {
        summary.vat_rate = parseFloat(vatMatch[1]);
        summary.vat_amount = parseFloat(vatMatch[2].replace(/,/g, ''));
      }
    }
    
    // Profit margin (for sales orders)
    if (line.includes('กำไร') && line.includes('%')) {
      const profitMatch = line.match(/([\d.]+)%/);
      if (profitMatch) summary.profit_margin = parseFloat(profitMatch[1]);
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

app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const dbResult = await pool.query('SELECT NOW()');
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'PK CRM CSV Processor',
      version: '2.1',
      port: PORT,
      database: dbResult.rows[0] ? 'Connected' : 'Disconnected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/files', async (req, res) => {
  try {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    
    if (!fsSync.existsSync(uploadDir)) {
      return res.json([]);
    }
    
    const fileNames = await fs.readdir(uploadDir);
    const files = await Promise.all(fileNames.map(async (file) => {
      const filePath = path.join(uploadDir, file);
      const stats = await fs.stat(filePath);
      return {
        fileName: file,
        size: stats.size,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime
      };
    }));
    
    // Sort by creation date (newest first)
    files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(files);
  } catch (error) {
    logError('Failed to list files', error);
    res.status(500).json({ error: 'ไม่สามารถดึงรายการไฟล์ได้' });
  }
});

// Cleanup old files endpoint
app.post('/cleanup', async (req, res) => {
  try {
    logInfo('Manual cleanup requested');
    
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const logsDir = './logs';
    let totalCleaned = 0;
    let message = '';
    
    // Clean upload files older than 1 hour (for demo purposes)
    if (fsSync.existsSync(uploadDir)) {
      const uploadFiles = fsSync.readdirSync(uploadDir);
      const now = Date.now();
      let uploadCleaned = 0;
      
      uploadFiles.forEach(file => {
        const filePath = path.join(uploadDir, file);
        try {
          const stats = fsSync.statSync(filePath);
          // Delete files older than 1 hour (3600000 ms)
          if (now - stats.mtimeMs > 3600000) {
            fsSync.unlinkSync(filePath);
            uploadCleaned++;
          }
        } catch (e) {
          // ignore error for individual files
        }
      });
      
      totalCleaned += uploadCleaned;
      if (uploadCleaned > 0) {
        message += `ลบไฟล์อัปโหลดเก่า ${uploadCleaned} ไฟล์ `;
      }
    }
    
    // Clean log files older than 7 days
    if (fsSync.existsSync(logsDir)) {
      const logFiles = fsSync.readdirSync(logsDir);
      const now = Date.now();
      let logCleaned = 0;
      
      logFiles.forEach(file => {
        if (file.endsWith('.log')) {
          const filePath = path.join(logsDir, file);
          try {
            const stats = fsSync.statSync(filePath);
            // Delete log files older than 7 days
            if (now - stats.mtimeMs > 7 * 24 * 60 * 60 * 1000) {
              fsSync.unlinkSync(filePath);
              logCleaned++;
            }
          } catch (e) {
            // ignore error for individual files
          }
        }
      });
      
      totalCleaned += logCleaned;
      if (logCleaned > 0) {
        message += `ลบไฟล์ log เก่า ${logCleaned} ไฟล์ `;
      }
    }
    
    if (totalCleaned === 0) {
      message = 'ไม่มีไฟล์เก่าให้ลบ';
    } else {
      message = message.trim();
    }
    
    logInfo('Manual cleanup completed', { totalCleaned, message });
    
    res.json({
      success: true,
      message: message,
      filesDeleted: totalCleaned,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logError('Manual cleanup failed', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบข้อมูล: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Main upload endpoint
app.post('/upload', upload.single('csvFile'), async (req, res) => {
  const startTime = Date.now();
  
  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      error: 'No file uploaded',
      timestamp: new Date().toISOString()
    });
  }

  // Clean old files before processing
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  deleteOldFiles(uploadDir);

  try {
    logInfo(`Processing CSV upload: ${req.file.originalname}`, {
      fileName: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    const parser = new PKCSVParser();
    const parseResult = await parser.parseCSVFile(req.file.path);

    if (!parseResult.success) {
      // Delete failed file
      await fs.unlink(req.file.path);
      logError('CSV parsing failed', { error: parseResult.error });
      
      return res.status(400).json({
        success: false,
        error: `ไม่สามารถประมวลผลไฟล์ CSV ได้: ${parseResult.error}`,
        timestamp: new Date().toISOString()
      });
    }

    logInfo('CSV parsed successfully', { 
      documentType: parseResult.documentType,
      linesProcessed: parseResult.metadata.linesProcessed 
    });

    // Send to N8N webhook
    const webhookResult = await sendToN8N(parseResult, req.file);
    logInfo('N8N webhook completed', { success: webhookResult.success });

    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      message: 'ประมวลผลไฟล์ CSV สำเร็จ',
      processingTime: `${processingTime}ms`,
      file: {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        size: req.file.size,
        path: req.file.path
      },
      parsing: parseResult,
      webhook: webhookResult,
      summary: generateSummary(parseResult.data),
      timestamp: new Date().toISOString()
    };

    // Delete processed file
    await fs.unlink(req.file.path);
    logInfo('File processed and cleaned up', { fileName: req.file.originalname, processingTime });

    res.json(response);

  } catch (error) {
    // Cleanup on error
    if (req.file && fsSync.existsSync(req.file.path)) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logError('Failed to delete file after error', unlinkError);
      }
    }

    logError('Upload processing failed', error);

    res.status(500).json({
      success: false,
      error: `เกิดข้อผิดพลาดในการประมวลผลไฟล์: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Send to N8N webhook
async function sendToN8N(parseResult, fileInfo) {
  try {
    const payload = {
      fileName: fileInfo.filename,
      originalName: fileInfo.originalname,
      filePath: fileInfo.path,
      fileSize: fileInfo.size,
      documentType: parseResult.documentType,
      parsedData: parseResult.data,
      metadata: parseResult.metadata,
      source: 'pk-crm-csv-upload-v2.1',
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(N8N_WEBHOOK_URL, payload, {
      timeout: 15000,
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'PK-CRM-CSV-Processor/2.1'
      }
    });

    return { 
      success: true, 
      statusCode: response.status, 
      webhookUrl: N8N_WEBHOOK_URL 
    };
  } catch (error) {
    logError('N8N webhook failed', error);
    return { 
      success: false, 
      error: error.message, 
      webhookUrl: N8N_WEBHOOK_URL 
    };
  }
}

function generateSummary(data) {
  return {
    documentType: data.document_info?.document_type,
    documentNumber: data.document_info?.quotation_number || data.document_info?.sales_order_number,
    customerCode: data.customer_info?.customer_code,
    customerName: data.customer_info?.company_name,
    salesperson: data.sales_info?.salesperson,
    grandTotal: data.financial_summary?.grand_total,
    itemCount: data.line_items?.length || 0,
    date: data.document_info?.date,
    deliveryDate: data.document_info?.delivery_date,
    validityDays: data.validity_info?.validity_days,
    profitMargin: data.financial_summary?.profit_margin
  };
}

// Clean old files
function deleteOldFiles(uploadDir, maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    if (!fsSync.existsSync(uploadDir)) return;
    
    const files = fsSync.readdirSync(uploadDir);
    const now = Date.now();
    let deletedCount = 0;
    
    files.forEach(file => {
      const filePath = path.join(uploadDir, file);
      try {
        const stats = fsSync.statSync(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fsSync.unlinkSync(filePath);
          deletedCount++;
          logInfo(`Deleted old file: ${file}`);
        }
      } catch (e) {
        // ignore error
      }
    });
    
    if (deletedCount > 0) {
      logInfo(`Cleanup completed: ${deletedCount} files deleted`);
    }
  } catch (error) {
    logError('File cleanup failed', error);
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  logError('Server Error', error);
  res.status(500).json({ 
    success: false, 
    error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
    timestamp: new Date().toISOString()
  });
});

// Database connection test
pool.connect((err, client, release) => {
  if (err) {
    logError('Error acquiring database client', err);
  } else {
    logInfo('🐘 Database connected successfully');
    client.release();
  }
});

// Start server
app.listen(PORT, () => {
  logInfo(`🚀 PK CRM CSV Processor v2.1 running on port ${PORT}`);
  logInfo(`📊 Dashboard: http://localhost:${PORT}`);
  logInfo(`🔗 N8N Webhook: ${N8N_WEBHOOK_URL}`);
});

module.exports = app;