// Basic login route - ใช้ database
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    console.log('Login attempt:', username);
    
    // ดู database ก่อน
    const result = await pool.query('SELECT username, password_hash, role, permissions FROM crm_users WHERE username = $1 AND is_active = true', [username]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password_hash);
      
      if (isValid) {
        req.session.user = {
          username: user.username,
          role: user.role,
          canDelete: user.permissions?.canDelete || false
        };
        console.log('Database login successful:', username);
        return res.json({ success: true, user: req.session.user });
      }
    }
    
    console.log('Invalid credentials for:', username);
    res.status(401).json({ error: 'Invalid credentials' });
    
  } catch (error) {
    console.log('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});
