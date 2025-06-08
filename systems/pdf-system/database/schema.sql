-- PK CRM Database Schema
-- สร้างตารางสำหรับระบบ CRM
-- วันที่: 2025-06-07

-- เปิดใช้งาน UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: customers
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    customer_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    company_name VARCHAR(255),
    contact_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    line_user_id VARCHAR(100),
    preferred_channel VARCHAR(20) DEFAULT 'line',
    assigned_sale_id INTEGER,
    address TEXT,
    tax_id VARCHAR(20),
    customer_type VARCHAR(20) DEFAULT 'company',
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: opportunities
-- =====================================================
CREATE TABLE IF NOT EXISTS opportunities (
    opportunity_id SERIAL PRIMARY KEY,
    opportunity_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    customer_id INTEGER REFERENCES customers(customer_id),
    opportunity_name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(30) DEFAULT 'inquiry',
    assigned_sale_id INTEGER,
    estimated_value DECIMAL(15,2),
    probability INTEGER DEFAULT 50,
    expected_close_date DATE,
    actual_close_date DATE,
    source VARCHAR(20) DEFAULT 'line',
    priority VARCHAR(20) DEFAULT 'medium',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: conversations
-- =====================================================
CREATE TABLE IF NOT EXISTS conversations (
    conversation_id SERIAL PRIMARY KEY,
    conversation_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    customer_id INTEGER REFERENCES customers(customer_id),
    opportunity_id INTEGER REFERENCES opportunities(opportunity_id),
    sale_id INTEGER,
    channel VARCHAR(20) NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    message_content TEXT,
    message_direction VARCHAR(20) NOT NULL,
    external_message_id VARCHAR(255),
    attachments JSONB DEFAULT '[]',
    read_status BOOLEAN DEFAULT false,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: quotations
-- =====================================================
CREATE TABLE IF NOT EXISTS quotations (
    quotation_id SERIAL PRIMARY KEY,
    quotation_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    opportunity_id INTEGER REFERENCES opportunities(opportunity_id),
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    quote_date DATE NOT NULL,
    valid_until DATE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    vat_rate DECIMAL(5,2) DEFAULT 7.00,
    vat_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_terms TEXT,
    delivery_terms TEXT,
    notes TEXT,
    pdf_file_path VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft',
    sent_via_channel VARCHAR(20),
    email_opens INTEGER DEFAULT 0,
    email_clicks INTEGER DEFAULT 0,
    line_views INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: quote_items
-- =====================================================
CREATE TABLE IF NOT EXISTS quote_items (
    item_id SERIAL PRIMARY KEY,
    item_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    quotation_id INTEGER REFERENCES quotations(quotation_id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    product_code VARCHAR(100),
    product_description TEXT NOT NULL,
    specification TEXT,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(20) NOT NULL DEFAULT 'ชิ้น',
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: sales_orders
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_orders (
    sales_order_id SERIAL PRIMARY KEY,
    sales_order_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    quotation_id INTEGER REFERENCES quotations(quotation_id),
    so_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(customer_id),
    po_reference VARCHAR(100),
    order_date DATE NOT NULL,
    delivery_date DATE,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    vat_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    cost_amount DECIMAL(15,2),
    profit_amount DECIMAL(15,2),
    profit_percent DECIMAL(5,2),
    status VARCHAR(30) DEFAULT 'confirmed',
    pdf_file_path VARCHAR(500),
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: sales_team
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_team (
    user_id SERIAL PRIMARY KEY,
    user_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'sales',
    phone VARCHAR(20),
    line_user_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: follow_ups
-- =====================================================
CREATE TABLE IF NOT EXISTS follow_ups (
    follow_up_id SERIAL PRIMARY KEY,
    follow_up_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    opportunity_id INTEGER REFERENCES opportunities(opportunity_id),
    customer_id INTEGER REFERENCES customers(customer_id),
    assigned_to INTEGER,
    follow_up_type VARCHAR(30) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_date TIMESTAMP NOT NULL,
    completed_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: system_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS system_logs (
    log_id SERIAL PRIMARY KEY,
    log_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: n8n_executions (สำหรับ tracking N8N workflows)
-- =====================================================
CREATE TABLE IF NOT EXISTS n8n_executions (
    execution_id SERIAL PRIMARY KEY,
    execution_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    workflow_name VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    status VARCHAR(20) NOT NULL,
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    execution_time INTEGER, -- milliseconds
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- =====================================================
-- TABLE: file_attachments
-- =====================================================
CREATE TABLE IF NOT EXISTS file_attachments (
    attachment_id SERIAL PRIMARY KEY,
    attachment_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES สำหรับ Performance
-- =====================================================

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_assigned_sale ON customers(assigned_sale_id);
CREATE INDEX IF NOT EXISTS idx_customers_line_user_id ON customers(line_user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- Opportunities indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);

-- Quotations indexes
CREATE INDEX IF NOT EXISTS idx_quotations_opportunity ON quotations(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);

-- Quote items indexes
CREATE INDEX IF NOT EXISTS idx_quote_items_quotation ON quote_items(quotation_id);

-- Sales orders indexes
CREATE INDEX IF NOT EXISTS idx_sales_orders_quotation ON sales_orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_number ON sales_orders(so_number);

-- Follow ups indexes
CREATE INDEX IF NOT EXISTS idx_follow_ups_opportunity ON follow_ups(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_date ON follow_ups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);

-- System logs indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);

-- =====================================================
-- TRIGGERS สำหรับ automatic timestamp updates
-- =====================================================

-- Function สำหรับ update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- สร้าง triggers
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at 
    BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at 
    BEFORE UPDATE ON quotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_orders_updated_at 
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_team_updated_at 
    BEFORE UPDATE ON sales_team
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_follow_ups_updated_at 
    BEFORE UPDATE ON follow_ups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS สำหรับ documentation
-- =====================================================

COMMENT ON TABLE customers IS 'ข้อมูลลูกค้าทั้งหมด';
COMMENT ON TABLE opportunities IS 'โอกาสในการขายและ sales pipeline';
COMMENT ON TABLE conversations IS 'การสนทนาจากทุกช่องทาง (Line, Email)';
COMMENT ON TABLE quotations IS 'ใบเสนอราคาทั้งหมด';
COMMENT ON TABLE quote_items IS 'รายการสินค้าในใบเสนอราคา';
COMMENT ON TABLE sales_orders IS 'ใบสั่งขายที่ได้รับการอนุมัติ';
COMMENT ON TABLE sales_team IS 'ข้อมูลทีมขายและผู้ใช้งาน';
COMMENT ON TABLE follow_ups IS 'การติดตามงานและกิจกรรม';
COMMENT ON TABLE system_logs IS 'บันทึกการใช้งานระบบ';
COMMENT ON TABLE n8n_executions IS 'บันทึกการทำงานของ N8N workflows';
COMMENT ON TABLE file_attachments IS 'ไฟล์แนบต่างๆ';

-- สำเร็จ!
\echo 'สร้างตารางทั้งหมดเสร็จสิ้น!'
\echo 'Database: pk_crm_db พร้อมใช้งาน'
