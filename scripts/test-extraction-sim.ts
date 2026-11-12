import { SellerExtractionService } from '../src/server/seller/seller-extraction.service';
import { SellerDirectoryService } from '../src/server/seller/seller-directory.service';
import { prisma } from '../src/lib/prisma';

async function main() {
  const invoiceText = `
TAX INVOICE / CASH MEMO
------------------------------------------------------------
Sold By: DigitalMart Commerce Private Limited
GSTIN: 27AABCD2345F1Z2
Seller ID: A2DIGITALMART01
Storefront: DigitalMart Official
Registered Office: 42, Bandra-Kurla Complex, Mumbai, Maharashtra - 400051

Order Number: 402-7719283-9182301
Order Date: 10.11.2026
Invoice Number: INV-DM-2026-99441
Invoice Date: 10.11.2026

Billed To: Alex Morgan
Shipping Address: Flat 4B, Silver Oak Heights, Indiranagar, Bengaluru, Karnataka - 560038

Item Description: Logitech MX Master 3S Wireless Performance Mouse (Graphite)
Quantity: 1
Unit Price: INR 6,778.81
CGST (9%): INR 610.10
SGST (9%): INR 610.10
Total Amount: INR 7,999.00
------------------------------------------------------------
Authorized Signatory for DigitalMart Commerce Private Limited
`;

  console.log('Testing extraction with synthetic invoice text...');
  const extracted = await SellerExtractionService.extractForCase({
    caseId: 'test-case-preview',
    marketplaceHint: 'Amazon',
    orderIdHint: '402-7719283-9182301',
    productNameHint: 'Logitech MX Master 3S Wireless Performance Mouse',
    documents: [
      {
        filename: 'invoice-dm.pdf',
        mimeType: 'application/pdf',
        rawText: invoiceText,
      }
    ]
  });

  console.log('EXTRACTED SELLER IDENTITY:', JSON.stringify(extracted, null, 2));

  const match = await SellerDirectoryService.matchAndResolveSeller(extracted);
  console.log('SELLER MATCH RESOLUTION:', JSON.stringify(match, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
