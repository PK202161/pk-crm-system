--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: commission_tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.commission_tracking (
    commission_id integer NOT NULL,
    sales_order_id integer,
    salesperson_id integer,
    base_amount numeric(10,2) NOT NULL,
    commission_rate numeric(5,2) NOT NULL,
    commission_amount numeric(10,2) NOT NULL,
    payment_month character varying(7),
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    paid_date date,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.commission_tracking OWNER TO postgres;

--
-- Name: commission_tracking_commission_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.commission_tracking_commission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.commission_tracking_commission_id_seq OWNER TO postgres;

--
-- Name: commission_tracking_commission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.commission_tracking_commission_id_seq OWNED BY public.commission_tracking.commission_id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: pkt_upload
--

CREATE TABLE public.conversations (
    conversation_id integer NOT NULL,
    conversation_uuid uuid DEFAULT public.uuid_generate_v4(),
    customer_id integer,
    opportunity_id integer,
    sale_id integer,
    channel character varying(20) DEFAULT 'line'::character varying,
    message_type character varying(20) DEFAULT 'text'::character varying,
    message_content text,
    message_direction character varying(20) DEFAULT 'outbound'::character varying,
    external_message_id character varying(255),
    attachments jsonb DEFAULT '[]'::jsonb,
    read_status boolean DEFAULT false,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    line_user_id character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.conversations OWNER TO pkt_upload;

--
-- Name: TABLE conversations; Type: COMMENT; Schema: public; Owner: pkt_upload
--

COMMENT ON TABLE public.conversations IS 'การสนทนาจากทุกช่องทาง (Line, Email)';


--
-- Name: conversations_conversation_id_seq; Type: SEQUENCE; Schema: public; Owner: pkt_upload
--

CREATE SEQUENCE public.conversations_conversation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversations_conversation_id_seq OWNER TO pkt_upload;

--
-- Name: conversations_conversation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pkt_upload
--

ALTER SEQUENCE public.conversations_conversation_id_seq OWNED BY public.conversations.conversation_id;


--
-- Name: customer_interactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_interactions (
    interaction_id integer NOT NULL,
    customer_id integer,
    interaction_type character varying(50) NOT NULL,
    interaction_date timestamp without time zone DEFAULT now() NOT NULL,
    salesperson_id integer,
    subject character varying(200),
    description text,
    next_action character varying(200),
    next_action_date date,
    status character varying(20) DEFAULT 'completed'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.customer_interactions OWNER TO postgres;

--
-- Name: customer_interactions_interaction_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_interactions_interaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_interactions_interaction_id_seq OWNER TO postgres;

--
-- Name: customer_interactions_interaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_interactions_interaction_id_seq OWNED BY public.customer_interactions.interaction_id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: pkt_upload
--

CREATE TABLE public.customers (
    customer_id integer NOT NULL,
    customer_uuid uuid DEFAULT public.uuid_generate_v4(),
    company_name character varying(255),
    contact_name character varying(100) DEFAULT 'General Contact'::character varying,
    phone character varying(20),
    email character varying(100),
    line_user_id character varying(100),
    preferred_channel character varying(20) DEFAULT 'line'::character varying,
    assigned_sale_id integer,
    address text,
    tax_id character varying(20),
    customer_type character varying(20) DEFAULT 'company'::character varying,
    status character varying(20) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    customer_code character varying(10),
    company_type character varying(20),
    address_full text,
    province character varying(50),
    territory character varying(100),
    sales_territory_id integer,
    customer_source character varying(50),
    credit_limit numeric(12,2),
    payment_terms character varying(100),
    contact_method character varying(50) DEFAULT 'email'::character varying
);


ALTER TABLE public.customers OWNER TO pkt_upload;

--
-- Name: TABLE customers; Type: COMMENT; Schema: public; Owner: pkt_upload
--

COMMENT ON TABLE public.customers IS 'ข้อมูลลูกค้าทั้งหมด';


--
-- Name: customers_customer_id_seq; Type: SEQUENCE; Schema: public; Owner: pkt_upload
--

CREATE SEQUENCE public.customers_customer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_customer_id_seq OWNER TO pkt_upload;

--
-- Name: customers_customer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pkt_upload
--

ALTER SEQUENCE public.customers_customer_id_seq OWNED BY public.customers.customer_id;


--
-- Name: file_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.file_attachments (
    attachment_id integer NOT NULL,
    attachment_uuid uuid DEFAULT public.uuid_generate_v4(),
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    original_filename character varying(255) NOT NULL,
    stored_filename character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size integer,
    mime_type character varying(100),
    uploaded_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.file_attachments OWNER TO postgres;

--
-- Name: TABLE file_attachments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.file_attachments IS 'ไฟล์แนบต่างๆ';


--
-- Name: file_attachments_attachment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.file_attachments_attachment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.file_attachments_attachment_id_seq OWNER TO postgres;

--
-- Name: file_attachments_attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.file_attachments_attachment_id_seq OWNED BY public.file_attachments.attachment_id;


--
-- Name: follow_ups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.follow_ups (
    follow_up_id integer NOT NULL,
    follow_up_uuid uuid DEFAULT public.uuid_generate_v4(),
    opportunity_id integer,
    customer_id integer,
    assigned_to integer,
    follow_up_type character varying(30) NOT NULL,
    subject character varying(255) NOT NULL,
    description text,
    scheduled_date timestamp without time zone NOT NULL,
    completed_date timestamp without time zone,
    status character varying(20) DEFAULT 'pending'::character varying,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.follow_ups OWNER TO postgres;

--
-- Name: TABLE follow_ups; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.follow_ups IS 'การติดตามงานและกิจกรรม';


--
-- Name: follow_ups_follow_up_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.follow_ups_follow_up_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.follow_ups_follow_up_id_seq OWNER TO postgres;

--
-- Name: follow_ups_follow_up_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.follow_ups_follow_up_id_seq OWNED BY public.follow_ups.follow_up_id;


--
-- Name: n8n_executions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.n8n_executions (
    execution_id integer NOT NULL,
    execution_uuid uuid DEFAULT public.uuid_generate_v4(),
    workflow_name character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id integer,
    status character varying(20) NOT NULL,
    input_data jsonb,
    output_data jsonb,
    error_message text,
    execution_time integer,
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone
);


ALTER TABLE public.n8n_executions OWNER TO postgres;

--
-- Name: TABLE n8n_executions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.n8n_executions IS 'บันทึกการทำงานของ N8N workflows';


--
-- Name: n8n_executions_execution_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.n8n_executions_execution_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.n8n_executions_execution_id_seq OWNER TO postgres;

--
-- Name: n8n_executions_execution_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.n8n_executions_execution_id_seq OWNED BY public.n8n_executions.execution_id;


--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: pkt_upload
--

CREATE TABLE public.opportunities (
    opportunity_id integer NOT NULL,
    opportunity_uuid uuid DEFAULT public.uuid_generate_v4(),
    customer_id integer,
    opportunity_name character varying(255) DEFAULT ''::character varying,
    description text,
    status character varying(30) DEFAULT 'inquiry'::character varying,
    assigned_sale_id integer,
    estimated_value numeric(15,2),
    probability integer DEFAULT 50,
    expected_close_date date,
    actual_close_date date,
    source character varying(20) DEFAULT 'line'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    estimated_profit_percent numeric(5,2),
    sales_territory character varying(100),
    lead_source character varying(50),
    competitor character varying(100),
    win_probability numeric(5,2),
    lost_reason text,
    document_number character varying(50),
    document_type character varying(20) DEFAULT 'quotation'::character varying,
    assigned_salesperson character varying(100),
    territory character varying(100),
    created_date date DEFAULT CURRENT_DATE
);


ALTER TABLE public.opportunities OWNER TO pkt_upload;

--
-- Name: TABLE opportunities; Type: COMMENT; Schema: public; Owner: pkt_upload
--

COMMENT ON TABLE public.opportunities IS 'โอกาสในการขายและ sales pipeline';


--
-- Name: opportunities_opportunity_id_seq; Type: SEQUENCE; Schema: public; Owner: pkt_upload
--

CREATE SEQUENCE public.opportunities_opportunity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.opportunities_opportunity_id_seq OWNER TO pkt_upload;

--
-- Name: opportunities_opportunity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pkt_upload
--

ALTER SEQUENCE public.opportunities_opportunity_id_seq OWNED BY public.opportunities.opportunity_id;


--
-- Name: product_catalog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_catalog (
    product_id integer NOT NULL,
    product_code character varying(50) NOT NULL,
    product_name character varying(300) NOT NULL,
    brand character varying(50),
    category character varying(50),
    subcategory character varying(50),
    specifications text,
    standard_unit character varying(20),
    standard_cost numeric(10,2),
    standard_price numeric(10,2),
    status character varying(20) DEFAULT 'active'::character varying,
    supplier character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.product_catalog OWNER TO postgres;

--
-- Name: product_catalog_product_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_catalog_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_catalog_product_id_seq OWNER TO postgres;

--
-- Name: product_catalog_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_catalog_product_id_seq OWNED BY public.product_catalog.product_id;


--
-- Name: purchase_requests; Type: TABLE; Schema: public; Owner: pkt_upload
--

CREATE TABLE public.purchase_requests (
    id integer NOT NULL,
    document_number character varying(50),
    document_type character varying(100),
    document_date date,
    customer_name character varying(255),
    item_code character varying(50) NOT NULL,
    item_description text,
    quantity_purchased numeric(12,2) DEFAULT 0,
    unit character varying(30),
    purchase_reason text,
    remark text,
    report_url text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.purchase_requests OWNER TO pkt_upload;

--
-- Name: purchase_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: pkt_upload
--

CREATE SEQUENCE public.purchase_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchase_requests_id_seq OWNER TO pkt_upload;

--
-- Name: purchase_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pkt_upload
--

ALTER SEQUENCE public.purchase_requests_id_seq OWNED BY public.purchase_requests.id;


--
-- Name: quotations; Type: TABLE; Schema: public; Owner: pkt_upload
--

CREATE TABLE public.quotations (
    quotation_id integer NOT NULL,
    quotation_uuid uuid DEFAULT public.uuid_generate_v4(),
    opportunity_id integer,
    quotation_number character varying(50) NOT NULL,
    quote_date date NOT NULL,
    valid_until date,
    customer_name character varying(255) NOT NULL,
    contact_person character varying(255),
    subtotal numeric(15,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(15,2) DEFAULT 0,
    vat_rate numeric(5,2) DEFAULT 7.00,
    vat_amount numeric(15,2) DEFAULT 0 NOT NULL,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    payment_terms text,
    delivery_terms text,
    notes text,
    pdf_file_path character varying(500),
    status character varying(20) DEFAULT 'draft'::character varying,
    sent_via_channel character varying(20),
    email_opens integer DEFAULT 0,
    email_clicks integer DEFAULT 0,
    line_views integer DEFAULT 0,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    valid_until_date date,
    valid_days integer,
    salesperson_id integer,
    salesperson_code character varying(10),
    salesperson_name character varying(100),
    customer_code character varying(10),
    discount_percent numeric(5,2) DEFAULT 0,
    quotation_version integer DEFAULT 1,
    reference_number character varying(50),
    quotation_date date,
    salesperson character varying(100),
    territory character varying(100) DEFAULT ''::character varying,
    item_count integer DEFAULT 0,
    source_file character varying(255)
);


ALTER TABLE public.quotations OWNER TO pkt_upload;

--
-- Name: TABLE quotations; Type: COMMENT; Schema: public; Owner: pkt_upload
--

COMMENT ON TABLE public.quotations IS 'ใบเสนอราคาทั้งหมด';


--
-- Name: quotations_quotation_id_seq; Type: SEQUENCE; Schema: public; Owner: pkt_upload
--

CREATE SEQUENCE public.quotations_quotation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quotations_quotation_id_seq OWNER TO pkt_upload;

--
-- Name: quotations_quotation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pkt_upload
--

ALTER SEQUENCE public.quotations_quotation_id_seq OWNED BY public.quotations.quotation_id;


--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: pkt_upload
--

CREATE TABLE public.quote_items (
    item_id integer NOT NULL,
    item_uuid uuid DEFAULT public.uuid_generate_v4(),
    quotation_id integer,
    line_number integer NOT NULL,
    product_code character varying(100),
    product_description text NOT NULL,
    specification text,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    unit character varying(20) DEFAULT 'ชิ้น'::character varying NOT NULL,
    unit_price numeric(15,2) DEFAULT 0 NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0,
    amount numeric(15,2) DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    brand character varying(50),
    specifications text,
    product_category character varying(50),
    cost_price numeric(10,2),
    profit_amount numeric(10,2),
    profit_percent numeric(5,2),
    line_notes text,
    line_total numeric(12,2),
    discount_amount numeric(12,2) DEFAULT 0
);


ALTER TABLE public.quote_items OWNER TO pkt_upload;

--
-- Name: TABLE quote_items; Type: COMMENT; Schema: public; Owner: pkt_upload
--

COMMENT ON TABLE public.quote_items IS 'รายการสินค้าในใบเสนอราคา';


--
-- Name: quote_items_item_id_seq; Type: SEQUENCE; Schema: public; Owner: pkt_upload
--

CREATE SEQUENCE public.quote_items_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quote_items_item_id_seq OWNER TO pkt_upload;

--
-- Name: quote_items_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pkt_upload
--

ALTER SEQUENCE public.quote_items_item_id_seq OWNED BY public.quote_items.item_id;


--
-- Name: sales_order_items; Type: TABLE; Schema: public; Owner: pkt_upload
--

CREATE TABLE public.sales_order_items (
    item_id integer NOT NULL,
    sales_order_id integer NOT NULL,
    line_number integer,
    product_code character varying(50),
    product_description text,
    quantity numeric(10,3),
    unit character varying(50),
    unit_price numeric(12,2),
    line_total numeric(12,2),
    discount_amount numeric(12,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sales_order_items OWNER TO pkt_upload;

--
-- Name: sales_order_items_item_id_seq; Type: SEQUENCE; Schema: public; Owner: pkt_upload
--

CREATE SEQUENCE public.sales_order_items_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_order_items_item_id_seq OWNER TO pkt_upload;

--
-- Name: sales_order_items_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pkt_upload
--

ALTER SEQUENCE public.sales_order_items_item_id_seq OWNED BY public.sales_order_items.item_id;


--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: pkt_upload
--

CREATE TABLE public.sales_orders (
    sales_order_id integer NOT NULL,
    sales_order_uuid uuid DEFAULT public.uuid_generate_v4(),
    quotation_id integer,
    so_number character varying(50) NOT NULL,
    customer_id integer,
    po_reference character varying(100),
    order_date date NOT NULL,
    delivery_date date,
    subtotal numeric(15,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(15,2) DEFAULT 0,
    vat_amount numeric(15,2) DEFAULT 0 NOT NULL,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    cost_amount numeric(15,2),
    profit_amount numeric(15,2),
    profit_percent numeric(5,2),
    status character varying(30) DEFAULT 'confirmed'::character varying,
    pdf_file_path character varying(500),
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    salesperson_id integer,
    salesperson_code character varying(10),
    salesperson_name character varying(100),
    sales_territory character varying(100),
    shipping_method character varying(50),
    customer_code character varying(10),
    discount_percent numeric(5,2) DEFAULT 0,
    total_cost numeric(12,2),
    total_profit numeric(12,2),
    total_profit_percent numeric(5,2),
    commission_amount numeric(10,2),
    profit_margin numeric(5,2),
    territory character varying(100),
    customer_name character varying(255),
    item_count integer DEFAULT 0,
    payment_terms character varying(255),
    source_file character varying(255),
    salesperson character varying(100),
    opportunity_id integer
);


ALTER TABLE public.sales_orders OWNER TO pkt_upload;

--
-- Name: TABLE sales_orders; Type: COMMENT; Schema: public; Owner: pkt_upload
--

COMMENT ON TABLE public.sales_orders IS 'ใบสั่งขายที่ได้รับการอนุมัติ';


--
-- Name: sales_orders_sales_order_id_seq; Type: SEQUENCE; Schema: public; Owner: pkt_upload
--

CREATE SEQUENCE public.sales_orders_sales_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_orders_sales_order_id_seq OWNER TO pkt_upload;

--
-- Name: sales_orders_sales_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pkt_upload
--

ALTER SEQUENCE public.sales_orders_sales_order_id_seq OWNED BY public.sales_orders.sales_order_id;


--
-- Name: sales_team; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_team (
    sales_id integer NOT NULL,
    sales_code character varying(10) NOT NULL,
    sales_name character varying(100) NOT NULL,
    full_name character varying(150),
    territory character varying(100),
    provinces text[],
    commission_rate numeric(5,2) DEFAULT 5.00,
    phone character varying(20),
    email character varying(100),
    line_user_id character varying(50),
    status character varying(20) DEFAULT 'active'::character varying,
    hire_date date,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sales_team OWNER TO postgres;

--
-- Name: sales_team_sales_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_team_sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_team_sales_id_seq OWNER TO postgres;

--
-- Name: sales_team_sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_team_sales_id_seq OWNED BY public.sales_team.sales_id;


--
-- Name: system_logs; Type: TABLE; Schema: public; Owner: pkt_upload
--

CREATE TABLE public.system_logs (
    log_id integer NOT NULL,
    log_uuid uuid DEFAULT public.uuid_generate_v4(),
    user_id character varying(50),
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id integer,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    details text
);


ALTER TABLE public.system_logs OWNER TO pkt_upload;

--
-- Name: TABLE system_logs; Type: COMMENT; Schema: public; Owner: pkt_upload
--

COMMENT ON TABLE public.system_logs IS 'บันทึกการใช้งานระบบ';


--
-- Name: system_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: pkt_upload
--

CREATE SEQUENCE public.system_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_logs_log_id_seq OWNER TO pkt_upload;

--
-- Name: system_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pkt_upload
--

ALTER SEQUENCE public.system_logs_log_id_seq OWNED BY public.system_logs.log_id;


--
-- Name: territories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.territories (
    territory_id integer NOT NULL,
    territory_name character varying(100) NOT NULL,
    provinces text[],
    region character varying(50),
    manager_id integer,
    status character varying(20) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.territories OWNER TO postgres;

--
-- Name: territories_territory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.territories_territory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.territories_territory_id_seq OWNER TO postgres;

--
-- Name: territories_territory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.territories_territory_id_seq OWNED BY public.territories.territory_id;


--
-- Name: withdrawals; Type: TABLE; Schema: public; Owner: pkt_upload
--

CREATE TABLE public.withdrawals (
    id integer NOT NULL,
    document_number character varying(50),
    document_type character varying(100),
    document_date date,
    customer_name character varying(255),
    item_code character varying(50) NOT NULL,
    item_description text,
    quantity_requested numeric(12,2) DEFAULT 0,
    quantity_withdrawn numeric(12,2) DEFAULT 0,
    unit character varying(30),
    remark text,
    report_url text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.withdrawals OWNER TO pkt_upload;

--
-- Name: withdrawals_id_seq; Type: SEQUENCE; Schema: public; Owner: pkt_upload
--

CREATE SEQUENCE public.withdrawals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.withdrawals_id_seq OWNER TO pkt_upload;

--
-- Name: withdrawals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pkt_upload
--

ALTER SEQUENCE public.withdrawals_id_seq OWNED BY public.withdrawals.id;


--
-- Name: commission_tracking commission_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commission_tracking ALTER COLUMN commission_id SET DEFAULT nextval('public.commission_tracking_commission_id_seq'::regclass);


--
-- Name: conversations conversation_id; Type: DEFAULT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.conversations ALTER COLUMN conversation_id SET DEFAULT nextval('public.conversations_conversation_id_seq'::regclass);


--
-- Name: customer_interactions interaction_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_interactions ALTER COLUMN interaction_id SET DEFAULT nextval('public.customer_interactions_interaction_id_seq'::regclass);


--
-- Name: customers customer_id; Type: DEFAULT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.customers ALTER COLUMN customer_id SET DEFAULT nextval('public.customers_customer_id_seq'::regclass);


--
-- Name: file_attachments attachment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_attachments ALTER COLUMN attachment_id SET DEFAULT nextval('public.file_attachments_attachment_id_seq'::regclass);


--
-- Name: follow_ups follow_up_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follow_ups ALTER COLUMN follow_up_id SET DEFAULT nextval('public.follow_ups_follow_up_id_seq'::regclass);


--
-- Name: n8n_executions execution_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.n8n_executions ALTER COLUMN execution_id SET DEFAULT nextval('public.n8n_executions_execution_id_seq'::regclass);


--
-- Name: opportunities opportunity_id; Type: DEFAULT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.opportunities ALTER COLUMN opportunity_id SET DEFAULT nextval('public.opportunities_opportunity_id_seq'::regclass);


--
-- Name: product_catalog product_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_catalog ALTER COLUMN product_id SET DEFAULT nextval('public.product_catalog_product_id_seq'::regclass);


--
-- Name: purchase_requests id; Type: DEFAULT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.purchase_requests ALTER COLUMN id SET DEFAULT nextval('public.purchase_requests_id_seq'::regclass);


--
-- Name: quotations quotation_id; Type: DEFAULT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.quotations ALTER COLUMN quotation_id SET DEFAULT nextval('public.quotations_quotation_id_seq'::regclass);


--
-- Name: quote_items item_id; Type: DEFAULT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.quote_items ALTER COLUMN item_id SET DEFAULT nextval('public.quote_items_item_id_seq'::regclass);


--
-- Name: sales_order_items item_id; Type: DEFAULT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.sales_order_items ALTER COLUMN item_id SET DEFAULT nextval('public.sales_order_items_item_id_seq'::regclass);


--
-- Name: sales_orders sales_order_id; Type: DEFAULT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.sales_orders ALTER COLUMN sales_order_id SET DEFAULT nextval('public.sales_orders_sales_order_id_seq'::regclass);


--
-- Name: sales_team sales_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_team ALTER COLUMN sales_id SET DEFAULT nextval('public.sales_team_sales_id_seq'::regclass);


--
-- Name: system_logs log_id; Type: DEFAULT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.system_logs ALTER COLUMN log_id SET DEFAULT nextval('public.system_logs_log_id_seq'::regclass);


--
-- Name: territories territory_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.territories ALTER COLUMN territory_id SET DEFAULT nextval('public.territories_territory_id_seq'::regclass);


--
-- Name: withdrawals id; Type: DEFAULT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.withdrawals ALTER COLUMN id SET DEFAULT nextval('public.withdrawals_id_seq'::regclass);


--
-- Name: commission_tracking commission_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commission_tracking
    ADD CONSTRAINT commission_tracking_pkey PRIMARY KEY (commission_id);


--
-- Name: conversations conversations_conversation_uuid_key; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_conversation_uuid_key UNIQUE (conversation_uuid);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (conversation_id);


--
-- Name: customer_interactions customer_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_interactions
    ADD CONSTRAINT customer_interactions_pkey PRIMARY KEY (interaction_id);


--
-- Name: customers customers_customer_code_key; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_customer_code_key UNIQUE (customer_code);


--
-- Name: customers customers_customer_code_unique; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_customer_code_unique UNIQUE (customer_code);


--
-- Name: customers customers_customer_uuid_key; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_customer_uuid_key UNIQUE (customer_uuid);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);


--
-- Name: file_attachments file_attachments_attachment_uuid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT file_attachments_attachment_uuid_key UNIQUE (attachment_uuid);


--
-- Name: file_attachments file_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT file_attachments_pkey PRIMARY KEY (attachment_id);


--
-- Name: follow_ups follow_ups_follow_up_uuid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follow_ups
    ADD CONSTRAINT follow_ups_follow_up_uuid_key UNIQUE (follow_up_uuid);


--
-- Name: follow_ups follow_ups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follow_ups
    ADD CONSTRAINT follow_ups_pkey PRIMARY KEY (follow_up_id);


--
-- Name: n8n_executions n8n_executions_execution_uuid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.n8n_executions
    ADD CONSTRAINT n8n_executions_execution_uuid_key UNIQUE (execution_uuid);


--
-- Name: n8n_executions n8n_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.n8n_executions
    ADD CONSTRAINT n8n_executions_pkey PRIMARY KEY (execution_id);


--
-- Name: opportunities opportunities_document_number_key; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_document_number_key UNIQUE (document_number);


--
-- Name: opportunities opportunities_document_number_unique; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_document_number_unique UNIQUE (document_number);


--
-- Name: opportunities opportunities_opportunity_uuid_key; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_opportunity_uuid_key UNIQUE (opportunity_uuid);


--
-- Name: opportunities opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_pkey PRIMARY KEY (opportunity_id);


--
-- Name: product_catalog product_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_catalog
    ADD CONSTRAINT product_catalog_pkey PRIMARY KEY (product_id);


--
-- Name: product_catalog product_catalog_product_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_catalog
    ADD CONSTRAINT product_catalog_product_code_key UNIQUE (product_code);


--
-- Name: purchase_requests purchase_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_pkey PRIMARY KEY (id);


--
-- Name: quotations quotations_pkey; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_pkey PRIMARY KEY (quotation_id);


--
-- Name: quotations quotations_quotation_number_key; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_quotation_number_key UNIQUE (quotation_number);


--
-- Name: quotations quotations_quotation_number_unique; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_quotation_number_unique UNIQUE (quotation_number);


--
-- Name: quotations quotations_quotation_uuid_key; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_quotation_uuid_key UNIQUE (quotation_uuid);


--
-- Name: quote_items quote_items_item_uuid_key; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_item_uuid_key UNIQUE (item_uuid);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (item_id);


--
-- Name: sales_order_items sales_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_pkey PRIMARY KEY (item_id);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (sales_order_id);


--
-- Name: sales_orders sales_orders_sales_order_uuid_key; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_sales_order_uuid_key UNIQUE (sales_order_uuid);


--
-- Name: sales_orders sales_orders_so_number_key; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_so_number_key UNIQUE (so_number);


--
-- Name: sales_team sales_team_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_team
    ADD CONSTRAINT sales_team_pkey PRIMARY KEY (sales_id);


--
-- Name: sales_team sales_team_sales_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_team
    ADD CONSTRAINT sales_team_sales_code_key UNIQUE (sales_code);


--
-- Name: system_logs system_logs_log_uuid_key; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_log_uuid_key UNIQUE (log_uuid);


--
-- Name: system_logs system_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_pkey PRIMARY KEY (log_id);


--
-- Name: territories territories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.territories
    ADD CONSTRAINT territories_pkey PRIMARY KEY (territory_id);


--
-- Name: territories territories_territory_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.territories
    ADD CONSTRAINT territories_territory_name_key UNIQUE (territory_name);


--
-- Name: withdrawals withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_pkey PRIMARY KEY (id);


--
-- Name: idx_conversations_channel; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_conversations_channel ON public.conversations USING btree (channel);


--
-- Name: idx_conversations_customer; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_conversations_customer ON public.conversations USING btree (customer_id);


--
-- Name: idx_conversations_timestamp; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_conversations_timestamp ON public.conversations USING btree ("timestamp");


--
-- Name: idx_customers_assigned_sale; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_customers_assigned_sale ON public.customers USING btree (assigned_sale_id);


--
-- Name: idx_customers_code; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_customers_code ON public.customers USING btree (customer_code);


--
-- Name: idx_customers_customer_code; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_customers_customer_code ON public.customers USING btree (customer_code);


--
-- Name: idx_customers_email; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_customers_email ON public.customers USING btree (email);


--
-- Name: idx_customers_line_user_id; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_customers_line_user_id ON public.customers USING btree (line_user_id);


--
-- Name: idx_customers_sales; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_customers_sales ON public.customers USING btree (assigned_sale_id);


--
-- Name: idx_customers_status; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_customers_status ON public.customers USING btree (status);


--
-- Name: idx_customers_territory; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_customers_territory ON public.customers USING btree (territory);


--
-- Name: idx_customers_type; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_customers_type ON public.customers USING btree (company_type);


--
-- Name: idx_follow_ups_opportunity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_follow_ups_opportunity ON public.follow_ups USING btree (opportunity_id);


--
-- Name: idx_follow_ups_scheduled_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_follow_ups_scheduled_date ON public.follow_ups USING btree (scheduled_date);


--
-- Name: idx_follow_ups_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_follow_ups_status ON public.follow_ups USING btree (status);


--
-- Name: idx_opportunities_created_at; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_opportunities_created_at ON public.opportunities USING btree (created_at);


--
-- Name: idx_opportunities_customer; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_opportunities_customer ON public.opportunities USING btree (customer_id);


--
-- Name: idx_opportunities_document_number; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_opportunities_document_number ON public.opportunities USING btree (document_number);


--
-- Name: idx_opportunities_status; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_opportunities_status ON public.opportunities USING btree (status);


--
-- Name: idx_products_brand; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_brand ON public.product_catalog USING btree (brand);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category ON public.product_catalog USING btree (category);


--
-- Name: idx_products_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_code ON public.product_catalog USING btree (product_code);


--
-- Name: idx_quotations_customer_code; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_quotations_customer_code ON public.quotations USING btree (customer_code);


--
-- Name: idx_quotations_date; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_quotations_date ON public.quotations USING btree (quote_date);


--
-- Name: idx_quotations_number; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_quotations_number ON public.quotations USING btree (quotation_number);


--
-- Name: idx_quotations_opportunity; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_quotations_opportunity ON public.quotations USING btree (opportunity_id);


--
-- Name: idx_quotations_quotation_number; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_quotations_quotation_number ON public.quotations USING btree (quotation_number);


--
-- Name: idx_quotations_sales; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_quotations_sales ON public.quotations USING btree (salesperson_id);


--
-- Name: idx_quotations_status; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_quotations_status ON public.quotations USING btree (status);


--
-- Name: idx_quotations_valid_until; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_quotations_valid_until ON public.quotations USING btree (valid_until_date);


--
-- Name: idx_quote_items_quotation; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_quote_items_quotation ON public.quote_items USING btree (quotation_id);


--
-- Name: idx_sales_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_code ON public.sales_team USING btree (sales_code);


--
-- Name: idx_sales_order_items_line_number; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_sales_order_items_line_number ON public.sales_order_items USING btree (sales_order_id, line_number);


--
-- Name: idx_sales_order_items_product_code; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_sales_order_items_product_code ON public.sales_order_items USING btree (product_code);


--
-- Name: idx_sales_order_items_sales_order_id; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_sales_order_items_sales_order_id ON public.sales_order_items USING btree (sales_order_id);


--
-- Name: idx_sales_orders_customer; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_sales_orders_customer ON public.sales_orders USING btree (customer_id);


--
-- Name: idx_sales_orders_date; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_sales_orders_date ON public.sales_orders USING btree (order_date);


--
-- Name: idx_sales_orders_number; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_sales_orders_number ON public.sales_orders USING btree (so_number);


--
-- Name: idx_sales_orders_po; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_sales_orders_po ON public.sales_orders USING btree (po_reference);


--
-- Name: idx_sales_orders_quotation; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_sales_orders_quotation ON public.sales_orders USING btree (quotation_id);


--
-- Name: idx_sales_orders_sales; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_sales_orders_sales ON public.sales_orders USING btree (salesperson_id);


--
-- Name: idx_sales_orders_so_number; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_sales_orders_so_number ON public.sales_orders USING btree (so_number);


--
-- Name: idx_sales_territory; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_territory ON public.sales_team USING btree (territory);


--
-- Name: idx_system_logs_action; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_system_logs_action ON public.system_logs USING btree (action);


--
-- Name: idx_system_logs_timestamp; Type: INDEX; Schema: public; Owner: pkt_upload
--

CREATE INDEX idx_system_logs_timestamp ON public.system_logs USING btree ("timestamp");


--
-- Name: commission_tracking trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.commission_tracking FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_interactions trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.customer_interactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customers trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: pkt_upload
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: opportunities trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: pkt_upload
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_catalog trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.product_catalog FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quotations trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: pkt_upload
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sales_orders trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: pkt_upload
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sales_team trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.sales_team FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: territories trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.territories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: pkt_upload
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: follow_ups update_follow_ups_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: opportunities update_opportunities_updated_at; Type: TRIGGER; Schema: public; Owner: pkt_upload
--

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quotations update_quotations_updated_at; Type: TRIGGER; Schema: public; Owner: pkt_upload
--

CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sales_orders update_sales_orders_updated_at; Type: TRIGGER; Schema: public; Owner: pkt_upload
--

CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: commission_tracking commission_tracking_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commission_tracking
    ADD CONSTRAINT commission_tracking_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(sales_order_id);


--
-- Name: commission_tracking commission_tracking_salesperson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commission_tracking
    ADD CONSTRAINT commission_tracking_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES public.sales_team(sales_id);


--
-- Name: conversations conversations_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: conversations conversations_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(opportunity_id);


--
-- Name: customer_interactions customer_interactions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_interactions
    ADD CONSTRAINT customer_interactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: customer_interactions customer_interactions_salesperson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_interactions
    ADD CONSTRAINT customer_interactions_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES public.sales_team(sales_id);


--
-- Name: customers customers_sales_territory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_sales_territory_id_fkey FOREIGN KEY (sales_territory_id) REFERENCES public.territories(territory_id);


--
-- Name: quotations fk_quotations_salesperson; Type: FK CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT fk_quotations_salesperson FOREIGN KEY (salesperson_id) REFERENCES public.sales_team(sales_id);


--
-- Name: quote_items fk_quote_items_product; Type: FK CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT fk_quote_items_product FOREIGN KEY (product_code) REFERENCES public.product_catalog(product_code);


--
-- Name: sales_orders fk_sales_orders_salesperson; Type: FK CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT fk_sales_orders_salesperson FOREIGN KEY (salesperson_id) REFERENCES public.sales_team(sales_id);


--
-- Name: follow_ups follow_ups_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follow_ups
    ADD CONSTRAINT follow_ups_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: follow_ups follow_ups_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follow_ups
    ADD CONSTRAINT follow_ups_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(opportunity_id);


--
-- Name: opportunities opportunities_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: quotations quotations_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(opportunity_id);


--
-- Name: quotations quotations_salesperson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES public.sales_team(sales_id);


--
-- Name: quote_items quote_items_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(quotation_id) ON DELETE CASCADE;


--
-- Name: sales_order_items sales_order_items_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(sales_order_id) ON DELETE CASCADE;


--
-- Name: sales_orders sales_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: sales_orders sales_orders_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(opportunity_id);


--
-- Name: sales_orders sales_orders_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(quotation_id);


--
-- Name: sales_orders sales_orders_salesperson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pkt_upload
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES public.sales_team(sales_id);


--
-- Name: territories territories_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.territories
    ADD CONSTRAINT territories_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.sales_team(sales_id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO pkt_upload;


--
-- Name: TABLE commission_tracking; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.commission_tracking TO pkt_upload;


--
-- Name: SEQUENCE commission_tracking_commission_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.commission_tracking_commission_id_seq TO pkt_upload;


--
-- Name: TABLE conversations; Type: ACL; Schema: public; Owner: pkt_upload
--

GRANT ALL ON TABLE public.conversations TO pkt_user;


--
-- Name: SEQUENCE conversations_conversation_id_seq; Type: ACL; Schema: public; Owner: pkt_upload
--

GRANT ALL ON SEQUENCE public.conversations_conversation_id_seq TO pkt_user;


--
-- Name: TABLE customer_interactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.customer_interactions TO pkt_upload;


--
-- Name: SEQUENCE customer_interactions_interaction_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.customer_interactions_interaction_id_seq TO pkt_upload;


--
-- Name: TABLE customers; Type: ACL; Schema: public; Owner: pkt_upload
--

GRANT ALL ON TABLE public.customers TO pkt_user;


--
-- Name: SEQUENCE customers_customer_id_seq; Type: ACL; Schema: public; Owner: pkt_upload
--

GRANT ALL ON SEQUENCE public.customers_customer_id_seq TO pkt_user;


--
-- Name: TABLE file_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.file_attachments TO pkt_user;
GRANT ALL ON TABLE public.file_attachments TO pkt_upload;


--
-- Name: SEQUENCE file_attachments_attachment_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.file_attachments_attachment_id_seq TO pkt_user;
GRANT ALL ON SEQUENCE public.file_attachments_attachment_id_seq TO pkt_upload;


--
-- Name: TABLE follow_ups; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.follow_ups TO pkt_user;
GRANT ALL ON TABLE public.follow_ups TO pkt_upload;


--
-- Name: SEQUENCE follow_ups_follow_up_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.follow_ups_follow_up_id_seq TO pkt_user;
GRANT ALL ON SEQUENCE public.follow_ups_follow_up_id_seq TO pkt_upload;


--
-- Name: TABLE n8n_executions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.n8n_executions TO pkt_user;
GRANT ALL ON TABLE public.n8n_executions TO pkt_upload;


--
-- Name: SEQUENCE n8n_executions_execution_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.n8n_executions_execution_id_seq TO pkt_user;
GRANT ALL ON SEQUENCE public.n8n_executions_execution_id_seq TO pkt_upload;


--
-- Name: TABLE opportunities; Type: ACL; Schema: public; Owner: pkt_upload
--

GRANT ALL ON TABLE public.opportunities TO pkt_user;


--
-- Name: SEQUENCE opportunities_opportunity_id_seq; Type: ACL; Schema: public; Owner: pkt_upload
--

GRANT ALL ON SEQUENCE public.opportunities_opportunity_id_seq TO pkt_user;


--
-- Name: TABLE product_catalog; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_catalog TO pkt_upload;


--
-- Name: SEQUENCE product_catalog_product_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.product_catalog_product_id_seq TO pkt_upload;


--
-- Name: TABLE quotations; Type: ACL; Schema: public; Owner: pkt_upload
--

GRANT ALL ON TABLE public.quotations TO pkt_user;


--
-- Name: SEQUENCE quotations_quotation_id_seq; Type: ACL; Schema: public; Owner: pkt_upload
--

GRANT ALL ON SEQUENCE public.quotations_quotation_id_seq TO pkt_user;


--
-- Name: TABLE quote_items; Type: ACL; Schema: public; Owner: pkt_upload
--

GRANT ALL ON TABLE public.quote_items TO pkt_user;


--
-- Name: SEQUENCE quote_items_item_id_seq; Type: ACL; Schema: public; Owner: pkt_upload
--

GRANT ALL ON SEQUENCE public.quote_items_item_id_seq TO pkt_user;


--
-- Name: TABLE sales_orders; Type: ACL; Schema: public; Owner: pkt_upload
--

GRANT ALL ON TABLE public.sales_orders TO pkt_user;


--
-- Name: SEQUENCE sales_orders_sales_order_id_seq; Type: ACL; Schema: public; Owner: pkt_upload
--

GRANT ALL ON SEQUENCE public.sales_orders_sales_order_id_seq TO pkt_user;


--
-- Name: TABLE sales_team; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sales_team TO pkt_upload;


--
-- Name: SEQUENCE sales_team_sales_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.sales_team_sales_id_seq TO pkt_upload;


--
-- Name: TABLE system_logs; Type: ACL; Schema: public; Owner: pkt_upload
--

GRANT ALL ON TABLE public.system_logs TO pkt_user;


--
-- Name: SEQUENCE system_logs_log_id_seq; Type: ACL; Schema: public; Owner: pkt_upload
--

GRANT ALL ON SEQUENCE public.system_logs_log_id_seq TO pkt_user;


--
-- Name: TABLE territories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.territories TO pkt_upload;


--
-- Name: SEQUENCE territories_territory_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.territories_territory_id_seq TO pkt_upload;


--
-- PostgreSQL database dump complete
--

