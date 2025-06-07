const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = 3003;

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'pk_crm_db', 
  user: 'pkt_user',
  password: 'pkt_password_123'
});

// File upload setup
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Main page - File Upload + Dashboard
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>PK CRM - Simple Dashboard</title>
      <style>
        body { font-family: Arial; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .upload-area { border: 2px dashed #ddd; padding: 40px; text-align: center; border-radius: 8px; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .btn:hover { background: #0056b3; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎯 PK CRM Dashboard</h1>
        
        <!-- File Upload Section -->
        <div class="card">
          <h2>📁 Upload File</h2>
          <div class="upload-area">
            <input type="file" id="fileInput" accept=".csv,.xlsx,.pdf">
            <br><br>
            <button class="btn" onclick="uploadFile()">Upload File</button>
          </div>
          <div id="uploadResult"></div>
        </div>

        <!-- Dashboard Section -->
        <div class="card">
          <h2>👥 Customer Data</h2>
          <button class="btn" onclick="loadCustomers()">Load Customers</button>
          <div id="customerData"></div>
        </div>

        <!-- Stats Section -->
        <div class="card">
          <h2>📊 Statistics</h2>
          <button class="btn" onclick="loadStats()">Load Stats</button>
          <div id="statsData"></div>
        </div>
      </div>

      <script>
        async function uploadFile() {
          const fileInput = document.getElementById('fileInput');
          const file = fileInput.files[0];
          
          if (!file) {
            alert('Please select a file');
            return;
          }

          const formData = new FormData();
          formData.append('file', file);

          try {
            const response = await fetch('/upload', {
              method: 'POST',
              body: formData
            });
            
            const result = await response.json();
            document.getElementById('uploadResult').innerHTML = 
              '<p style="color: green;">✅ File uploaded: ' + result.filename + '</p>';
          } catch (error) {
            document.getElementById('uploadResult').innerHTML = 
              '<p style="color: red;">❌ Upload failed: ' + error.message + '</p>';
          }
        }

        async function loadCustomers() {
          try {
            const response = await fetch('/api/customers');
            const data = await response.json();
            
            let html = '<table><tr><th>ID</th><th>Name</th><th>Company</th><th>Phone</th><th>Email</th></tr>';
            data.customers.forEach(customer => {
              html += \`<tr>
                <td>\${customer.customer_id}</td>
                <td>\${customer.name}</td>
                <td>\${customer.company_name || '-'}</td>
                <td>\${customer.phone || '-'}</td>
                <td>\${customer.email || '-'}</td>
              </tr>\`;
            });
            html += '</table>';
            
            document.getElementById('customerData').innerHTML = html;
          } catch (error) {
            document.getElementById('customerData').innerHTML = 
              '<p style="color: red;">❌ Failed to load customers</p>';
          }
        }

        async function loadStats() {
          try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            
            document.getElementById('statsData').innerHTML = \`
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px;">
                  <h3>\${data.totalCustomers}</h3>
                  <p>Total Customers</p>
                </div>
                <div style="background: #f3e5f5; padding: 20px; border-radius: 8px;">
                  <h3>\${data.totalOpportunities}</h3>
                  <p>Opportunities</p>
                </div>
                <div style="background: #e8f5e8; padding: 20px; border-radius: 8px;">
                  <h3>฿\${data.totalValue}</h3>
                  <p>Total Value</p>
                </div>
              </div>
            \`;
          } catch (error) {
            document.getElementById('statsData').innerHTML = 
              '<p style="color: red;">❌ Failed to load stats</p>';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  console.log('File uploaded:', req.file.filename);
  res.json({ 
    success: true, 
    filename: req.file.originalname,
    path: req.file.path 
  });
});

// API endpoints
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC LIMIT 20');
    res.json({ customers: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const customers = await pool.query('SELECT COUNT(*) as count FROM customers');
    const opportunities = await pool.query('SELECT COUNT(*) as count, SUM(estimated_value) as total FROM opportunities');
    
    res.json({
      totalCustomers: customers.rows[0].count,
      totalOpportunities: opportunities.rows[0].count || 0,
      totalValue: parseFloat(opportunities.rows[0].total || 0).toLocaleString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Simple PK CRM running on port ${port}`);
  console.log(`🌐 Access: http://localhost:${port}`);
});
