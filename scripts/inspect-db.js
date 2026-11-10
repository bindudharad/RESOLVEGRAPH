const Database = require('better-sqlite3');
const db = new Database('./dev.db');
const cases = db.prepare('SELECT id, caseNumber, title FROM CaseRecord LIMIT 5').all();
console.log(JSON.stringify(cases, null, 2));
