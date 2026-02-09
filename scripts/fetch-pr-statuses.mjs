import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEVNET_SPECS_DIR = path.join(__dirname, '../src/data/devnet-specs');

async function fetchEIPLatestCommit(eipId) {
  try {
    const result = execSync(
      `gh api repos/ethereum/EIPs/commits?path=EIPS/eip-${eipId}.md&per_page=1`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const commits = JSON.parse(result);
    if (commits.length > 0) {
      return commits[0].sha;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchPRStatus(repo, number) {
  try {
    const result = execSync(`gh api repos/${repo}/pulls/${number}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const data = JSON.parse(result);

    let state;
    if (data.merged_at) {
      state = 'merged';
    } else if (data.draft) {
      state = 'draft';
    } else if (data.state === 'closed') {
      state = 'closed';
    } else {
      state = 'open';
    }

    return {
      state,
      title: data.title,
      headSha: state === 'merged' ? data.merge_commit_sha : data.head?.sha,
    };
  } catch (error) {
    throw new Error(`Failed to fetch PR ${repo}#${number}: ${error.message}`);
  }
}

async function fetchAllPRStatuses() {
  console.log('Fetching PR statuses from GitHub using gh CLI...');

  if (!fs.existsSync(DEVNET_SPECS_DIR)) {
    console.error(`Error: Devnet specs directory not found at ${DEVNET_SPECS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(DEVNET_SPECS_DIR).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('No devnet spec files found.');
    return;
  }

  for (const file of files) {
    const filePath = path.join(DEVNET_SPECS_DIR, file);
    console.log(`\nProcessing ${file}...`);

    const spec = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (spec.eips && spec.eips.length > 0) {
      console.log('  Fetching EIP commits...');
      for (const eip of spec.eips) {
        if (eip.changeStatus === 'new' || eip.changeStatus === 'updated') {
          const sha = await fetchEIPLatestCommit(eip.id);
          if (sha) {
            eip.lastCommitSha = sha;
            console.log(`  ✓ EIP-${eip.id}: ${sha.substring(0, 7)}`);
          }
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }

    if (!spec.prs || spec.prs.length === 0) {
      console.log('  No PRs to fetch.');
      fs.writeFileSync(filePath, JSON.stringify(spec, null, 2) + '\n');
      continue;
    }

    console.log('  Fetching PR statuses...');
    let updated = 0;
    let skipped = 0;
    for (const pr of spec.prs) {
      if (pr.status === 'merged' || pr.status === 'closed') {
        console.log(`  - ${pr.repo}#${pr.number}: ${pr.status} (cached)`);
        skipped++;
        continue;
      }
      try {
        const status = await fetchPRStatus(pr.repo, pr.number);
        pr.status = status.state;
        pr.title = status.title;
        pr.headSha = status.headSha;
        console.log(`  ✓ ${pr.repo}#${pr.number}: ${status.state}`);
        updated++;
        await new Promise(r => setTimeout(r, 100));
      } catch (error) {
        console.error(`  ✗ ${pr.repo}#${pr.number}: ${error.message}`);
      }
    }
    if (skipped > 0) {
      console.log(`  Skipped ${skipped} merged/closed PRs`);
    }

    fs.writeFileSync(filePath, JSON.stringify(spec, null, 2) + '\n');
    console.log(`  Updated ${updated}/${spec.prs.length} PRs in ${file}`);
  }

  console.log('\n✓ PR status fetch complete!');
}

fetchAllPRStatuses().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
