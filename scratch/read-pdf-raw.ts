import fs from 'fs';

async function parsePdf() {
  const filePath = '.private/evidence/ev_22d29b89-8bda-4be1-8dd7-7e6bc456c3c9.pdf';
  const buffer = fs.readFileSync(filePath);
  // Let's do a simple string search or regex over buffer for printable strings
  const text = buffer.toString('latin1');
  const matches = text.match(/\((.*?)\)|\[(.*?)\]/g) || [];
  console.log('Sample text chunks:');
  const sample = matches.filter(m => m.length > 5 && /[a-zA-Z]/.test(m)).slice(0, 30);
  console.log(sample.join('\n'));
}

parsePdf().catch(console.error);
