import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read and parse the EIPs data from JSON file
function getEips() {
  const eipsFilePath = path.join(__dirname, '..', 'src', 'data', 'eips.json');
  const fileContent = fs.readFileSync(eipsFilePath, 'utf-8');
  return JSON.parse(fileContent);
}

// Read and parse the calls data from generated JSON file
function getProtocolCalls() {
  const callsFilePath = path.join(__dirname, '..', 'src', 'data', 'protocol-calls.generated.json');
  const fileContent = fs.readFileSync(callsFilePath, 'utf-8');
  return JSON.parse(fileContent);
}

// Read and parse devnet spec JSON files
function getDevnetSpecs() {
  const devnetsDir = path.join(__dirname, '..', 'src', 'data', 'devnets');
  if (!fs.existsSync(devnetsDir)) return [];
  return fs.readdirSync(devnetsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const content = JSON.parse(fs.readFileSync(path.join(devnetsDir, f), 'utf-8'));
      // Only include devnet spec files (have id, no upgrade field)
      if (content.id && !content.upgrade) return content;
      return null;
    })
    .filter(Boolean);
}

const protocolCalls = getProtocolCalls();
const eips = getEips();
const devnetSpecs = getDevnetSpecs();

// Define standalone pages with their metadata
const standalonePages = [
  {
    path: 'schedule',
    title: 'ACD Planning Sandbox - Forkcast',
    description: 'Internal planning tool for ACD participants. Explore hypothetical upgrade timelines.',
  },
  {
    path: 'complexity',
    title: 'EIP Test Complexity Analysis - Forkcast',
    description: 'Analyze EIP complexity scores from the STEEL team to help scope network upgrades.',
  },
  {
    path: 'priority',
    title: 'Client Prioritization - Forkcast',
    description: 'Aggregate view of Ethereum client team stances on EIPs proposed for network upgrades.',
  },
  {
    path: 'devnets',
    title: 'Devnet Prioritization - Forkcast',
    description: 'Track devnet inclusion status, test complexity, and client support for EIPs in upcoming network upgrades.',
  },
  {
    path: 'decisions',
    title: 'Key Decisions - Forkcast',
    description: 'Key decisions from Ethereum All Core Devs meetings.',
  },
];

// Define upgrade routes with their metadata
const upgrades = [
  {
    path: 'upgrade/pectra',
    title: 'Pectra Upgrade - Forkcast',
    description: 'Account abstraction, validator upgrades, and 2x blob throughput - making Ethereum faster and cheaper. Live on mainnet May 7, 2025.',
  },
  {
    path: 'upgrade/fusaka',
    title: 'Fusaka Upgrade - Forkcast',
    description: 'PeerDAS enables nodes to specialize in storing subsets of data while maintaining security, dramatically increasing data capacity for Layer 2 networks. Live on mainnet Dec 3, 2025.',
  },
  {
    path: 'upgrade/glamsterdam',
    title: 'Glamsterdam Upgrade - Forkcast',
    description: 'Enhancing Ethereum with Block-level Access Lists and ePBS for big efficiency and scalability gains.',
  },
  {
    path: 'upgrade/glamsterdam/stakeholders',
    title: 'Glamsterdam by Stakeholder - Forkcast',
    description: 'EIPs relevant to app developers, wallet devs, L2s, and other stakeholders in the Glamsterdam upgrade.',
  },
  {
    path: 'upgrade/hegota',
    title: 'Hegotá Upgrade - Forkcast',
    description: 'Post-Glamsterdam network upgrade in early planning.',
  },
];

// Get full type name for calls
const callTypeNames = {
  acdc: 'All Core Devs - Consensus',
  acde: 'All Core Devs - Execution',
  acdt: 'All Core Devs - Testing',
  epbs: 'ePBS Breakout',
  bal: 'BAL Breakout',
  focil: 'FOCIL Breakout',
  price: 'Glamsterdam Repricings',
  tli: 'Trustless Log Index',
  pqts: 'Post Quantum Transaction Signatures',
  rpc: 'RPC Standards',
  zkevm: 'L1-zkEVM Breakout',
  etm: 'Encrypt The Mempool',
  awd: 'AllWalletDevs',
  pqi: 'PQ Interop',
  fcr: 'Fast Confirmation Rule',
};

function getCallTypeName(type) {
  return callTypeNames[type.toLowerCase()] || type;
}

// Get EIP proposal prefix (EIP or RIP)
function getProposalPrefix(eip) {
  return eip.collection === 'RIP' ? 'RIP' : 'EIP';
}

// Function to generate HTML with proper meta tags for each route
function generateStaticPage(route, title, description) {
  const url = `https://forkcast.org/${route}`;

  // Read the dist/index.html (after build)
  const distIndexPath = path.join(__dirname, '..', 'dist', 'index.html');
  let html = fs.readFileSync(distIndexPath, 'utf-8');

  // Replace meta tags in the HTML
  html = html
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${description}"`)
    .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${title}"`)
    .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${description}"`)
    .replace(/<meta property="og:url" content=".*?"/, `<meta property="og:url" content="${url}"`)
    .replace(/<meta name="twitter:title" content=".*?"/, `<meta name="twitter:title" content="${title}"`)
    .replace(/<meta name="twitter:description" content=".*?"/, `<meta name="twitter:description" content="${description}"`)
    .replace(/<meta name="twitter:url" content=".*?"/, `<meta property="twitter:url" content="${url}"`);

  return html;
}

