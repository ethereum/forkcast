import React from 'react';
import { Tooltip } from './Tooltip';
import { getUpgradeById } from '../../data/upgrades';
import { canonicalHref } from '../../utils/path';

interface UpgradeMascotProps {
  upgradeId: string;
  /** Tailwind text size. Defaults to matching a `text-3xl` page heading. */
  size?: string;
  /**
   * Link through to EIP-8066, which defines the tradition. Off inside an
   * element that is already a link, where a nested anchor would swallow clicks.
   */
  linked?: boolean;
  className?: string;
}

/**
 * The upgrade's mascot. Renders nothing for an upgrade whose mascot hasn't
 * been picked yet.
 */
export const UpgradeMascot: React.FC<UpgradeMascotProps> = ({
  upgradeId,
  size = 'text-3xl',
  linked = true,
  className = '',
}) => {
  const mascot = getUpgradeById(upgradeId)?.mascot;
  if (!mascot) return null;

  const glyph = <span aria-hidden="true">{mascot.emoji}</span>;
  const { source } = mascot;
  const label = source
    ? `${mascot.name}, the upgrade mascot — ${source.label}`
    : `${mascot.name}, the upgrade mascot, per EIP-8066`;

  return (
    <Tooltip
      className={`align-baseline ${className}`}
      content={
        <span className="block">
          <span className="font-medium">{mascot.name}</span>
          <span className="text-slate-500 dark:text-slate-400"> · upgrade mascot</span>
          {mascot.note && (
            <span className="block mt-0.5 text-slate-600 dark:text-slate-300">{mascot.note}</span>
          )}
          {source && linked && (
            <span className="block mt-1 text-purple-600 dark:text-purple-400">
              {source.label} ↗
            </span>
          )}
        </span>
      }
    >
      {linked ? (
        <a
          href={source ? source.url : canonicalHref('/eips/8066')}
          {...(source ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          aria-label={label}
          className={`${size} leading-none opacity-85 hover:opacity-100 transition-opacity`}
        >
          {glyph}
        </a>
      ) : (
        <span role="img" aria-label={label} className={`${size} leading-none opacity-85`}>
          {glyph}
        </span>
      )}
    </Tooltip>
  );
};
