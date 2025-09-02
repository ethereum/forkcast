import fs from 'fs';
import path from 'path';

const eipsFilePath = path.join(process.cwd(), 'src/data/eips.json');
const upgradesFilePath = path.join(process.cwd(), 'src/data/upgrades.ts');

const eips = JSON.parse(fs.readFileSync(eipsFilePath, 'utf-8'));
const upgradesFileContent = fs.readFileSync(upgradesFilePath, 'utf-8');

const upgradeIdRegex = /id: '([^']+)'/g;
let match;
const upgradeOrder = [];
while ((match = upgradeIdRegex.exec(upgradesFileContent)) !== null) {
  upgradeOrder.push(match[1]);
}

const eipsByUpgradeAndReviewer = {};

for (const eip of eips) {
  const reviewer = eip.reviewer || 'missing';

  let bestFork = 'Other';
  let bestForkIndex = Infinity;

  if (eip.forkRelationships && eip.forkRelationships.length > 0) {
    for (const relationship of eip.forkRelationships) {
      if (relationship.status !== 'Declined') {
        const forkName = relationship.forkName.toLowerCase();
        const index = upgradeOrder.indexOf(forkName);

        if (index !== -1 && index < bestForkIndex) {
          bestForkIndex = index;
          bestFork = relationship.forkName;
        }
      }
    }
  }

  if (!eipsByUpgradeAndReviewer[bestFork]) {
    eipsByUpgradeAndReviewer[bestFork] = {
      expert: [],
      staff: [],
      bot: [],
      missing: [],
    };
  }

  eipsByUpgradeAndReviewer[bestFork][reviewer].push({ id: eip.id, title: eip.title });
}

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m"
};

console.log(`${colors.bold}--- EIPs by Network Upgrade and Reviewer Status ---${colors.reset}`);
console.log(`${colors.dim}(Total EIPs: ${eips.length})${colors.reset}`);

const sortedUpgrades = Object.keys(eipsByUpgradeAndReviewer).sort((a, b) => {
  if (a === 'Other') return 1;
  if (b === 'Other') return -1;
  const aIndex = upgradeOrder.indexOf(a.toLowerCase());
  const bIndex = upgradeOrder.indexOf(b.toLowerCase());
  return aIndex - bIndex;
});

for (const upgradeName of sortedUpgrades) {
  const totalEips = Object.values(eipsByUpgradeAndReviewer[upgradeName]).reduce((sum, list) => sum + list.length, 0);
  console.log(`\n${colors.bold}${colors.yellow}--- ${upgradeName} ---${colors.reset} ${colors.dim}(${totalEips} EIPs)${colors.reset}`);

  for (const reviewer of ['expert', 'staff', 'bot', 'missing']) {
    const eipList = eipsByUpgradeAndReviewer[upgradeName][reviewer];
    if (eipList.length > 0) {
      console.log(`\n  ${colors.bold}${colors.cyan}-- ${reviewer.charAt(0).toUpperCase() + reviewer.slice(1)} --${colors.reset}`);
      eipList.sort((a, b) => a.id - b.id);
      for (const eip of eipList) {
        console.log(`    - ${eip.title}`);
      }
    }
  }
}
