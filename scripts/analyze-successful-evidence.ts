import fs from 'node:fs';
import path from 'node:path';

const data = JSON.parse(fs.readFileSync('.private/full_evidence_inspection_dump.json', 'utf8'));
const successes = data.dbEvidenceResults.filter((r: any) => r.streamSuccess);
console.log('Total successful streamed records:', successes.length);

const caseMap: Record<string, any[]> = {};
for (const s of successes) {
  caseMap[s.caseNumber] = caseMap[s.caseNumber] || [];
  caseMap[s.caseNumber].push(s);
}

console.log(`Associated with ${Object.keys(caseMap).length} unique cases.`);
console.log('\nCase distribution (top 15 cases):');
for (const [cNum, items] of Object.entries(caseMap).slice(0, 15)) {
  console.log(`- ${cNum}: ${items.length} files (e.g. ${items.map((i: any) => i.filename).join(', ')})`);
}

// Inspect unique files among successes
const uniqueFiles: Record<string, any> = {};
for (const s of successes) {
  if (!uniqueFiles[s.filename]) {
    uniqueFiles[s.filename] = {
      filename: s.filename,
      count: 0,
      format: s.fileInspection.format,
      pageCount: s.fileInspection.pageCount,
      dimensions: s.fileInspection.dimensions,
      sampleDetails: s.fileInspection.details,
      size: s.streamSizeBytes
    };
  }
  uniqueFiles[s.filename].count++;
}

console.log('\nUnique Evidence Assets among successful streams:');
console.table(Object.values(uniqueFiles));
