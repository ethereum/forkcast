export interface Call {
  type: 'acdc' | 'acde' | 'acdt';
  date: string;
  number: string;
  path: string;
}

export const protocolCalls: Call[] = [
  // ACDC calls
  { type: 'acdc', date: '2025-04-03', number: '154', path: 'acdc/2025-04-03_154' },
  { type: 'acdc', date: '2025-04-17', number: '155', path: 'acdc/2025-04-17_155' },
  { type: 'acdc', date: '2025-05-01', number: '156', path: 'acdc/2025-05-01_156' },
  { type: 'acdc', date: '2025-05-15', number: '157', path: 'acdc/2025-05-15_157' },
  { type: 'acdc', date: '2025-05-29', number: '158', path: 'acdc/2025-05-29_158' },
  { type: 'acdc', date: '2025-06-26', number: '159', path: 'acdc/2025-06-26_159' },
  { type: 'acdc', date: '2025-07-10', number: '160', path: 'acdc/2025-07-10_160' },
  { type: 'acdc', date: '2025-07-24', number: '161', path: 'acdc/2025-07-24_161' },
  { type: 'acdc', date: '2025-08-07', number: '162', path: 'acdc/2025-08-07_162' },
  { type: 'acdc', date: '2025-08-21', number: '163', path: 'acdc/2025-08-21_163' },
  { type: 'acdc', date: '2025-09-04', number: '164', path: 'acdc/2025-09-04_164' },

  // ACDE calls
  { type: 'acde', date: '2025-03-27', number: '208', path: 'acde/2025-03-27_208' },
  { type: 'acde', date: '2025-04-10', number: '209', path: 'acde/2025-04-10_209' },
  { type: 'acde', date: '2025-04-24', number: '210', path: 'acde/2025-04-24_210' },
  { type: 'acde', date: '2025-05-08', number: '211', path: 'acde/2025-05-08_211' },
  { type: 'acde', date: '2025-05-22', number: '212', path: 'acde/2025-05-22_212' },
  { type: 'acde', date: '2025-06-05', number: '213', path: 'acde/2025-06-05_213' },
  { type: 'acde', date: '2025-06-19', number: '214', path: 'acde/2025-06-19_214' },
  { type: 'acde', date: '2025-07-03', number: '215', path: 'acde/2025-07-03_215' },
  { type: 'acde', date: '2025-07-17', number: '216', path: 'acde/2025-07-17_216' },
  { type: 'acde', date: '2025-07-31', number: '217', path: 'acde/2025-07-31_217' },
  { type: 'acde', date: '2025-08-14', number: '218', path: 'acde/2025-08-14_218' },
  { type: 'acde', date: '2025-08-28', number: '219', path: 'acde/2025-08-28_219' },

  // ACDT calls
  { type: 'acdt', date: '2025-06-16', number: '040', path: 'acdt/2025-06-16_040' },
  { type: 'acdt', date: '2025-06-23', number: '041', path: 'acdt/2025-06-23_041' },
  { type: 'acdt', date: '2025-06-30', number: '042', path: 'acdt/2025-06-30_042' },
  { type: 'acdt', date: '2025-07-07', number: '043', path: 'acdt/2025-07-07_043' },
  { type: 'acdt', date: '2025-07-14', number: '044', path: 'acdt/2025-07-14_044' },
  { type: 'acdt', date: '2025-07-21', number: '045', path: 'acdt/2025-07-21_045' },
  { type: 'acdt', date: '2025-07-28', number: '046', path: 'acdt/2025-07-28_046' },
  { type: 'acdt', date: '2025-08-04', number: '047', path: 'acdt/2025-08-04_047' },
  { type: 'acdt', date: '2025-08-11', number: '048', path: 'acdt/2025-08-11_048' },
  { type: 'acdt', date: '2025-08-18', number: '049', path: 'acdt/2025-08-18_049' },
  { type: 'acdt', date: '2025-08-25', number: '050', path: 'acdt/2025-08-25_050' },
];

// Helper to get recent calls
export const getRecentCalls = (limit: number = 5): Call[] => {
  return [...protocolCalls]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
};