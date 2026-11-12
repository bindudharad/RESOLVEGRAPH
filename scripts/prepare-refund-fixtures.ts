import fs from 'node:fs/promises';
import path from 'node:path';

async function prepareRefundFixtures() {
  const fixtureDir = path.join(process.cwd(), 'scratch', 'e2e-fixtures');
  await fs.mkdir(fixtureDir, { recursive: true });

  // 1. Synthetic PDF Invoice for Refund Case (Wrong Product)
  const invoicePdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 480 >> stream
BT
/F1 14 Tf
50 720 Td
(TAX INVOICE - DIGITALMART COMMERCE PRIVATE LIMITED) Tj
/F1 10 Tf
0 -25 Td
(Sold By: DigitalMart Commerce Private Limited) Tj
0 -15 Td
(GSTIN: 27AABCD2345F1Z2 | State: Maharashtra) Tj
0 -15 Td
(Marketplace: Amazon India | Seller ID: A2DIGITALMART01) Tj
0 -20 Td
(Order ID: OD-AMZ-2026-881122 | Invoice No: INV-DM-2026-881122) Tj
0 -15 Td
(Order Date: 11-11-2026 | Invoice Date: 11-11-2026) Tj
0 -25 Td
(Item: Keychron K2 Wireless Mechanical Keyboard - Brown Switch) Tj
0 -15 Td
(SKU: KEY-K2-BROWN | Qty: 1 | HSN: 84716060) Tj
0 -20 Td
(Total Amount: INR 4,999.00 [Four Thousand Nine Hundred Ninety Nine Only]) Tj
0 -25 Td
(Payment Mode: Pre-paid Electronic Gateway | Status: Captured) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000227 00000 n 
0000000760 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
832
%%EOF`;

  await fs.writeFile(path.join(fixtureDir, 'tax-invoice-refund.pdf'), invoicePdf);
  console.log('Created tax-invoice-refund.pdf');

  // 2. Valid 1x1 PNG for wrong product photo
  const png1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  await fs.writeFile(path.join(fixtureDir, 'wrong-product-photo.png'), png1x1);
  console.log('Created wrong-product-photo.png');

  // 3. Seller inspection declaration agreeing to refund
  const sellerRefundDeclPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 420 >> stream
BT
/F1 14 Tf
50 720 Td
(DIGITALMART COMMERCE - WAREHOUSE DISPATCH ERROR DECLARATION) Tj
/F1 10 Tf
0 -25 Td
(Case Reference: RG-1466 | Order ID: OD-AMZ-2026-881122) Tj
0 -15 Td
(Seller: DigitalMart Commerce Private Limited [org_digitalmart]) Tj
0 -20 Td
(Warehouse Inspection Finding: Bin picking error confirmed at BLR DC.) Tj
0 -15 Td
(Customer received incorrect model due to barcode labeling mismatch.) Tj
0 -15 Td
(Correct item is currently out of stock. DigitalMart agrees to 100% Full Refund.) Tj
0 -20 Td
(Refund Authorization Amount: INR 4,999.00) Tj
0 -15 Td
(Authorized Signatory: Vikram Seth, Operations Director) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000227 00000 n 
0000000700 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
772
%%EOF`;

  await fs.writeFile(path.join(fixtureDir, 'seller-refund-declaration.pdf'), sellerRefundDeclPdf);
  console.log('Created seller-refund-declaration.pdf');
}

prepareRefundFixtures().catch(console.error);
