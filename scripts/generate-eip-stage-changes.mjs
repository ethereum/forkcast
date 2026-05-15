import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getEips() {
  const eipsFilePath = path.join(__dirname, '..', 'src', 'data', 'eips.json');
  return JSON.parse(fs.readFileSync(eipsFilePath, 'utf-8'));
}

function getProposalPrefix(eip) {
  return eip.title.startsWith('RIP-') ? 'RIP' : 'EIP';
}

// Get short stage label from statusHistory entry status
function getStageLabel(status) {
  switch (status) {
    case 'Considered':
      return 'Considered';
    case 'Proposed':
      return 'Proposed';
    case 'Scheduled':
      return 'Scheduled';
    case 'Declined':
      return 'Declined';
    case 'Included':
      return 'Included';
    case 'Withdrawn':
      return 'Withdrawn';
    default:
      return status;
  }
}

// Mirrors getFeaturedEips() from src/components/HomePage.tsx
// Finds the most recent inclusion stage change date across all forkRelationships,
// also tracks which fork and stage triggered the change.
function getRecentStageChanges(eips, count = 10) {
  const eipsWithDates = [];

  eips.forEach((eip) => {
    let mostRecentDate = null;
    let mostRecentFork = null;
    let mostRecentStage = null;

    eip.forkRelationships.forEach((fork) => {
      fork.statusHistory.forEach((entry) => {
        if (entry.date) {
          const entryDate = new Date(entry.date);
          if (!mostRecentDate || entryDate > mostRecentDate) {
            mostRecentDate = entryDate;
            mostRecentFork = fork.forkName;
            mostRecentStage = entry.status;
          }
        }
      });
    });

    if (mostRecentDate) {
      // Current stage = last entry in the most-recent fork's statusHistory
      const forkRel = eip.forkRelationships.find(
        (f) => f.forkName === mostRecentFork,
      );
      const currentStage = forkRel
        ? getStageLabel(
            forkRel.statusHistory[forkRel.statusHistory.length - 1].status,
          )
        : null;

      eipsWithDates.push({
        eip,
        lastUpdate: mostRecentDate,
        forkName: mostRecentFork,
        currentStage,
      });
    }
  });

  return eipsWithDates
    .sort((a, b) => b.lastUpdate.getTime() - a.lastUpdate.getTime())
    .slice(0, count);
}

function generate() {
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    console.log('Error: dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  const eips = getEips();
  const results = getRecentStageChanges(eips, 10);

  const output = {
    generatedAt: new Date().toISOString(),
    eips: results.map(({ eip, lastUpdate, forkName, currentStage }) => ({
      id: eip.id,
      title: eip.title.replace(/^(EIP|RIP)-\d+:\s*/, ''),
      prefix: getProposalPrefix(eip),
      status: eip.status,
      description: eip.laymanDescription || eip.description,
      lastStageChange: lastUpdate.toISOString().split('T')[0],
      lastStageChangeFork: forkName,
      currentStage,
      url: `/eips/${eip.id}`,
    })),
  };

  const apiDir = path.join(distDir, 'api');
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }

  const outputPath = path.join(apiDir, 'eip-stage-changes.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(
    `\n✨ Generated ${outputPath} with ${output.eips.length} entries`,
  );
}

generate();
