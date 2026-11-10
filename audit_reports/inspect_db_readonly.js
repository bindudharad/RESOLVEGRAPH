const Database = require('better-sqlite3');
const path = require('path');

const db = new Database('./dev.db', { readonly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();

console.log('=== ALL 68 DATABASE TABLES ===');
tables.forEach((t, idx) => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get().count;
  console.log(`${(idx + 1).toString().padStart(2)}. ${t.name.padEnd(35)} : ${count} records`);
});

// Look for evidence related tables
const evidenceTables = tables.filter(t => t.name.toLowerCase().includes('evidence'));
console.log('\n=== EVIDENCE RELATED TABLES ===', evidenceTables.map(t => t.name));

// Look for payment/transaction related tables
const paymentTables = tables.filter(t => t.name.toLowerCase().includes('pay') || t.name.toLowerCase().includes('trans'));
console.log('\n=== PAYMENT/TRANSACTION RELATED TABLES ===', paymentTables.map(t => t.name));

// Look for audit related tables
const auditTables = tables.filter(t => t.name.toLowerCase().includes('audit'));
console.log('\n=== AUDIT RELATED TABLES ===', auditTables.map(t => t.name));

db.close();
