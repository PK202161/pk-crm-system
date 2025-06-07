const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3002;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Middleware
app.use(helmet({contentSecurityPolicy: false})); // CSP disabled for dev
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Session middleware (memory store)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Allow non-HTTPS for dev
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Health check
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT current_database(), version()');
    const dbTest = await pool.query('SELECT COUNT(*) as customer_count FROM customers');

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        name: result.rows[0].current_database,
        version: result.rows[0].version.split(' ')[0],
        customers: parseInt(dbTest.rows[0].customer_count)
      },
      environment: process.env.NODE_ENV,
      port: port
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message
    });
  }
});

// WORKING LOGIN ROUTE
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  console.log(`🔐 LOGIN ATTEMPT: ${username} at ${new Date().toISOString()}`);

  if (!username || !password) {
    console.log('❌ Missing credentials');
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    console.log(`👤 Processing login for: ${username}`);
    
    const defaultUsers = {
      'admin': '$2a$12$5eWNOEtN0131ZQiLI2etL.lhtttbQMLTi2JZIudXg4Sr./Rl48vMS',
      'PU': '$2a$12$5eWNOEtN0131ZQiLI2etL.lhtttbQMLTi2JZIudXg4Sr./Rl48vMS',
      'ST': '$2a$12$5eWNOEtN0131ZQiLI2etL.lhtttbQMLTi2JZIudXg4Sr./Rl48vMS',
      'SA': '$2a$12$5eWNOEtN0131ZQiLI2etL.lhtttbQMLTi2JZIudXg4Sr./Rl48vMS'
    };

    if (defaultUsers[username]) {
      console.log(`🔍 User found: ${username}`);
      console.log(`🔑 Comparing password...`);
      
      const isValid = await bcrypt.compare(password, defaultUsers[username]);
      console.log(`✔️ Password validation result: ${isValid}`);
      
      if (isValid) {
        const user = {
          username,
          role: username === 'admin' ? 'admin' : 'operation',
          canDelete: username === 'admin'
        };
        
        req.session.user = user;
        console.log(`✅ LOGIN SUCCESS: ${username} (${user.role})`);
        
        return res.json({ 
          success: true, 
          user: user,
          message: 'เข้าสู่ระบบสำเร็จ'
        });
      } else {
        console.log(`❌ Invalid password for: ${username}`);
      }
    } else {
      console.log(`❌ User not found: ${username}`);
    }

    console.log(`🚫 Authentication failed for: ${username}`);
    res.status(401).json({ error: 'Invalid credentials' });
    
  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>PK CRM Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; max-width: 1200px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 3px solid #3498db; padding-bottom: 20px; }
        .btn { padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; margin: 5px; display: inline-block; }
        .btn:hover { background: #2980b9; }
        .btn-danger { background: #e74c3c; }
        .success { color: #27ae60; font-weight: bold; margin-bottom: 20px; padding: 15px; background: #d4edda; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 PK CRM Dashboard</h1>
          <div>
            <span>👤 ${req.session.user.username} (${req.session.user.role})</span>
            <a href="/logout" class="btn btn-danger">ออกจากระบบ</a>
          </div>
        </div>

        <div class="success">
          ✅ Login สำเร็จ! ระบบพร้อมใช้งาน
        </div>

        <div>
          <a href="/api/customers" class="btn">👥 ดูลูกค้า (JSON)</a>
          <a href="/health" class="btn">🔧 System Health</a>
        </div>

        <div style="margin-top: 30px; padding: 20px; background: #e8f5e8; border-radius: 5px;">
          <h4>🎯 ระบบพร้อมใช้งาน!</h4>
          <ul>
            <li><strong>User</strong>: ${req.session.user.username}</li>
            <li><strong>Role</strong>: ${req.session.user.role}</li>
            <li><strong>Login Time</strong>: ${new Date().toLocaleString()}</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Login page
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>PK CRM Login</title>
      <style>
        body { font-family: Arial; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px; text-align: center; min-height: 100vh; margin: 0; display: flex; align-items: center; justify-content: center; }
        .login-form { background: white; padding: 40px; border-radius: 15px; max-width: 400px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        input { padding: 12px; margin: 10px; width: 200px; border: 1px solid #ddd; border-radius: 5px; }
        button { padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background: #2980b9; }
        .test-info { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="login-form">
        <h2>🔐 PK CRM Login</h2>
        <form id="loginForm">
          <div><input type="text" id="username" name="username" placeholder="Username" required></div>
          <div><input type="password" id="password" name="password" placeholder="Password" required></div>
          <div><button type="submit">เข้าสู่ระบบ</button></div>
        </form>
        <div class="test-info">
          <h4>🧪 Test Users:</h4>
          <p><strong>admin</strong> / password123</p>
          <p><strong>PU</strong> / password123</p>
        </div>
      </div>

      <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const username = document.getElementById('username').value;
          const password = document.getElementById('password').value;

          console.log('Attempting login...', username);

          try {
            const response = await fetch('/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ username, password })
            });

            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Response data:', result);

            if (result.success) {
              console.log('Login successful, redirecting...');
              window.location.href = '/dashboard';
            } else {
              alert('เข้าสู่ระบบไม่สำเร็จ: ' + (result.error || 'Unknown error'));
            }
          } catch (error) {
            console.error('Login error:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Root redirect
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// API routes
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC LIMIT 10');
    res.json({ customers: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, '0.0.0.0', async () => {
  try {
    const result = await pool.query('SELECT current_database(), COUNT(*) as customer_count FROM customers');
    console.log(`🚀 PK CRM Server running on port ${port}`);
    console.log(`📊 Connected to database: ${result.rows[0].current_database}`);
    console.log(`👥 Found ${result.rows[0].customer_count} customers in database`);
    console.log(`🌐 Access: https://pkcrm.pktechnic.com`);
    console.log(`🔐 Login: https://pkcrm.pktechnic.com/login`);
    console.log(`📋 Dashboard: https://pkcrm.pktechnic.com/dashboard`);
    console.log(`💚 Health Check: https://pkcrm.pktechnic.com/health`);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('📝 Please check database configuration');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});
