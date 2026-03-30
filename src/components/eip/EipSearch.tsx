import React from 'react';
import { SearchTriggerButton } from '../search/SearchUi';

interface EipSearchProps {
  onOpen: () => void;
}

export const EipSearch: React.FC<EipSearchProps> = ({ onOpen }) => {
  return <SearchTriggerButton onOpen={onOpen} placeholder="Search EIPs..." ariaLabel="Search EIPs" />;
};
