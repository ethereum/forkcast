import React from 'react';
import PublicNetworkUpgradePage from '../PublicNetworkUpgradePage';
import { getUpgradeById } from '../../data/upgrades';

const upgrade = getUpgradeById('glamsterdam')!;

const OverviewTab: React.FC = () => (
  <PublicNetworkUpgradePage
    forkName="Glamsterdam"
    displayName={upgrade.name}
    description={upgrade.description}
    status={upgrade.status}
    activationDate={upgrade.activationDate}
    metaEipLink={upgrade.metaEipLink}
    clientTeamPerspectives={upgrade.clientTeamPerspectives}
    embedded
    skipHeader
  />
);

export default OverviewTab;
