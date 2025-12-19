import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EIPS_DIR = path.join(__dirname, '../src/data/eips');
const OUTPUT_FILE = path.join(__dirname, '../src/data/eips.json');
const SCHEMA_FILE = path.join(__dirname, 'eip-schema.json');

// Initialize JSON Schema validator
const ajv = new Ajv({ allErrors: true });
const schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
const validate = ajv.compile(schema);

/**
 * Compiles individual EIP JSON files into a single eips.json file
 */
function compileEips() {
  console.log('Compiling EIP files...');

  // Check if eips directory exists
  if (!fs.existsSync(EIPS_DIR)) {
    console.error(`Error: EIPs directory not found at ${EIPS_DIR}`);
    process.exit(1);
  }

  // Read all JSON files from the eips directory
  const files = fs.readdirSync(EIPS_DIR).filter(file => file.endsWith('.json'));

  if (files.length === 0) {
    console.error(`Error: No JSON files found in ${EIPS_DIR}`);
    process.exit(1);
  }

  // Read, parse, and validate each EIP file
  const eips = [];
  const errors = [];

  for (const file of files) {
    const filePath = path.join(EIPS_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const eip = JSON.parse(content);

      // Validate against schema
      const valid = validate(eip);
      if (!valid) {
        const errorMessages = validate.errors
          .map(err => {
            const path = err.instancePath || '/';
            const extra = err.params?.additionalProperty
              ? ` (property: "${err.params.additionalProperty}")`
              : '';
            return `  - ${path}: ${err.message}${extra}`;
          })
          .join('\n');
        errors.push(`${file}:\n${errorMessages}`);
      }

      eips.push(eip);
    } catch (error) {
      console.error(`Error reading/parsing ${file}:`, error.message);
      process.exit(1);
    }
  }

  // Report validation errors
  if (errors.length > 0) {
    console.error('\nSchema validation errors:\n');
    console.error(errors.join('\n\n'));
    console.error(`\n${errors.length} file(s) failed validation.`);
    process.exit(1);
  }

  // Sort by EIP id
  eips.sort((a, b) => a.id - b.id);

  // Write compiled output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(eips, null, 2));

  console.log(`✓ Compiled ${eips.length} EIPs to ${OUTPUT_FILE}`);
}

compileEips();
