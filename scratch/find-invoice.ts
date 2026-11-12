import fs from 'fs';
import path from 'path';

// Let's search where OD438890793307262100.pdf is stored
function findFile(dir: string, name: string): string | null {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.next') {
      const res = findFile(fullPath, name);
      if (res) return res;
    } else if (entry.isFile() && entry.name.includes(name)) {
      return fullPath;
    }
  }
  return null;
}

const found = findFile(process.cwd(), 'OD438890793307262100');
console.log('Found PDF at:', found);
