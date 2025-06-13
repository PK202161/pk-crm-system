// 🔧 Corrected XML Parser - แก้ไข logic การจับคู่ข้อมูลให้ถูกต้อง

console.log('=== Corrected XML Parser Started ===');

// รับข้อมูลจาก Download node
const inputData = $input.first();
let xmlContent = null;

// ตรวจสอบ structure ของข้อมูล
if (inputData.binary && inputData.binary.data) {
  xmlContent = Buffer.from(inputData.binary.data.data, 'base64').toString('utf-8');
  console.log('Found XML in: binary.data');
} else if (inputData.json && inputData.json.data) {
  xmlContent = inputData.json.data;
  console.log('Found XML in: json.data');
} else if (inputData.data) {
  xmlContent = inputData.data;
  console.log('Found XML in: data');
}

if (!xmlContent) {
  throw new Error('Cannot find XML data in input');
}

console.log('XML content length:', xmlContent.length);

// Corrected PK XML Parser Function
function parseCorrectedPKXML(xmlText) {
  console.log('=== Parsing XML with Final, Unified Logic ===');

  const result = {
    documentType: 'unknown',
    documentNumber: '',
    customerCode: '',
    customerName: '',
    date: '',
    dueDate: '',
    deliveryDate: '',
    poReference: '',
    salesPerson: '',
    territory: '',
    paymentTerm: '',
    items: [],
    subtotal: 0,
    discount: 0,
    vat: 0,
    total: 0,
    itemCount: 0,
    success: false,
    processedAt: new Date().toISOString(),
    contactPerson: '',
    addressLine1: '',
    addressLine2: '',
    validDays: 0,
  };

  try {
    // 1. แยก XML เป็น rows และ cells
    const rowRegex = /<Row[^>]*>(.*?)<\/Row>/gs;
    const rows = [];
    let rowMatch;
    while ((rowMatch = rowRegex.exec(xmlText)) !== null) {
      const rowContent = rowMatch[1];
      const rowCells = [];
      const cellRegex = /<Cell([^>]*)><Data ss:Type="([^"]*)"[^>]*>([^<]*)<\/Data><\/Cell>/g;
      let cellMatch;
      let lastIndex = 0;
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        const cellAttr = cellMatch[1];
        const ssIndexMatch = /ss:Index="(\d+)"/.exec(cellAttr);
        let cellIndex = lastIndex + 1;
        if (ssIndexMatch) {
          cellIndex = parseInt(ssIndexMatch[1], 10);
        }
        while (rowCells.length < cellIndex - 1) {
          rowCells.push({ type: 'String', value: '' });
        }
        rowCells.push({ type: cellMatch[2], value: cellMatch[3].trim() });
        lastIndex = cellIndex;
      }
      if (rowCells.length > 0) {
        rows.push(rowCells);
      }
    }
    console.log(`Found ${rows.length} rows with data`);

    // 2. Unified Header Parsing Loop
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      for (let cellIndex = 0; cellIndex < row.length; cellIndex++) {
        const cell = row[cellIndex];
        const cellValue = cell.value;
        const nextCell = (cellIndex + 1 < row.length) ? row[cellIndex + 1] : null;

        // Document type & number
        if (cellValue.match(/^QT\d+$/)) { result.documentNumber = cellValue; result.documentType = 'quotation'; }
        else if (cellValue.match(/^SO\d+$/)) { result.documentNumber = cellValue; result.documentType = 'sales_order'; }
        // Customer code
        else if (cellValue.match(/^CU\d+$/)) { result.customerCode = cellValue; }
        // Sales person
        else if (cellValue.match(/^\d{4,5}-[\u0E00-\u0E7F]+/)) { result.salesPerson = cellValue; }
        // PO Reference
        else if (cellValue.startsWith('PO.') || cellValue.startsWith('PRPO')) { result.poReference = cellValue; }
        // Payment term
        else if (cellValue.includes('เงื่อนไข') || cellValue.includes('ชำระเงิน')) { if (nextCell) result.paymentTerm = nextCell.value; }
        // Contact person
        else if (cellValue.includes('ติดต่อ')) { if (nextCell) result.contactPerson = nextCell.value; }
        // Valid days
        else if (cellValue.includes('ยืนราคา')) { if (nextCell) { const match = nextCell.value.match(/\d+/); if (match) result.validDays = parseInt(match[0], 10); }}

        // Date logic
        if (cell.type === 'DateTime') {
          const label = (cellIndex > 0) ? row[cellIndex - 1].value.replace(/\s/g, '') : '';
          const dateValue = cell.value.split('T')[0];
          if (label.includes('ถึงวันที่')) { result.dueDate = dateValue; }
          else if (label.includes('วันที่ส่งของ')) { result.deliveryDate = dateValue; }
          else if (label.includes('วันที่')) { result.date = dateValue; }
        }
      }
    }

    // 3. Customer name & address (based on customerCode row)
    let customerCodeRowIndex = rows.findIndex(row => row.some(cell => cell.value === result.customerCode));
    if (customerCodeRowIndex !== -1) {
      // Customer name (next row, column 1)
      if (customerCodeRowIndex + 1 < rows.length && rows[customerCodeRowIndex + 1][1]) {
        result.customerName = rows[customerCodeRowIndex + 1][1].value;
      }
      // Address line 1 (next+1 row, column 1)
      if (customerCodeRowIndex + 2 < rows.length && rows[customerCodeRowIndex + 2][1]) {
        result.addressLine1 = rows[customerCodeRowIndex + 2][1].value;
      }
      // Address line 2 (next+2 row, column 1)
      if (customerCodeRowIndex + 3 < rows.length && rows[customerCodeRowIndex + 3][1]) {
        result.addressLine2 = rows[customerCodeRowIndex + 3][1].value;
      }
    }

    // 4. Analyze items and totals (เหมือนเดิม)
    let itemHeaderRow = -1;
    let itemStartRow = -1;
    let itemEndRow = -1;
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      let hasProductCode = false, hasDescription = false, hasQuantity = false, hasPrice = false;
      for (const cell of row) {
        if (cell.value.includes('รหัสสินค้า') || cell.value.includes('รหัส')) hasProductCode = true;
        if (cell.value.includes('รายละเอียด') || cell.value.includes('สินค้า')) hasDescription = true;
        if (cell.value.includes('จำนวน')) hasQuantity = true;
        if (cell.value.includes('ราคา')) hasPrice = true;
      }
      if (hasProductCode && hasDescription && hasQuantity && hasPrice) {
        itemHeaderRow = rowIndex;
        itemStartRow = rowIndex + 1;
        break;
      }
    }
    if (itemStartRow >= 0) {
      for (let rowIndex = itemStartRow; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        for (const cell of row) {
          if (cell.value.includes('รวมเป็นเงิน') || cell.value.includes('รวมทั้งหมด') ||
            (cell.value.includes('รวม') && !cell.value.includes('รวมทั้งสิ้น'))) {
            itemEndRow = rowIndex;
            break;
          }
        }
        if (itemEndRow >= 0) break;
      }
    }
    if (itemStartRow >= 0 && itemEndRow >= 0) {
      let minColumns = rows[itemHeaderRow]?.length || 7;
      for (let rowIndex = itemStartRow; rowIndex < itemEndRow; rowIndex++) {
        const row = rows[rowIndex];
        if (row.length < minColumns) continue;
        const productCode = row[1]?.value || '';
        const description = row[2]?.value || '';
        const quantity = parseFloat((row[3]?.value || '0').replace(/,/g, ''));
        const unit = row[4]?.value || '';
        const unitPrice = parseFloat((row[5]?.value || '0').replace(/,/g, ''));
        const amount = parseFloat((row[minColumns - 1]?.value || '0').replace(/,/g, ''));
        if (productCode && description && quantity > 0 && amount > 0) {
          result.items.push({
            lineNumber: (result.items.length + 1).toString(),
            productCode,
            description,
            quantity,
            unit,
            unitPrice,
            amount,
            discount: 0
          });
        }
      }
    }

    // 5. Analyze totals
    for (let rowIndex = itemEndRow || 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      for (let cellIndex = 0; cellIndex < row.length; cellIndex++) {
        const cell = row[cellIndex];
        if (cell.type === 'String') {
          let totalValue = 0;
          for (let i = cellIndex + 1; i < row.length; i++) {
            if (row[i].type === 'Number' || !isNaN(row[i].value.replace(/,/g, ''))) {
              totalValue = parseFloat(row[i].value.replace(/,/g, ''));
              break;
            }
          }
          if (totalValue > 0) {
            if (cell.value.includes('รวมเป็นเงิน') && !cell.value.includes('ทั้งสิ้น')) {
              result.subtotal = totalValue;
            }
            else if (cell.value.includes('หัก') && cell.value.includes('ส่วนลด')) {
              result.discount = totalValue;
            }
            else if (cell.value.includes('ภาษี') && !cell.value.includes('%')) {
              result.vat = totalValue;
            }
            else if (cell.value.includes('รวมทั้งสิ้น')) {
              result.total = totalValue;
            }
          }
        }
      }
    }

    if (result.subtotal === 0 && result.items.length > 0) {
      result.subtotal = result.items.reduce((sum, item) => sum + item.amount, 0);
    }
    if (result.total === 0 && result.subtotal > 0) {
      result.total = result.subtotal - result.discount + result.vat;
    }
    result.itemCount = result.items.length;
    result.success = !!(result.documentNumber && result.customerCode && (result.total > 0 || result.items.length > 0));
  } catch (error) {
    console.error('XML parsing error:', error.message);
    result.success = false;
    result.error = error.message;
  }
  return result;
}

