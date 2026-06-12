import OverviewTab from './glamsterdam/OverviewTab';
import StakeholdersTab from './glamsterdam/StakeholdersTab';
import EipCandidatesTab from './glamsterdam/EipCandidatesTab';
import ClientPriorityTab from './glamsterdam/ClientPriorityTab';
import TestComplexityTab from './glamsterdam/TestComplexityTab';

export type GlamsterdamTab =
  | 'overview'
  | 'stakeholders'
  | 'devnet-inclusion'
  | 'client-priority'
  | 'test-complexity';

function renderTab(tab: GlamsterdamTab) {
  switch (tab) {
    case 'overview':
      return <OverviewTab />;
    case 'stakeholders':
      return <StakeholdersTab />;
    case 'devnet-inclusion':
      return <EipCandidatesTab />;
    case 'client-priority':
      return <ClientPriorityTab />;
    case 'test-complexity':
      return <TestComplexityTab />;
  }
}

interface GlamsterdamUpgradePageProps {
  activeTab: GlamsterdamTab;
}

const GlamsterdamUpgradePage = ({ activeTab }: GlamsterdamUpgradePageProps) => renderTab(activeTab);

export default GlamsterdamUpgradePage;
