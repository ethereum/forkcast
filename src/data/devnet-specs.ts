import type { DevnetSpec } from '../types';

const modules = import.meta.glob('./devnets/*.json', { eager: true });

function isDevnetSpec(obj: unknown): obj is DevnetSpec {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    !('upgrade' in obj)
  );
}

const specs: DevnetSpec[] = Object.values(modules)
  .map((mod) => (mod as { default: unknown }).default)
  .filter(isDevnetSpec);

export function getDevnetSpec(id: string): DevnetSpec | undefined {
  return specs.find((s) => s.id === id);
}

export function getAllDevnetSpecIds(): string[] {
  return specs.map((s) => s.id);
}

/** Returns prev/next spec IDs within the same series (e.g. "bal-devnet"). */
export function getDevnetSeriesSiblings(id: string): {
  prev: string | null;
  next: string | null;
} {
  // Extract series prefix: "bal-devnet-3" → "bal-devnet"
  const lastDash = id.lastIndexOf('-');
  if (lastDash === -1) return { prev: null, next: null };
  const series = id.slice(0, lastDash);

  const siblings = specs
    .filter((s) => s.id.startsWith(series + '-'))
    .sort((a, b) => {
      const aNum = parseInt(a.id.slice(series.length + 1), 10);
      const bNum = parseInt(b.id.slice(series.length + 1), 10);
      return aNum - bNum;
    });

  const idx = siblings.findIndex((s) => s.id === id);
  return {
    prev: idx > 0 ? siblings[idx - 1].id : null,
    next: idx < siblings.length - 1 ? siblings[idx + 1].id : null,
  };
}
