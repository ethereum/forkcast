export interface Call {
  type: 'acdc' | 'acde' | 'acdt';
  date: string;
  number: string;
  path: string;
}

export const protocolCalls: Call[] = [
  // ACDC calls
  { type: 'acdc', date: '2025-04-03', number: '154', path: 'acdc/154' },
  { type: 'acdc', date: '2025-04-17', number: '155', path: 'acdc/155' },
  { type: 'acdc', date: '2025-05-01', number: '156', path: 'acdc/156' },
  { type: 'acdc', date: '2025-05-15', number: '157', path: 'acdc/157' },
  { type: 'acdc', date: '2025-05-29', number: '158', path: 'acdc/158' },
  { type: 'acdc', date: '2025-06-26', number: '159', path: 'acdc/159' },
  { type: 'acdc', date: '2025-07-10', number: '160', path: 'acdc/160' },
  { type: 'acdc', date: '2025-07-24', number: '161', path: 'acdc/161' },
  { type: 'acdc', date: '2025-08-07', number: '162', path: 'acdc/162' },
  { type: 'acdc', date: '2025-08-21', number: '163', path: 'acdc/163' },
  { type: 'acdc', date: '2025-09-04', number: '164', path: 'acdc/164' },
  { type: 'acdc', date: '2025-09-18', number: '165', path: 'acdc/165' },
  { type: 'acdc', date: '2025-10-02', number: '166', path: 'acdc/166' },

  // ACDE calls
  { type: 'acde', date: '2025-03-27', number: '208', path: 'acde/208' },
  { type: 'acde', date: '2025-04-10', number: '209', path: 'acde/209' },
  { type: 'acde', date: '2025-04-24', number: '210', path: 'acde/210' },
  { type: 'acde', date: '2025-05-08', number: '211', path: 'acde/211' },
  { type: 'acde', date: '2025-05-22', number: '212', path: 'acde/212' },
  { type: 'acde', date: '2025-06-05', number: '213', path: 'acde/213' },
  { type: 'acde', date: '2025-06-19', number: '214', path: 'acde/214' },
  { type: 'acde', date: '2025-07-03', number: '215', path: 'acde/215' },
  { type: 'acde', date: '2025-07-17', number: '216', path: 'acde/216' },
  { type: 'acde', date: '2025-07-31', number: '217', path: 'acde/217' },
  { type: 'acde', date: '2025-08-14', number: '218', path: 'acde/218' },
  { type: 'acde', date: '2025-08-28', number: '219', path: 'acde/219' },
  { type: 'acde', date: '2025-09-11', number: '220', path: 'acde/220' },
  { type: 'acde', date: '2025-09-25', number: '221', path: 'acde/221' },
  { type: 'acde', date: '2025-10-09', number: '222', path: 'acde/222' },

  // ACDT calls
  { type: 'acdt', date: '2025-06-16', number: '040', path: 'acdt/040' },
  { type: 'acdt', date: '2025-06-23', number: '041', path: 'acdt/041' },
  { type: 'acdt', date: '2025-06-30', number: '042', path: 'acdt/042' },
  { type: 'acdt', date: '2025-07-07', number: '043', path: 'acdt/043' },
  { type: 'acdt', date: '2025-07-14', number: '044', path: 'acdt/044' },
  { type: 'acdt', date: '2025-07-21', number: '045', path: 'acdt/045' },
  { type: 'acdt', date: '2025-07-28', number: '046', path: 'acdt/046' },
  { type: 'acdt', date: '2025-08-04', number: '047', path: 'acdt/047' },
  { type: 'acdt', date: '2025-08-11', number: '048', path: 'acdt/048' },
  { type: 'acdt', date: '2025-08-18', number: '049', path: 'acdt/049' },
  { type: 'acdt', date: '2025-08-25', number: '050', path: 'acdt/050' },
  { type: 'acdt', date: '2025-09-01', number: '051', path: 'acdt/051' },
  { type: 'acdt', date: '2025-09-08', number: '052', path: 'acdt/052' },
  { type: 'acdt', date: '2025-09-15', number: '053', path: 'acdt/053' },
  { type: 'acdt', date: '2025-09-22', number: '054', path: 'acdt/054' },
  { type: 'acdt', date: '2025-09-29', number: '055', path: 'acdt/055' },
  { type: 'acdt', date: '2025-10-06', number: '056', path: 'acdt/056' },
  { type: 'acdt', date: '2025-10-13', number: '057', path: 'acdt/057' },
];

// Helper to get recent calls
export const getRecentCalls = (limit: number = 5): Call[] => {
  return [...protocolCalls]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
};