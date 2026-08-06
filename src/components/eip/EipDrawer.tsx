import React, { useRef } from 'react';
import { Link } from '../navigation';
import { eipsData } from '../../data/eips';
import { getProposalPrefix } from '../../utils';
import { Drawer } from '../ui';
import { EipContent } from './EipContent';

interface EipDrawerProps {
  eipId: number | null;
  onClose: () => void;
}

export const EipDrawer: React.FC<EipDrawerProps> = ({ eipId, onClose }) => {
  const current = eipId != null ? eipsData.find((e) => e.id === eipId) : undefined;

  // `eipId` clears the moment the drawer starts closing, so keep showing the last
  // EIP until the exit animation finishes — otherwise the panel slides out empty.
  const lastShown = useRef(current);
  if (current) lastShown.current = current;
  const eip = current ?? lastShown.current;

  return (
    <Drawer
      isOpen={eipId != null && !!current}
      onClose={onClose}
      title={
        eip ? (
          <span className="flex items-center gap-3">
            <span className="font-mono text-purple-600 dark:text-purple-400">
              {getProposalPrefix(eip)}-{eip.id}
            </span>
            <Link
              to={`/eips/${eip.id}`}
              className="text-xs text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 underline underline-offset-2 transition-colors"
            >
              View full page
            </Link>
          </span>
        ) : null
      }
    >
      {eip && (
        <div className="p-4">
          <EipContent eip={eip} />
        </div>
      )}
    </Drawer>
  );
};
