import fs from 'node:fs/promises';
import path from 'node:path';

function makePdfBytes(textContent: string): Buffer {
  const escapedLines = textContent.split(/\r?\n/).map((line) =>
    line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  );
  const tjCommands = escapedLines
    .map((line, i) => `BT /F1 10 Tf 40 ${750 - i * 15} Td (${line}) Tj ET`)
    .join('\n');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(tjCommands, 'utf8')} >>\nstream\n${tjCommands}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

function makePngBytes(): Buffer {
  // 1x1 valid PNG
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
}

async function main() {
  const fixtureDir = path.join(process.cwd(), 'scratch', 'e2e-fixtures');
  await fs.mkdir(fixtureDir, { recursive: true });

  const invoiceText = `TAX INVOICE
Sold By: DigitalMart Commerce Private Limited
GSTIN: 27AABCD2345F1Z2
Seller ID: A2DIGITALMART01
Storefront: DigitalMart Official
Registered Office: Bandra-Kurla Complex, Mumbai, Maharashtra - 400051

Order ID: OD-AMZ-2026-994411
Order Date: 10.11.2026
Invoice Number: INV-DM-2026-99441
Invoice Date: 10.11.2026

Billed To: Alex Morgan
Shipping Address: Flat 4B, Silver Oak, Indiranagar, Bengaluru, Karnataka - 560038

Item: Logitech MX Master 3S Wireless Performance Mouse (Graphite)
Quantity: 1
Amount: INR 7,999.00
Authorized Signatory for DigitalMart Commerce Private Limited
`;

  const invoicePdf = makePdfBytes(invoiceText);
  const damagePng = makePngBytes();

  const sellerDeclarationText = `SELLER INSPECTION DECLARATION & STOCK ALLOCATION
Merchant: DigitalMart Commerce Private Limited (org_digitalmart)
GSTIN: 27AABCD2345F1Z2
Order Reference: OD-AMZ-2026-994411
Product: Logitech MX Master 3S Wireless Performance Mouse (Graphite)

We acknowledge receipt of complaint regarding transit damage.
Our warehouse dispatch log and packaging telemetry confirm carrier damage.
Replacement unit has been inspected and allocated from current stock:
SKU: LOGI-MXM3S-GRAPHITE
Serial Number: SN-MXM3S-2026-9941
Condition: Factory Sealed & Tamper-Evident Tape Verified
Availability: Ready for immediate dispatch upon platform authorization.
`;
  const sellerPdf = makePdfBytes(sellerDeclarationText);
  const sellerPhoto = makePngBytes();

  await fs.writeFile(path.join(fixtureDir, 'tax-invoice-digitalmart.pdf'), invoicePdf);
  await fs.writeFile(path.join(fixtureDir, 'product-damage-mouse.png'), damagePng);
  await fs.writeFile(path.join(fixtureDir, 'seller-inspection-stock-declaration.pdf'), sellerPdf);
  await fs.writeFile(path.join(fixtureDir, 'seller-replacement-unit-photo.png'), sellerPhoto);

  console.log('Successfully prepared synthetic evidence files in:', fixtureDir);
}

main().catch(console.error);
