import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// IMPORTANT: Assumes the server code has been compiled to JavaScript first (e.g., using tsc)
// Adjust the import path if your compiled output directory or config file name is different.
import swaggerSpec from '../dist/config/swagger.zod.js'; 

// Calculate paths relative to the current script file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct the absolute path to the output file in the Plan/client directory
// Goes up two levels from server/scripts to the root, then into Plan/client
const outputFilePath = path.resolve(__dirname, '../../Plan/client/swagger-docs-4.json');

console.log(`Attempting to write Swagger specification to: ${outputFilePath}`);

try {
  // Ensure the target directory exists (optional, but good practice)
  const outputDir = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}`);
  }

  // Write the swaggerSpec object to the JSON file
  fs.writeFileSync(outputFilePath, JSON.stringify(swaggerSpec, null, 2)); // Using 2 spaces for indentation

  console.log(`✅ Swagger specification successfully written to ${outputFilePath}`);
} catch (error) {
  console.error(`❌ Error writing Swagger specification:`, error);
  process.exit(1); // Exit with error code
} 