const Database = require('better-sqlite3');
const db = new Database('./dev.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'").all();
console.log(tables.map(t => ({ table: t.name, count: db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get().c })));
