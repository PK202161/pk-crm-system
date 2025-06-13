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
  console.log('=== Parsing XML with Corrected Logic ===');
  
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
    paymentTerm: '', // เพิ่มตรงนี้
    items: [],
    subtotal: 0,
    discount: 0,
    vat: 0,
    total: 0,
    itemCount: 0,
    success: false,
    processedAt: new Date().toISOString(),
    encoding: 'utf-8-xml',
    parser: 'xml-corrected',
    contactPerson: '',      // เพิ่ม
    addressLine1: '',       // เพิ่ม
    addressLine2: '',       // เพิ่ม
    validDays: 0,           // เพิ่ม
  };

  try {
    // แยก XML เป็น rows และ cells
    const rowRegex = /<Row[^>]*>(.*?)<\/Row>/gs;
    const rows = [];
    let rowMatch;
    
    while ((rowMatch = rowRegex.exec(xmlText)) !== null) {
      const rowContent = rowMatch[1];
      const rowCells = [];

      // ปรับ regex ให้ดึง ss:Index ด้วย
      const cellRegex = /<Cell([^>]*)><Data ss:Type="([^"]*)"[^>]*>([^<]*)<\/Data><\/Cell>/g;
      let cellMatch;
      let lastIndex = 0;

      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        // หา ss:Index
        const cellAttr = cellMatch[1];
        const ssIndexMatch = /ss:Index="(\d+)"/.exec(cellAttr);
        let cellIndex = lastIndex + 1;
        if (ssIndexMatch) {
          cellIndex = parseInt(ssIndexMatch[1], 10);
        }
        // เติมช่องว่างถ้าข้าม index
        while (rowCells.length < cellIndex - 1) {
          rowCells.push({ type: 'String', value: '' });
        }
        rowCells.push({
          type: cellMatch[2],
          value: cellMatch[3].trim()
        });
        lastIndex = cellIndex;
      }

      if (rowCells.length > 0) {
        rows.push(rowCells);
      }
    }
    
    console.log(`Found ${rows.length} rows with data`);

    // หาข้อมูลพื้นฐาน
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      for (let cellIndex = 0; cellIndex < row.length; cellIndex++) {
        const cell = row[cellIndex];
        // เลขที่เอกสาร
        if (cell.value.match(/^QT\d+$/)) {
          result.documentType = 'quotation';
          result.documentNumber = cell.value;
          console.log('✅ Found quotation:', result.documentNumber);
        } else if (cell.value.match(/^SO\d+$/)) {
          result.documentType = 'sales_order';  
          result.documentNumber = cell.value;
          console.log('✅ Found sales order:', result.documentNumber);
        }
        // รหัสลูกค้า
        if (cell.value.match(/^CU\d+$/)) {
          result.customerCode = cell.value;
          console.log('✅ Customer code:', result.customerCode);
        }
        // วันที่/วันที่ส่งของ
        if (cell.type === 'DateTime') {
          let label = '';
          if (cellIndex > 0) {
            label = row[cellIndex - 1].value.replace(/\s/g, '');
          }
          const dateValue = cell.value.split('T')[0];

          // เช็ค label "ถึงวันที่" หรือ "วันที่ส่งของ"
          if (
            (label.includes('ถึงวันที่') || label.includes('วันที่ส่งของ'))
          ) {
            if (result.documentType === 'quotation' && !result.dueDate) {
              result.dueDate = dateValue;
              console.log('✅ Due date (QT):', result.dueDate);
            } else if (result.documentType === 'sales_order' && !result.deliveryDate) {
              result.deliveryDate = dateValue;
              console.log('✅ Delivery date (SO):', result.deliveryDate);
            }
          }
          // เช็ค label "วันที่" (แต่ต้องไม่ใช่ "ส่งของ" หรือ "ถึงวันที่") → date
          else if (
            label.includes('วันที่') &&
            !label.includes('ส่งของ') &&
            !label.includes('ถึงวันที่') &&
            !result.date
          ) {
            result.date = dateValue;
            console.log('✅ Document date (by label):', result.date);
          }
          // fallback
          else if (!result.date) {
            result.date = dateValue;
            console.log('✅ Document date (fallback):', result.date);
          }
          else if (result.documentType === 'quotation' && !result.dueDate) {
            result.dueDate = dateValue;
            console.log('✅ Due date (QT fallback):', result.dueDate);
          }
          else if (result.documentType === 'sales_order' && !result.deliveryDate) {
            result.deliveryDate = dateValue;
            console.log('✅ Delivery date (SO fallback):', result.deliveryDate);
          }
        }
        
        // พนักงานขาย
        if (cell.value.match(/^\d{4,5}-[\u0E00-\u0E7F]+/)) {
          result.salesPerson = cell.value;
          console.log('✅ Sales person:', result.salesPerson);
        }
        
        // PO Reference
        if (cell.value.startsWith('PO.') || cell.value.startsWith('PRPO')) {
          result.poReference = cell.value;
          console.log('✅ PO Reference:', result.poReference);
        }
        // เงื่อนไขชำระเงิน
        if (
          cell.value.includes('เงื่อนไข') ||
          cell.value.includes('ชำระเงิน')
        ) {
          // สมมติว่าข้อมูลอยู่ cell ถัดไป
          if (cellIndex + 1 < row.length) {
            result.paymentTerm = row[cellIndex + 1].value;
            console.log('✅ Payment term:', result.paymentTerm);
          }
        }

        // 1. Contact Person
        if (cell.value.includes('ติดต่อ')) {
          if (cellIndex + 1 < row.length) {
            result.contactPerson = row[cellIndex + 1].value;
            console.log('✅ Found Contact Person:', result.contactPerson);
          }
        }

        // 3. Validity Days
        if (cell.value.includes('ยืนราคา')) {
          if (cellIndex + 1 < row.length) {
            const validDaysText = row[cellIndex + 1].value;
            const match = validDaysText.match(/\d+/);
            if (match) {
              result.validDays = parseInt(match[0], 10);
              console.log('✅ Found Validity Days:', result.validDays);
            }
          }
        }
      }
    }

    // 2. Address (หลังเจอ customerName แล้ว)
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      let hasCustomerCode = false;
      for (const cell of row) {
        if (cell.value === result.customerCode) {
          hasCustomerCode = true;
          break;
        }
      }
      if (hasCustomerCode) {
        // ...หา customerName เดิม...
        // หลังเจอ customerName แล้ว:
        if (result.customerName) {
          // Address Line 1
          if (rowIndex + 1 < rows.length && rows[rowIndex + 1].length > 1) {
            result.addressLine1 = rows[rowIndex + 1][1].value;
            console.log('✅ Found Address Line 1:', result.addressLine1);
          }
          // Address Line 2
          if (rowIndex + 2 < rows.length && rows[rowIndex + 2].length > 1) {
            const potentialAddr2 = rows[rowIndex + 2][1].value;
            if (!potentialAddr2.includes('ติดต่อ')) {
              result.addressLine2 = potentialAddr2;
              console.log('✅ Found Address Line 2:', result.addressLine2);
            }
          }
        }
        break;
      }
    }

    // หาชื่อลูกค้า
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      
      let hasCustomerCode = false;
      for (const cell of row) {
        if (cell.value === result.customerCode) {
          hasCustomerCode = true;
          break;
        }
      }
      
      if (hasCustomerCode) {
        // หาชื่อลูกค้าในแถวเดียวกัน
        for (const cell of row) {
          if (cell.type === 'String' && 
              cell.value !== result.customerCode &&
              cell.value.length > 5 &&
              !cell.value.includes('เลขที่') &&
              !cell.value.includes('วันที่') &&
              (cell.value.includes('บริษัท') || 
               cell.value.includes('บมจ') ||
               cell.value.includes('จำกัด') ||
               cell.value.includes('ห้างหุ้นส่วน') ||
               cell.value.length > 15)) {
            result.customerName = cell.value;
            console.log('✅ Customer name (same row):', result.customerName);
            break;
          }
        }
        
        // ถ้าไม่เจอ ค้นหาแถวถัดไป
        if (!result.customerName && rowIndex + 1 < rows.length) {
          const nextRow = rows[rowIndex + 1];
          for (const cell of nextRow) {
            if (cell.type === 'String' && 
                cell.value.length > 5 &&
                !cell.value.includes('เลขที่') &&
                !cell.value.includes('วันที่') &&
                (cell.value.includes('บริษัท') || 
                 cell.value.includes('บมจ') ||
                 cell.value.includes('จำกัด') ||
                 cell.value.includes('ห้างหุ้นส่วน') ||
                 cell.value.length > 15)) {
              result.customerName = cell.value;
              console.log('✅ Customer name (next row):', result.customerName);
              break;
            }
          }
        }
        break;
      }
    }

    // วิเคราะห์รายการสินค้า - แก้ไข logic การจับคู่
    console.log('=== Analyzing Items with Corrected Logic ===');

    let itemHeaderRow = -1;
    let itemStartRow = -1;
    let itemEndRow = -1;
    
    // หา header row ของตารางสินค้า
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      // เพิ่ม log ดู header row
      console.log(`Row ${rowIndex}:`, row.map(c => c.value));
      
      // หาแถว header (มี "รหัสสินค้า", "รายละเอียด", "จำนวน", "ราคา")
      let hasProductCode = false;
      let hasDescription = false;
      let hasQuantity = false;
      let hasPrice = false;
      
      for (const cell of row) {
        if (cell.value.includes('รหัสสินค้า') || cell.value.includes('รหัส')) hasProductCode = true;
        if (cell.value.includes('รายละเอียด') || cell.value.includes('สินค้า')) hasDescription = true;
        if (cell.value.includes('จำนวน')) hasQuantity = true;
        if (cell.value.includes('ราคา')) hasPrice = true;
      }
      
      if (hasProductCode && hasDescription && hasQuantity && hasPrice) {
        itemHeaderRow = rowIndex;
        itemStartRow = rowIndex + 1;
        console.log('✅ Found item header at row:', itemHeaderRow);
        console.log('Header structure:', row.map(c => c.value));
        break;
      }
    }
    
    // หาจุดสิ้นสุดของตารางสินค้า
    if (itemStartRow >= 0) {
      for (let rowIndex = itemStartRow; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        
        // หาแถวที่มี "รวม" หรือ "รวมเป็นเงิน"
        for (const cell of row) {
          if (cell.value.includes('รวมเป็นเงิน') || 
              cell.value.includes('รวมทั้งหมด') ||
              (cell.value.includes('รวม') && !cell.value.includes('รวมทั้งสิ้น'))) {
            itemEndRow = rowIndex;
            console.log('✅ Found item end at row:', itemEndRow);
            break;
          }
        }
        if (itemEndRow >= 0) break;
      }
    }

    // แยกรายการสินค้า - แก้ไข logic การจับคู่ข้อมูล
    if (itemStartRow >= 0 && itemEndRow >= 0) {
      console.log(`Extracting items from row ${itemStartRow} to ${itemEndRow - 1}`);
      
      let minColumns = rows[itemHeaderRow]?.length || 7; // ใช้จำนวน column ของ header จริง

      for (let rowIndex = itemStartRow; rowIndex < itemEndRow; rowIndex++) {
        const row = rows[rowIndex];
        // ข้าม row ที่ cell ไม่ครบตาม header
        if (row.length < minColumns) continue;

        // ใช้ตำแหน่ง index ตาม header จริง
        const productCode = row[1]?.value || '';
        const description = row[2]?.value || '';
        const quantity = parseFloat((row[3]?.value || '0').replace(/,/g, ''));
        const unit = row[4]?.value || '';
        const unitPrice = parseFloat((row[5]?.value || '0').replace(/,/g, ''));
        const amount = parseFloat((row[minColumns - 1]?.value || '0').replace(/,/g, '')); // ใช้ column สุดท้ายเป็น amount

        if (productCode && description && quantity > 0 && amount > 0) {
          const item = {
            lineNumber: (result.items.length + 1).toString(),
            productCode,
            description,
            quantity,
            unit,
            unitPrice,
            amount,
            discount: 0
          };
          result.items.push(item);
        }
      }
    }

    // หายอดเงิน - แก้ไข logic การจับคู่
    console.log('=== Analyzing Totals with Corrected Logic ===');
    
    for (let rowIndex = itemEndRow || 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      
      for (let cellIndex = 0; cellIndex < row.length; cellIndex++) {
        const cell = row[cellIndex];
        
        if (cell.type === 'String') {
          // หาตัวเลขในแถวเดียวกัน
          let totalValue = 0;
          for (let i = cellIndex + 1; i < row.length; i++) {
            if (row[i].type === 'Number' || !isNaN(row[i].value.replace(/,/g, ''))) {
              totalValue = parseFloat(row[i].value.replace(/,/g, ''));
              break;
            }
          }
          
          if (totalValue > 0) {
            console.log(`  Checking: "${cell.value}" = ${totalValue}`);
            
            // จับคู่ให้ถูกต้อง
            if (cell.value.includes('รวมเป็นเงิน') && !cell.value.includes('ทั้งสิ้น')) {
              result.subtotal = totalValue;
              console.log('✅ Subtotal:', result.subtotal, 'from:', cell.value);
            } 
            else if (cell.value.includes('หัก') && cell.value.includes('ส่วนลด')) {
              result.discount = totalValue;
              console.log('✅ Discount:', result.discount, 'from:', cell.value);
            }
            else if (cell.value.includes('ภาษี') && !cell.value.includes('%')) {
              result.vat = totalValue;
              console.log('✅ VAT:', result.vat, 'from:', cell.value);
            } 
            else if (cell.value.includes('รวมทั้งสิ้น')) {
              result.total = totalValue;
              console.log('✅ Total:', result.total, 'from:', cell.value);
            }
          }
        }
      }
    }

    // คำนวณ subtotal จากรายการสินค้าถ้าไม่มี
    if (result.subtotal === 0 && result.items.length > 0) {
      result.subtotal = result.items.reduce((sum, item) => sum + item.amount, 0);
      console.log('✅ Calculated subtotal from items:', result.subtotal);
    }

    // ตรวจสอบความถูกต้องของยอดเงิน
    if (result.subtotal > 0 && result.vat > 0 && result.total > 0) {
      const expectedTotal = result.subtotal - result.discount + result.vat;
      if (Math.abs(expectedTotal - result.total) > 1) {
        console.log('⚠️  Total calculation mismatch. Expected:', expectedTotal, 'Got:', result.total);
        // แก้ไข discount ถ้าคำนวณไม่ตรง
        if (result.discount === result.subtotal) {
          result.discount = 0;
          console.log('✅ Corrected discount to:', result.discount);
        }
      }
    }

    // Fallback total calculation
    if (result.total === 0 && result.subtotal > 0) {
      result.total = result.subtotal - result.discount + result.vat;
      console.log('✅ Fallback total:', result.total);
    }

    result.itemCount = result.items.length;
    result.success = !!(result.documentNumber && result.customerCode && (result.total > 0 || result.items.length > 0));

    console.log('=== Corrected Parse Summary ===');
    console.log(`Success: ${result.success}`);
    console.log(`Type: ${result.documentType}`);
    console.log(`Number: ${result.documentNumber}`);
    console.log(`Customer: ${result.customerCode} - ${result.customerName}`);
    console.log(`Sales Person: ${result.salesPerson}`);
    console.log(`Date: ${result.date} → ${result.dueDate}`);
    console.log(`Items: ${result.itemCount}`);
    console.log(`Financial - Subtotal: ${result.subtotal}, Discount: ${result.discount}, VAT: ${result.vat}, Total: ${result.total}`);

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