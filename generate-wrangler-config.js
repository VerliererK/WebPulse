// generate-wrangler-config.js
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const configFileName = 'wrangler.config.toml';
const outputFileName = 'wrangler.toml';
// Using __dirname ensures the path is relative to the script itself, regardless of where it's executed from
const configFilePath = path.join(__dirname, configFileName);
const outputFilePath = path.join(__dirname, outputFileName);
// --- End Configuration ---

console.log(`Reading config file: ${configFilePath}`);

// Check if the config file exists
if (!fs.existsSync(configFilePath)) {
  console.error(`Error: Config file "${configFileName}" not found at ${configFilePath}`);
  process.exit(1);
}

// Read the config file content
let configContent;
try {
  configContent = fs.readFileSync(configFilePath, 'utf8');
} catch (err) {
  console.error(`Error: Could not read config file "${configFileName}": ${err.message}`);
  process.exit(1);
}

console.log('config read successfully, starting environment variable substitution...');

// Use a regular expression to find all placeholders in the format ${VAR_NAME}
// and replace them with the corresponding environment variable value from process.env
const outputContent = configContent.replace(/\$\{([_a-zA-Z0-9]+)\}/g, (match, varName) => {
  const value = process.env[varName];
  if (value === undefined) {
    // Changed console.error to throw an Error as it's more idiomatic inside the replace callback
    throw new Error(`Error: Required environment variable "${varName}" is not set.`);
  }
  console.log(`  Replacing ${match} with value from environment variable "${varName}"`);
  return value;
});

console.log('\nEnvironment variable substitution complete.');
console.log(`Writing final configuration file: ${outputFilePath}`);

// Write the processed content to wrangler.toml
try {
  fs.writeFileSync(outputFilePath, outputContent, 'utf8');
  console.log(`Successfully generated ${outputFileName}!`);
} catch (err) {
  console.error(`Error: Could not write output file "${outputFileName}": ${err.message}`);
  process.exit(1);
}
