const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testConnection() {
  try {
    console.log('🔗 Testing database connection...');
    
    // Basic connection test
    const result = await pool.query('SELECT current_database(), version()');
    console.log(`✅ Connected to database: ${result.rows[0].current_database}`);
    
    // Check tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`📋 Found ${tables.rows.length} tables:`);
    tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
    // Check sample data
    const customers = await pool.query('SELECT COUNT(*) as count FROM customers');
    const opportunities = await pool.query('SELECT COUNT(*) as count FROM opportunities');
    const quotations = await pool.query('SELECT COUNT(*) as count FROM quotations');
    
    console.log(`\n📊 Data Summary:`);
    console.log(`   👥 Customers: ${customers.rows[0].count}`);
    console.log(`   💼 Opportunities: ${opportunities.rows[0].count}`);
    console.log(`   📄 Quotations: ${quotations.rows[0].count}`);
    
    // Test pipeline view
    try {
      const pipeline = await pool.query('SELECT * FROM sales_pipeline_summary');
      console.log(`\n🎯 Pipeline Summary:`);
      pipeline.rows.forEach(row => {
        console.log(`   ${row.status}: ${row.deal_count} deals, ฿${parseInt(row.total_value).toLocaleString()}`);
      });
    } catch (error) {
      console.log('\n⚠️ Pipeline view not found (normal for initial setup)');
    }
    
    console.log(`\n🎉 Database test completed successfully!`);
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.log('\n🔧 Check your .env configuration:');
    console.log(`   DB_HOST=${process.env.DB_HOST}`);
    console.log(`   DB_PORT=${process.env.DB_PORT}`);
    console.log(`   DB_NAME=${process.env.DB_NAME}`);
    console.log(`   DB_USER=${process.env.DB_USER}`);
  } finally {
    await pool.end();
  }
}

testConnection();
