import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EIPS_DIR = path.join(__dirname, '../src/data/eips');

// Active statuses — EIPs that are part of a fork pipeline (not declined/withdrawn)
const ACTIVE_STATUSES = new Set(['Proposed', 'Considered', 'Scheduled', 'Included']);

// Priority order for current fork status (higher index = more advanced)
const STATUS_PRIORITY = ['Proposed', 'Considered', 'Scheduled', 'Included'];

function loadEips() {
  const files = fs.readdirSync(EIPS_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => JSON.parse(fs.readFileSync(path.join(EIPS_DIR, f), 'utf8')));
}

function getCurrentStatus(forkRelationship) {
  const history = forkRelationship.statusHistory;
  if (!history || history.length === 0) return null;
  return history[history.length - 1].status;
}

function getHighestActiveStatus(eip) {
  let highest = -1;
  let forkName = null;
  for (const fr of eip.forkRelationships) {
    const status = getCurrentStatus(fr);
    if (!status || !ACTIVE_STATUSES.has(status)) continue;
    const priority = STATUS_PRIORITY.indexOf(status);
    if (priority > highest) {
      highest = priority;
      forkName = fr.forkName;
    }
  }
  return highest >= 0 ? { status: STATUS_PRIORITY[highest], forkName } : null;
}

function audit(eips) {
  const issues = [];

  for (const eip of eips) {
    if (!eip.forkRelationships || eip.forkRelationships.length === 0) continue;

    const active = getHighestActiveStatus(eip);
    if (!active) continue; // all relationships are Declined/Withdrawn

    const eipIssues = [];

    if (!eip.layer) {
      eipIssues.push('missing layer (EL or CL)');
    }
    if (!eip.reviewer) {
      eipIssues.push('missing reviewer (bot, staff, or expert)');
    }
    if (!eip.laymanDescription) {
      eipIssues.push('missing laymanDescription');
    }
    if (!eip.stakeholderImpacts) {
      eipIssues.push('missing stakeholderImpacts');
    }
    if (!eip.benefits) {
      eipIssues.push('missing benefits');
    }

    if (eipIssues.length > 0) {
      issues.push({
        id: eip.id,
        title: eip.title,
        status: active.status,
        fork: active.forkName,
        issues: eipIssues,
      });
    }
  }

  // Sort by EIP id within each group
  issues.sort((a, b) => a.id - b.id);

  return issues;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { fork: null, help: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--fork' || args[i] === '-f') {
      options.fork = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      options.help = true;
    }
  }
  return options;
}

function printHelp() {
  console.log(`
EIP Audit
=========

Detects EIPs with active fork designations that are missing data.

Usage:
  node scripts/audit-eips.mjs [options]

Options:
  -f, --fork <name>   Only check EIPs active in this fork (e.g., Glamsterdam)
  -h, --help          Show this help message

Checks for:
  - layer             (EL or CL)
  - reviewer          (bot, staff, or expert)
  - laymanDescription
  - stakeholderImpacts
  - benefits
`);
}

function main() {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const eips = loadEips();
  let results = audit(eips);

  if (options.fork) {
    const forkLower = options.fork.toLowerCase();
    results = results.filter(r => r.fork.toLowerCase() === forkLower);
  }

  console.log('EIP Audit');
  console.log('=========\n');

  if (options.fork) {
    console.log(`Fork filter: ${options.fork}\n`);
  }

  if (results.length === 0) {
    console.log('No issues found. All active EIPs have complete data.');
    process.exit(0);
  }

  // Group by upgrade
  const grouped = {};
  for (const r of results) {
    if (!grouped[r.fork]) grouped[r.fork] = [];
    grouped[r.fork].push(r);
  }

  let totalIssues = 0;
  for (const fork of Object.keys(grouped).sort()) {
    const group = grouped[fork];
    console.log(`${fork} (${group.length})`);
    console.log('-'.repeat(40));
    for (const r of group) {
      console.log(`  EIP-${r.id} (${r.status})`);
      for (const issue of r.issues) {
        console.log(`    - ${issue}`);
        totalIssues++;
      }
    }
    console.log();
  }

  console.log(`${results.length} EIP(s) with ${totalIssues} issue(s) total.`);
  process.exit(1);
}

main();
