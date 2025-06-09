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
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3004;

// Enhanced Rate Limiting
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { success: false, error: 'Too many upload attempts, please try again later.' }
});

// Database connection with retry logic
const pool = new Pool({
  user: process.env.DB_USER || 'pkt_upload',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pk_crm_db',
  password: process.env.DB_PASSWORD || 'upload123',
  port: process.env.DB_PORT || 5434,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// N8N Webhook URL
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8npkapp.pktechnic.com/webhook-test/uploadCsv';

// Enhanced Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.static('public'));
app.use(express.json());

// Apply rate limiting to upload endpoints
app.use('/upload', uploadLimiter);

// Enhanced logging setup
const logDir = './logs';
if (!fsSync.existsSync(logDir)) {
  fsSync.mkdirSync(logDir);
}

// Custom logger function
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level}: ${message}`;
  
  console.log(logMessage, data ? JSON.stringify(data, null, 2) : '');
  
  // Write to file
  const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}.log`);
  const logEntry = `${logMessage}${data ? ' ' + JSON.stringify(data) : ''}\n`;
  fsSync.appendFileSync(logFile, logEntry);
}

// Enhanced Multer configuration
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
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `csv-${timestamp}-${random}-${sanitizedName}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' ||
        file.originalname.toLowerCase().endsWith('.csv') ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('กรุณาอัปโหลดไฟล์ CSV เท่านั้น'));
    }
  },
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    files: 1
  }
});

// Enhanced CSV Parser Class
class PKCSVParser {
  constructor() {
    this.debugMode = process.env.DEBUG_MODE === 'true';
    this.encoding = process.env.CSV_ENCODING || 'windows-874';
    this.supportedEncodings = ['windows-874', 'utf-8', 'iso-8859-1'];
  }

  async parseCSVFile(filePath) {
    try {
      log('INFO', `Starting CSV parsing for file: ${filePath}`);
      
      const fileBuffer = await fs.readFile(filePath);
      let csvText = null;
      let usedEncoding = this.encoding;

      // Try multiple encodings
      for (const encoding of this.supportedEncodings) {
        try {
          csvText = new TextDecoder(encoding).decode(fileBuffer);
          if (csvText && csvText.length > 0 && !csvText.includes('�')) {
            usedEncoding = encoding;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!csvText) {
        throw new Error('ไม่สามารถอ่านไฟล์ CSV ได้ด้วย encoding ที่รองรับ');
      }

      if (this.debugMode) {
        log('DEBUG', 'CSV Parsing Debug Info', {
          filePath,
          contentLength: csvText.length,
          usedEncoding,
          firstLines: csvText.split('\n').slice(0, 5)
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
        throw new Error('ไม่สามารถระบุประเภทเอกสารได้ (ไม่พบใบเสนอราคาหรือใบสั่งขาย)');
      }

      const parseResult = {
        success: true,
        documentType,
        data: result,
        metadata: {
          encoding: usedEncoding,
          linesProcessed: lines.length,
          parsedAt: new Date().toISOString(),
          version: 'pk-csv-parser-v2.1'
        }
      };

      log('INFO', 'CSV parsing completed successfully', { documentType, linesProcessed: lines.length });
      return parseResult;

    } catch (error) {
      log('ERROR', 'CSV Parsing Failed', { error: error.message, filePath });
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
    
    // Enhanced detection patterns
    const salesOrderPatterns = ['ใบสั่งขาย', 'sales order', 'so6', 'so_'];
    const quotationPatterns = ['ใบเสนอราคา', 'quotation', 'qt6', 'qt_'];
    
    for (const pattern of salesOrderPatterns) {
      if (text.includes(pattern)) return 'sales_order';
    }
    
    for (const pattern of quotationPatterns) {
      if (text.includes(pattern)) return 'quotation';
    }
    
    return 'unknown';
  }

  parseSalesOrder(lines) {
    const result = {
      document_info: { document_type: 'sales_order' },
      customer_info: {},
      sales_info: {},
      line_items: [],
      financial_summary: {},
      additional_info: {}
    };

    let inItemsSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Document number extraction
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
          if (line.includes('ส่งของ')) {
            result.document_info.delivery_date = dates[0];
          } else {
            result.document_info.date = dates[0];
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
        if (poMatch) result.additional_info.po_reference = poMatch[1];
      }
      
      // Territory/Zone information
      if (line.includes('เขต') || line.includes('zone')) {
        result.sales_info.territory = line.trim();
      }
      
      this.extractFinancialData(line, result.financial_summary);
      this.extractLineItems(line, result.line_items, inItemsSection);
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
      this.extractLineItems(line, result.line_items);
    }
    
    return result;
  }

  extractFinancialData(line, summary) {
    // Enhanced financial data extraction
    if (line.includes('รวมเป็นเงิน') && !line.includes('หมายเหตุ')) {
      const amount = this.extractAmount(line);
      if (amount) summary.subtotal = amount;
    }
    
    if (line.includes('รวมทั้งสิ้น')) {
      const amount = this.extractAmount(line);
      if (amount) summary.grand_total = amount;
    }
    
    if (line.includes('ภาษีมูลค่าเพิ่ม') || line.includes('VAT')) {
      const vatMatch = line.match(/(\d+\.?\d*)%.*?([\d,]+\.?\d*)/);
      if (vatMatch) {
        summary.vat_rate = parseFloat(vatMatch[1]);
        summary.vat_amount = parseFloat(vatMatch[2].replace(/,/g, ''));
      }
    }
    
    // Profit margin extraction (for sales orders)
    if (line.includes('กำไร') && line.includes('%')) {
      const profitMatch = line.match(/([\d.]+)%/);
      if (profitMatch) summary.profit_margin = parseFloat(profitMatch[1]);
    }
  }

  extractLineItems(line, items) {
    // Enhanced line item extraction
    // Look for patterns like: quantity × unit_price = amount
    const itemPattern = /(\d+\.?\d*)\s*[×x]\s*([\d,]+\.?\d*)\s*=\s*([\d,]+\.?\d*)/;
    const match = line.match(itemPattern);
    
    if (match) {
      items.push({
        line_number: items.length + 1,
        quantity: parseFloat(match[1]),
        unit_price: parseFloat(match[2].replace(/,/g, '')),
        amount: parseFloat(match[3].replace(/,/g, '')),
        description: line.replace(itemPattern, '').trim()
      });
    }
  }

  extractAmount(line) {
    const match = line.match(/([\d,]+\.?\d*)\s*"?\s*$/);
    return match ? parseFloat(match[1].replace(/,/g, '')) : null;
  }
}

// Enhanced Routes
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
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/system-status', async (req, res) => {
  try {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    let files = [];
    
    if (fsSync.existsSync(uploadDir)) {
      const fileNames = await fs.readdir(uploadDir);
      files = await Promise.all(fileNames.map(async (file) => {
        const filePath = path.join(uploadDir, file);
        const stats = await fs.stat(filePath);
        return {
          fileName: file,
          size: stats.size,
          createdAt: stats.birthtime,
          updatedAt: stats.mtime
        };
      }));
    }

    res.json({
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      fileStats: {
        totalFiles: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        oldestFile: files.length > 0 ? Math.min(...files.map(f => new Date(f.createdAt))) : null
      },
      recentFiles: files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    log('ERROR', 'Failed to list files', { error: error.message });
    res.status(500).json({ error: 'ไม่สามารถดึงรายการไฟล์ได้' });
  }
});

// Enhanced upload endpoint
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
    log('INFO', `Processing CSV upload: ${req.file.originalname}`, {
      fileName: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    const parser = new PKCSVParser();
    const parseResult = await parser.parseCSVFile(req.file.path);

    if (!parseResult.success) {
      // Delete failed file
      await fs.unlink(req.file.path);
      log('ERROR', 'CSV parsing failed', { error: parseResult.error, fileName: req.file.originalname });
      
      return res.status(400).json({
        success: false,
        error: `ไม่สามารถประมวลผลไฟล์ CSV ได้: ${parseResult.error}`,
        timestamp: new Date().toISOString()
      });
    }

    log('INFO', 'CSV parsed successfully', { 
      documentType: parseResult.documentType,
      linesProcessed: parseResult.metadata.linesProcessed 
    });

    // Send to N8N webhook
    const webhookResult = await sendToN8N(parseResult, req.file);
    log('INFO', 'N8N webhook completed', { success: webhookResult.success });

    // Save to database (if connected)
    let dbSaveResult = null;
    try {
      dbSaveResult = await saveToDatabase(parseResult, req.file);
    } catch (dbError) {
      log('WARN', 'Database save failed', { error: dbError.message });
    }

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
      database: dbSaveResult,
      summary: generateSummary(parseResult.data),
      timestamp: new Date().toISOString()
    };

    // Delete processed file
    await fs.unlink(req.file.path);
    log('INFO', 'File processed and cleaned up', { fileName: req.file.originalname, processingTime });

    res.json(response);

  } catch (error) {
    // Cleanup on error
    if (req.file && fsSync.existsSync(req.file.path)) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        log('ERROR', 'Failed to delete file after error', { error: unlinkError.message });
      }
    }

    log('ERROR', 'Upload processing failed', { 
      error: error.message, 
      fileName: req.file?.originalname,
      stack: error.stack 
    });

    res.status(500).json({
      success: false,
      error: `เกิดข้อผิดพลาดในการประมวลผลไฟล์: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced N8N webhook function
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
      webhookUrl: N8N_WEBHOOK_URL,
      responseTime: response.headers['response-time'] || 'unknown'
    };
  } catch (error) {
    log('ERROR', 'N8N webhook failed', { error: error.message, url: N8N_WEBHOOK_URL });
    return { 
      success: false, 
      error: error.message, 
      webhookUrl: N8N_WEBHOOK_URL 
    };
  }
}

