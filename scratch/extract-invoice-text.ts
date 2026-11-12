import fs from 'fs';
import { extractText } from 'unpdf';

async function main() {
  const filePath = '.private/evidence/ev_22d29b89-8bda-4be1-8dd7-7e6bc456c3c9.pdf';
  const buffer = fs.readFileSync(filePath);
  const { text, totalPages } = await extractText(new Uint8Array(buffer));
  console.log('Total pages:', totalPages);
  console.log('--- EXTRACTED TEXT START ---');
  console.log(text);
  console.log('--- EXTRACTED TEXT END ---');
}

main().catch(console.error);
