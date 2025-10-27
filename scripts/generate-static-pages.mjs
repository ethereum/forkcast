import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read and parse the calls data from TypeScript file
function getProtocolCalls() {
  const callsFilePath = path.join(__dirname, "..", "src", "data", "calls.ts");
  const fileContent = fs.readFileSync(callsFilePath, "utf-8");

  // Extract the protocolCalls array from the TypeScript file
  const match = fileContent.match(
    /export const protocolCalls.*?=\s*(\[[\s\S]*?\]);/
  );
  if (!match) {
    throw new Error("Could not find protocolCalls in calls.ts");
  }

  // Parse the array (it's already valid JavaScript syntax)
  const callsArrayString = match[1]
    .replace(/type:\s*'(\w+)'/g, 'type: "$1"')
    .replace(/date:\s*'([\d-]+)'/g, 'date: "$1"')
    .replace(/number:\s*'(\d+)'/g, 'number: "$1"')
    .replace(/path:\s*'([^']+)'/g, 'path: "$1"');

  try {
    return eval(callsArrayString);
  } catch (e) {
    console.error("Failed to parse calls array:", e);
    throw e;
  }
}

const protocolCalls = getProtocolCalls();

// Define upgrade routes with their metadata
const upgrades = [
  {
    path: "upgrade/fusaka",
    title: "Fusaka - Forkcast",
    description:
      "See what's on the horizon and how it impacts you. Track Ethereum network upgrades and explore how changes affect users, developers, and the ecosystem.",
  },
  {
    path: "upgrade/glamsterdam",
    title: "Glamsterdam - Forkcast",
    description:
      "See what's on the horizon and how it impacts you. Track Ethereum network upgrades and explore how changes affect users, developers, and the ecosystem.",
  },
];

// Get full type name for calls
function getCallTypeName(type) {
  switch (type.toUpperCase()) {
    case "ACDC":
      return "All Core Devs Consensus";
    case "ACDE":
      return "All Core Devs Execution";
    case "ACDT":
      return "All Core Devs Testing";
    default:
      return type;
  }
}

// Function to generate HTML with proper meta tags for each route
function generateStaticPage(route, title, description) {
  const url = `https://forkcast.org/${route}`;

  // Read the dist/index.html (after build)
  const distIndexPath = path.join(__dirname, "..", "dist", "index.html");
  let html = fs.readFileSync(distIndexPath, "utf-8");

  // Replace meta tags in the HTML
  html = html
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(
      /<meta name="description" content=".*?"/,
      `<meta name="description" content="${description}"`
    )
    .replace(
      /<meta property="og:title" content=".*?"/,
      `<meta property="og:title" content="${title}"`
    )
    .replace(
      /<meta property="og:description" content=".*?"/,
      `<meta property="og:description" content="${description}"`
    )
    .replace(
      /<meta property="og:url" content=".*?"/,
      `<meta property="og:url" content="${url}"`
    )
    .replace(
      /<meta name="twitter:title" content=".*?"/,
      `<meta name="twitter:title" content="${title}"`
    )
    .replace(
      /<meta name="twitter:description" content=".*?"/,
      `<meta name="twitter:description" content="${description}"`
    )
    .replace(
      /<meta name="twitter:url" content=".*?"/,
      `<meta property="twitter:url" content="${url}"`
    );

  return html;
}

// Create static pages for all routes
function generateAllPages() {
  const distDir = path.join(__dirname, "..", "dist");

  // Check if dist directory exists
  if (!fs.existsSync(distDir)) {
    console.log('Error: dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  console.log("Generating static pages...\n");

  // Generate upgrade pages
  console.log("📦 Generating upgrade pages:");
  upgrades.forEach((upgrade) => {
    const routeParts = upgrade.path.split("/");
    let currentPath = distDir;

    // Create nested directories
    routeParts.forEach((part) => {
      currentPath = path.join(currentPath, part);
      if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath, { recursive: true });
      }
    });

    // Generate and write the HTML file
    const html = generateStaticPage(
      upgrade.path,
      upgrade.title,
      upgrade.description
    );
    const outputPath = path.join(currentPath, "index.html");
    fs.writeFileSync(outputPath, html);
    console.log(`  ✓ ${upgrade.path}`);
  });

  // Generate calls index page
  console.log("\n📞 Generating calls index:");
  const callsIndexPath = path.join(distDir, "calls");
  if (!fs.existsSync(callsIndexPath)) {
    fs.mkdirSync(callsIndexPath, { recursive: true });
  }

  const callsIndexHtml = generateStaticPage(
    "calls",
    "Protocol Calls - Forkcast",
    "Browse Ethereum protocol development calls including All Core Devs Consensus, Execution, and Testing meetings."
  );
  fs.writeFileSync(path.join(callsIndexPath, "index.html"), callsIndexHtml);
  console.log("  ✓ calls/index.html");

  // Generate individual call pages
  console.log("\n📞 Generating individual call pages:");
  protocolCalls.forEach((call) => {
    const fullPath = `calls/${call.path}`;
    const routeParts = fullPath.split("/");
    let currentPath = distDir;

    // Create nested directories
    routeParts.forEach((part) => {
      currentPath = path.join(currentPath, part);
      if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath, { recursive: true });
      }
    });

    // Generate and write the HTML file
    const typeName = getCallTypeName(call.type);
    const title = `${typeName} #${call.number} - Forkcast`;
    const description = `Watch ${typeName} call #${call.number} from ${call.date}.`;

    const html = generateStaticPage(fullPath, title, description);
    const outputPath = path.join(currentPath, "index.html");
    fs.writeFileSync(outputPath, html);
    console.log(`  ✓ ${fullPath}`);
  });

  console.log("\n✨ Static pages generated successfully!");
}

// Run the generation
generateAllPages();