// Enhanced database save function
async function saveToDatabase(parseResult, fileInfo) {
  try {
    const query = `
      INSERT INTO file_attachments (
        entity_type, entity_id, file_name, original_name, 
        file_size, file_path, document_type, processed_data, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING attachment_id
    `;
    
    const values = [
      'csv_upload',
      null,
      fileInfo.filename,
      fileInfo.originalname,
      fileInfo.size,
      fileInfo.path,
      parseResult.documentType,
      JSON.stringify(parseResult.data)
    ];

    const result = await pool.query(query, values);
    return { 
      success: true, 
      attachmentId: result.rows[0].attachment_id 
    };
  } catch (error) {
    log('ERROR', 'Database save failed', { error: error.message });
    throw error;
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

// Enhanced file cleanup with configurable retention
function deleteOldFiles(uploadDir, maxAgeMs = parseInt(process.env.FILE_RETENTION_MS) || 24 * 60 * 60 * 1000) {
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
          log('INFO', `Deleted old file: ${file}`);
        }
      } catch (e) {
        log('WARN', `Failed to process file: ${file}`, { error: e.message });
      }
    });
    
    if (deletedCount > 0) {
      log('INFO', `Cleanup completed: ${deletedCount} files deleted`);
    }
  } catch (error) {
    log('ERROR', 'File cleanup failed', { error: error.message });
  }
}

// Enhanced error handling middleware
app.use((error, req, res, next) => {
  log('ERROR', 'Unhandled server error', { 
    error: error.message, 
    stack: error.stack,
    url: req.url,
    method: req.method 
  });
  
  res.status(500).json({ 
    success: false, 
    error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
    timestamp: new Date().toISOString()
  });
});

// Enhanced database connection with retry
async function connectDatabase() {
  let retries = 3;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      log('INFO', '🐘 Database connected successfully');
      return;
    } catch (error) {
      retries--;
      log('WARN', `Database connection failed, retries left: ${retries}`, { error: error.message });
      if (retries === 0) {
        log('ERROR', '❌ Database connection failed permanently');
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  log('INFO', 'SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  log('INFO', 'SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

// Start server
connectDatabase().then(() => {
  app.listen(PORT, () => {
    log('INFO', `🚀 PK CRM CSV Processor v2.1 running on port ${PORT}`);
    log('INFO', `📊 Dashboard: http://localhost:${PORT}`);
    log('INFO', `🔗 N8N Webhook: ${N8N_WEBHOOK_URL}`);
  });
}).catch(error => {
  log('ERROR', 'Failed to start server', { error: error.message });
  process.exit(1);
});

module.exports = app;