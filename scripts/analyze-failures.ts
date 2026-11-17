import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('.private/full_evidence_inspection_dump.json', 'utf8'));
const failures = data.dbEvidenceResults.filter((r: any) => !r.streamSuccess);
console.log('Failures count:', failures.length);

const errs: Record<string, number> = {};
failures.forEach((f: any) => {
  errs[f.streamError] = (errs[f.streamError] || 0) + 1;
});
console.log('Error reasons:', errs);
console.log('Sample failure keys (first 15):', failures.slice(0, 15).map((f: any) => ({
  id: f.evidenceId,
  case: f.caseNumber,
  filename: f.filename,
  key: f.storageKey,
  err: f.streamError
})));
