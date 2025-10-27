#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Path to artifacts directory
const artifactsDir = path.join(__dirname, "..", "public", "artifacts");

// Default config template
const defaultConfig = {
  videoUrl: null,
  sync: {
    transcriptStartTime: null,
    videoStartTime: null,
  },
};

// Function to process a single call directory
function processCallDirectory(callPath) {
  const configPath = path.join(callPath, "config.json");

  // Check if config.json already exists
  if (fs.existsSync(configPath)) {
    console.log(`✓ Config exists: ${path.relative(artifactsDir, callPath)}`);
    return false;
  }

  // Create config.json with default template
  try {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log(`✅ Created config: ${path.relative(artifactsDir, callPath)}`);
    return true;
  } catch (error) {
    console.error(
      `❌ Error creating config for ${path.relative(artifactsDir, callPath)}:`,
      error.message
    );
    return false;
  }
}

// Main function to iterate through all call directories
function generateConfigs() {
  console.log("🚀 Starting config generation...\n");

  let totalCalls = 0;
  let configsCreated = 0;
  let configsExisting = 0;

  // Get all call type directories (acdc, acde, acdt)
  const callTypes = fs.readdirSync(artifactsDir).filter((dir) => {
    const dirPath = path.join(artifactsDir, dir);
    return (
      fs.statSync(dirPath).isDirectory() &&
      ["acdc", "acde", "acdt"].includes(dir)
    );
  });

  console.log(`Found call types: ${callTypes.join(", ")}\n`);

  // Process each call type
  callTypes.forEach((callType) => {
    const typePath = path.join(artifactsDir, callType);
    console.log(`Processing ${callType.toUpperCase()} calls:`);

    // Get all call directories in this type
    const callDirs = fs.readdirSync(typePath).filter((dir) => {
      const dirPath = path.join(typePath, dir);
      return fs.statSync(dirPath).isDirectory() && dir.includes("_");
    });

    // Process each call directory
    callDirs.forEach((callDir) => {
      totalCalls++;
      const callPath = path.join(typePath, callDir);
      const created = processCallDirectory(callPath);

      if (created) {
        configsCreated++;
      } else {
        configsExisting++;
      }
    });

    console.log(""); // Empty line between types
  });

  // Print summary
  console.log("📊 Summary:");
  console.log(`   Total calls found: ${totalCalls}`);
  console.log(`   Configs created: ${configsCreated}`);
  console.log(`   Configs already existing: ${configsExisting}`);

  if (configsCreated > 0) {
    console.log(
      `\n✨ Successfully created ${configsCreated} new config files!`
    );
  } else {
    console.log("\n✨ All calls already have config files!");
  }
}

// Run the script
if (require.main === module) {
  generateConfigs();
}

module.exports = { generateConfigs };
