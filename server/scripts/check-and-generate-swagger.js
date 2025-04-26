import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { globSync } from 'glob'; // Use named import for sync version
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for source files (server root)
const serverRootDir = path.resolve(__dirname, '..');
// Path to store the hash of the last generated swagger spec sources
const hashFilePath = path.resolve(serverRootDir, '.swagger-hash');
// Script to run to actually generate the swagger file
const generationScriptPath = path.resolve(__dirname, 'generate-swagger-file.js');
// Source file patterns relative to serverRootDir
const sourceFilePatterns = [
  'src/config/swagger.zod.ts', // The main config file
  'src/modules/**/*.schema.ts', // All Zod schema files
  'src/modules/**/routes/*.ts', // All route files (for JSDoc comments)
  // Add any other file patterns that influence the swagger output
];
// --- End Configuration ---

/**
 * Calculates a SHA256 hash based on the content of files matching the patterns.
 * @param {string[]} patterns - Glob patterns relative to serverRootDir.
 * @returns {string} - The calculated hash.
 */
function getFilesContentHash(patterns) {
  console.log('Calculating hash for source files...');
  const hash = crypto.createHash('sha256');
  let fileCount = 0;

  patterns.forEach(pattern => {
    const files = globSync(pattern, { cwd: serverRootDir, absolute: true, nodir: true });
    files.forEach(file => {
      try {
        const content = fs.readFileSync(file);
        hash.update(content);
        fileCount++;
      } catch (err) {
        console.warn(`Warning: Could not read file ${file} for hashing:`, err.message);
        // Decide if you want to fail here or just warn
      }
    });
  });

  if (fileCount === 0) {
    console.warn('Warning: No source files found matching patterns for hashing.');
    return 'no-files-found'; // Return a specific string if no files were hashed
  }

  const calculatedHash = hash.digest('hex');
  console.log(`Hashed content of ${fileCount} files. Hash: ${calculatedHash}`);
  return calculatedHash;
}

/**
 * Reads the previously stored hash from the hash file.
 * @returns {string | null} - The stored hash or null if the file doesn't exist.
 */
function readStoredHash() {
  if (fs.existsSync(hashFilePath)) {
    try {
      const storedHash = fs.readFileSync(hashFilePath, 'utf-8');
      console.log(`Found stored hash: ${storedHash}`);
      return storedHash;
    } catch (err) {
      console.warn(`Warning: Could not read hash file ${hashFilePath}:`, err.message);
      return null;
    }
  } else {
    console.log('Hash file not found. Will generate Swagger.');
    return null;
  }
}

/**
 * Writes the new hash to the hash file.
 * @param {string} hash - The hash to write.
 */
function writeStoredHash(hash) {
  try {
    fs.writeFileSync(hashFilePath, hash);
    console.log(`Updated hash file: ${hashFilePath}`);
  } catch (err) {
    console.error(`❌ Error writing hash file ${hashFilePath}:`, err);
  }
}

/**
 * Executes the Swagger generation script.
 */
function runSwaggerGeneration() {
  console.log(`Executing Swagger generation script: ${generationScriptPath}...`);
  try {
    // Execute the script using Node.js
    // Ensure it runs with the project root as cwd if paths depend on it, but using absolute paths should be safer.
    execSync(`node "${generationScriptPath}"`, { stdio: 'inherit' }); // Inherit stdio to see logs/errors
    console.log('Swagger generation script executed.');
    return true; // Indicate success
  } catch (error) {
    console.error('❌ Error executing Swagger generation script:', error.message);
    return false; // Indicate failure
  }
}

// --- Main Logic ---
console.log('\nChecking if Swagger generation is needed...');
const currentHash = getFilesContentHash(sourceFilePatterns);
const storedHash = readStoredHash();

if (currentHash !== storedHash) {
  console.log('\n🔄 Changes detected or hash file missing.');
  const success = runSwaggerGeneration();
  if (success) {
    // Only update the hash if generation was successful
    writeStoredHash(currentHash);
    console.log('\n✨ Swagger generation complete.');
  } else {
    console.error('\n⚠️ Swagger generation failed. Hash file not updated.');
    process.exit(1); // Exit with error
  }
} else {
  console.log('\n👍 No changes detected. Swagger file is up-to-date.');
}

console.log(''); // Newline for cleaner output 