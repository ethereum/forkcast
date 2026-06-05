import React from 'react';
import PublicNetworkUpgradePage from '../PublicNetworkUpgradePage';
import { getUpgradeById } from '../../data/upgrades';

const upgrade = getUpgradeById('hegota')!;

const OverviewTab: React.FC = () => (
  <PublicNetworkUpgradePage
    forkName="Hegota"
    displayName={upgrade.name}
    description={upgrade.description}
    status={upgrade.status}
    activationDate={upgrade.activationDate}
    metaEipLink={upgrade.metaEipLink}
    embedded
    skipHeader
  />
);

export default OverviewTab;