// ประมวลผล XML
try {
  const parseResult = parseCorrectedPKXML(xmlContent);
  
  // เพิ่ม metadata จาก previous nodes
  try {
    const previousData = $('Extract File from Slack').first().json;
    parseResult.sourceFile = previousData.fileName;
    parseResult.uploadedBy = previousData.uploadedBy;
    parseResult.channel = previousData.channel;
    parseResult.slackTimestamp = previousData.timestamp;
  } catch (e) {
    console.log('Could not get previous node data:', e.message);
    parseResult.sourceFile = 'unknown.xml';
    parseResult.uploadedBy = 'unknown';
  }

  // สร้างข้อมูลสำหรับ database
  if (parseResult.success) {
    parseResult.dbReady = {
      customer: {
        customer_code: parseResult.customerCode,
        company_name: parseResult.customerName,
        contact_method: 'slack',
        status: 'active',
        address_line_1: parseResult.addressLine1 || '',
        address_line_2: parseResult.addressLine2 || '',
        primary_contact_info: parseResult.contactPerson || ''
      },
      
      opportunity: {
        customer_code: parseResult.customerCode,
        document_number: parseResult.documentNumber,
        document_type: parseResult.documentType,
        status: parseResult.documentType === 'quotation' ? 'quotation_sent' : 'closed_won',
        estimated_value: parseResult.total,
        assigned_salesperson: parseResult.salesPerson,
        created_date: parseResult.date,
        territory: parseResult.territory
      },
      
      document: {
        document_number: parseResult.documentNumber,
        document_type: parseResult.documentType,
        customer_code: parseResult.customerCode,
        customer_name: parseResult.customerName,
        document_date: parseResult.date,
        due_date: parseResult.dueDate,
        delivery_date: parseResult.deliveryDate,
        po_reference: parseResult.poReference,
        salesperson: parseResult.salesPerson,
        territory: parseResult.territory,
        subtotal: parseResult.subtotal,
        discount: parseResult.discount,
        vat_amount: parseResult.vat,
        total_amount: parseResult.total,
        item_count: parseResult.itemCount,
        payment_term: parseResult.paymentTerm,
        source_file: parseResult.sourceFile,
        processed_date: parseResult.processedAt,
        valid_days: parseResult.validDays || 0
      },
      
      items: parseResult.items.map(item => ({
        document_number: parseResult.documentNumber,
        line_number: item.lineNumber,
        product_code: item.productCode,
        product_description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        line_total: item.amount,
        discount: item.discount
      }))
    };
  }

  console.log('✅ Corrected XML parsing completed');
  return [{ json: parseResult }];

} catch (error) {
  console.error('❌ Corrected XML parsing failed:', error.message);
  
  return [{
    json: {
      success: false,
      error: error.message,
      debug: {
        xmlContentType: typeof xmlContent,
        xmlContentLength: xmlContent ? xmlContent.length : 0,
        inputStructure: Object.keys(inputData)
      }
    }
  }];
}