// Create static pages for all routes
function generateAllPages() {
  const distDir = path.join(__dirname, '..', 'dist');

  // Check if dist directory exists
  if (!fs.existsSync(distDir)) {
    console.log('Error: dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  console.log('Generating static pages...\n');

  // Generate standalone pages
  console.log('📄 Generating standalone pages:');
  standalonePages.forEach(page => {
    const pagePath = path.join(distDir, page.path);
    if (!fs.existsSync(pagePath)) {
      fs.mkdirSync(pagePath, { recursive: true });
    }

    const html = generateStaticPage(page.path, page.title, page.description);
    const outputPath = path.join(pagePath, 'index.html');
    fs.writeFileSync(outputPath, html);
    console.log(`  ✓ ${page.path}`);
  });

  // Generate upgrade pages
  console.log('\n📦 Generating upgrade pages:');
  upgrades.forEach(upgrade => {
    const routeParts = upgrade.path.split('/');
    let currentPath = distDir;

    // Create nested directories
    routeParts.forEach((part) => {
      currentPath = path.join(currentPath, part);
      if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath, { recursive: true });
      }
    });

    // Generate and write the HTML file
    const html = generateStaticPage(upgrade.path, upgrade.title, upgrade.description);
    const outputPath = path.join(currentPath, 'index.html');
    fs.writeFileSync(outputPath, html);
    console.log(`  ✓ ${upgrade.path}`);
  });

  // Generate EIPs index page
  console.log('\n📋 Generating EIPs index:');
  const eipsIndexPath = path.join(distDir, 'eips');
  if (!fs.existsSync(eipsIndexPath)) {
    fs.mkdirSync(eipsIndexPath, { recursive: true });
  }

  const eipsIndexHtml = generateStaticPage(
    'eips',
    'EIP Directory - Forkcast',
    'Browse all Ethereum Improvement Proposals tracked on Forkcast. Filter by status, network upgrade, and type.'
  );
  fs.writeFileSync(path.join(eipsIndexPath, 'index.html'), eipsIndexHtml);
  console.log('  ✓ eips/index.html');

  // Generate calls index page
  console.log('\n📞 Generating calls index:');
  const callsIndexPath = path.join(distDir, 'calls');
  if (!fs.existsSync(callsIndexPath)) {
    fs.mkdirSync(callsIndexPath, { recursive: true });
  }

  const callsIndexHtml = generateStaticPage(
    'calls',
    'Protocol Calls - Forkcast',
    'Browse Ethereum protocol development calls including All Core Devs Consensus, Execution, and Testing meetings.'
  );
  fs.writeFileSync(path.join(callsIndexPath, 'index.html'), callsIndexHtml);
  console.log('  ✓ calls/index.html');

  // Generate individual call pages
  protocolCalls.forEach(call => {
    const fullPath = `calls/${call.path}`;
    const routeParts = fullPath.split('/');
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
    const outputPath = path.join(currentPath, 'index.html');
    fs.writeFileSync(outputPath, html);
  });
  console.log(`\n📞 Generated ${protocolCalls.length} call pages`);

  // Generate individual EIP pages
  eips.forEach(eip => {
    const fullPath = `eips/${eip.id}`;
    const eipPath = path.join(distDir, 'eips', String(eip.id));

    if (!fs.existsSync(eipPath)) {
      fs.mkdirSync(eipPath, { recursive: true });
    }

    // Generate and write the HTML file
    const prefix = getProposalPrefix(eip);
    const title = `${prefix}-${eip.id} - Forkcast`;
    const description = `Description, timeline, and status of ${prefix}-${eip.id}`;

    const html = generateStaticPage(fullPath, title, description);
    const outputPath = path.join(eipPath, 'index.html');
    fs.writeFileSync(outputPath, html);
  });
  console.log(`📋 Generated ${eips.length} EIP pages`);

  // Generate devnet spec pages
  if (devnetSpecs.length > 0) {
    console.log('\n🧪 Generating devnet spec pages:');
    devnetSpecs.forEach(spec => {
      const fullPath = `devnets/${spec.id}`;
      const specPath = path.join(distDir, 'devnets', spec.id);

      if (!fs.existsSync(specPath)) {
        fs.mkdirSync(specPath, { recursive: true });
      }

      const title = `${spec.title} - Forkcast`;
      const description = `Devnet spec for ${spec.id}: EIP list, client implementation status, and spec references.`;

      const html = generateStaticPage(fullPath, title, description);
      fs.writeFileSync(path.join(specPath, 'index.html'), html);
    });
    console.log(`  Generated ${devnetSpecs.length} devnet spec pages`);
  }

  console.log('\n✨ Static pages generated successfully!');
}

// Run the generation
generateAllPages();