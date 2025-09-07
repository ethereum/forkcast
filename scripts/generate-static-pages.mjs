import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define upgrade routes with their metadata
const upgrades = [
  {
    path: 'upgrade/fusaka',
    title: 'Fusaka - Forkcast',
    description: 'See what\'s on the horizon and how it impacts you. Track Ethereum network upgrades and explore how changes affect users, developers, and the ecosystem.',
  },
  {
    path: 'upgrade/glamsterdam',
    title: 'Glamsterdam - Forkcast',
    description: 'See what\'s on the horizon and how it impacts you. Track Ethereum network upgrades and explore how changes affect users, developers, and the ecosystem.',
  },
];

// Function to generate HTML with proper meta tags for each route
function generateStaticPage(upgrade) {
  const url = `https://forkcast.org/${upgrade.path}`;

  // Read the dist/index.html (after build)
  const distIndexPath = path.join(__dirname, '..', 'dist', 'index.html');
  let html = fs.readFileSync(distIndexPath, 'utf-8');

  // Replace meta tags in the HTML
  html = html
    .replace(/<title>.*?<\/title>/, `<title>${upgrade.title}</title>`)
    .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${upgrade.description}"`)
    .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${upgrade.title}"`)
    .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${upgrade.description}"`)
    .replace(/<meta property="og:url" content=".*?"/, `<meta property="og:url" content="${url}"`)
    .replace(/<meta name="twitter:title" content=".*?"/, `<meta name="twitter:title" content="${upgrade.title}"`)
    .replace(/<meta name="twitter:description" content=".*?"/, `<meta name="twitter:description" content="${upgrade.description}"`)
    .replace(/<meta name="twitter:url" content=".*?"/, `<meta property="twitter:url" content="${url}"`);

  return html;
}

// Create static pages for each upgrade route
function generateAllPages() {
  const distDir = path.join(__dirname, '..', 'dist');

  // Check if dist directory exists
  if (!fs.existsSync(distDir)) {
    console.log('Error: dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }

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
    const html = generateStaticPage(upgrade);
    const outputPath = path.join(currentPath, 'index.html');
    fs.writeFileSync(outputPath, html);
    console.log(`✓ Generated: ${outputPath}`);
  });

  console.log('\n✨ Static pages generated successfully!');
}

// Run the generation
generateAllPages();