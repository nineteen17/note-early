import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import the function that generates the spec, not the raw TypeScript
// You'll need to export a function from swagger.zod.ts that returns the spec
import generateSwaggerSpec  from '../dist/src/config/swagger.zod.js'; // Note .js extension for compiled output

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputFilePath = path.resolve(__dirname, '../../Plan/client/swagger-docs-4.json');

console.log(`Attempting to write Swagger specification to: ${outputFilePath}`);

try {
  const outputDir = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}`);
  }

  // Call the function to generate the spec
  const swaggerSpec = generateSwaggerSpec();
  
  fs.writeFileSync(outputFilePath, JSON.stringify(swaggerSpec, null, 2));
  console.log(`✅ Swagger specification successfully written to ${outputFilePath}`);
} catch (error) {
  console.error(`❌ Error writing Swagger specification:`, error);
  process.exit(1);
}