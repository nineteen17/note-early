import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '../dist');

async function fixImports(dir) {
  const files = await readdir(dir, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = join(dir, file.name);
    
    if (file.isDirectory()) {
      await fixImports(filePath);
    } else if (file.name.endsWith('.js')) {
      let content = await readFile(filePath, 'utf8');
      let modified = false;
      
      // Fix ES module imports (import ... from '...')
      content = content.replace(
        /from\s+['"](\.[^'"]*?)['"];?/g,
        (match, importPath) => {
          if (!importPath.endsWith('.js') && !importPath.includes('node_modules')) {
            modified = true;
            return match.replace(importPath, `${importPath}.js`);
          }
          return match;
        }
      );
      
      // Fix dynamic imports (import('...'))
      content = content.replace(
        /import\s*\(\s*['"](\.[^'"]*?)['"]\s*\)/g,
        (match, importPath) => {
          if (!importPath.endsWith('.js') && !importPath.includes('node_modules')) {
            modified = true;
            return match.replace(importPath, `${importPath}.js`);
          }
          return match;
        }
      );
      
      if (modified) {
        await writeFile(filePath, content);
        console.log(`Fixed imports in: ${filePath}`);
      }
    }
  }
}

console.log('Fixing ES module imports...');
fixImports(distDir)
  .then(() => console.log('✅ Import fixing complete!'))
  .catch(console.error);