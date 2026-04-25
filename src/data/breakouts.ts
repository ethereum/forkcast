// ACDT breakout sub-calls. Deliberately separate from breakout series
// (BAL, ePBS, etc.) in protocolCalls — those are standalone call series;
// these only exist as sub-calls to their parent ACDT call.

export type BreakoutKind = 'bal' | 'epbs';

export interface Breakout {
  parentPath: string;   // e.g. 'acdt/078'
  kind: BreakoutKind;
  artifactDir: string;  // fetched as `/artifacts/${artifactDir}/chat.txt`
  videoUrl: string;
}

export const breakoutLabels: Record<BreakoutKind, string> = {
  bal: 'BAL',
  epbs: 'ePBS',
};

export const breakouts: Breakout[] = [
  { parentPath: 'acdt/074', kind: 'bal',  artifactDir: 'acdt-breakouts/2026-03-16_074/bal',  videoUrl: 'https://youtu.be/dh2TXRCLAUs' },
  { parentPath: 'acdt/074', kind: 'epbs', artifactDir: 'acdt-breakouts/2026-03-16_074/epbs', videoUrl: 'https://youtu.be/1s4dm-zzEmM' },
  { parentPath: 'acdt/077', kind: 'bal',  artifactDir: 'acdt-breakouts/2026-04-13_077/bal',  videoUrl: 'https://youtu.be/al5FS-0biwA' },
  { parentPath: 'acdt/077', kind: 'epbs', artifactDir: 'acdt-breakouts/2026-04-13_077/epbs', videoUrl: 'https://youtu.be/-lHgAxinfIo' },
  { parentPath: 'acdt/078', kind: 'bal',  artifactDir: 'acdt-breakouts/2026-04-20_078/bal',  videoUrl: 'https://youtu.be/Cx0PSZkVtmM' },
  { parentPath: 'acdt/078', kind: 'epbs', artifactDir: 'acdt-breakouts/2026-04-20_078/epbs', videoUrl: 'https://youtu.be/BvLC4AE3cyY' },
];
