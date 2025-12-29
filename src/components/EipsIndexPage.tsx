import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ui/ThemeToggle';
import { eipsData } from '../data/eips';
import { getProposalPrefix, getLaymanTitle } from '../utils/eip';
import { EipSearch } from './eip/EipSearch';
import { Tooltip } from './ui';

type SortField = 'number' | 'date' | 'status';
type SortDirection = 'asc' | 'desc';

const EipsIndexPage: React.FC = () => {
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [forkFilters, setForkFilters] = useState<Set<string>>(new Set());
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Extract unique values for filters
  const { statuses, forks, categories } = useMemo(() => {
    const statusSet = new Set<string>();
    const forkSet = new Set<string>();
    const categorySet = new Set<string>();

    eipsData.forEach(eip => {
      if (eip.status) statusSet.add(eip.status);
      if (eip.category) categorySet.add(eip.category);

      eip.forkRelationships.forEach(fork => {
        forkSet.add(fork.forkName);
      });
    });

    // Define chronological order for forks (reverse chronological - latest first)
    const forkOrder = ['Hegota', 'Glamsterdam', 'Fusaka', 'Pectra', 'Dencun', 'Shapella'];
    const sortedForks = Array.from(forkSet).sort((a, b) => {
      const indexA = forkOrder.indexOf(a);
      const indexB = forkOrder.indexOf(b);
      // If both are in the order list, sort by index
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      // If only one is in the order list, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // If neither is in the order list, sort alphabetically
      return a.localeCompare(b);
    });

    return {
      statuses: Array.from(statusSet).sort(),
      forks: sortedForks,
      categories: Array.from(categorySet).sort(),
    };
  }, []);

  // Add "No Fork" to forks list
  const forksWithNone = [...forks, 'No Fork'];

  // Filter and sort EIPs
  const filteredAndSortedEips = useMemo(() => {
    let filtered = eipsData;

    // Apply status filter
    if (statusFilters.size > 0) {
      filtered = filtered.filter(eip => statusFilters.has(eip.status));
    }

    // Apply fork filter
    if (forkFilters.size > 0) {
      filtered = filtered.filter(eip => {
        if (forkFilters.has('No Fork')) {
          // Include EIPs with no fork relationships
          if (eip.forkRelationships.length === 0) return true;
        }
        // Check if EIP has any of the selected forks
        return eip.forkRelationships.some(fork => forkFilters.has(fork.forkName));
      });
    }

    // Apply category filter
    if (categoryFilters.size > 0) {
      filtered = filtered.filter(eip => eip.category && categoryFilters.has(eip.category));
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case 'number':
          compareValue = a.id - b.id;
          break;
        case 'date':
          compareValue = new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
          break;
        case 'status':
          compareValue = a.status.localeCompare(b.status);
          break;
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [statusFilters, forkFilters, categoryFilters, sortField, sortDirection]);

  // Toggle filter
  const toggleFilter = (filterSet: Set<string>, setFilterSet: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    const newSet = new Set(filterSet);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setFilterSet(newSet);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilters(new Set());
    setForkFilters(new Set());
    setCategoryFilters(new Set());
  };

  const hasActiveFilters = statusFilters.size > 0 || forkFilters.size > 0 || categoryFilters.size > 0;

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to get fork upgrade path
  const getForkPath = (forkName: string): string | null => {
    const forkMap: Record<string, string> = {
      'Shapella': '/upgrade/shapella',
      'Dencun': '/upgrade/dencun',
      'Pectra': '/upgrade/pectra',
      'Fusaka': '/upgrade/fusaka',
      'Glamsterdam': '/upgrade/glamsterdam',
      'Hegota': '/upgrade/hegota'
    };
    return forkMap[forkName] || null;
  };

  // Fork color helper - warm color palette
  const getForkColor = (forkName: string) => {
    switch (forkName) {
      case 'Pectra':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50';
      case 'Fusaka':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50';
      case 'Glamsterdam':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/50';
      case 'Hegota':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-900/50';
      case 'Dencun':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50';
      case 'Shapella':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600';
    }
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'number' ? 'desc' : 'asc');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <Link
            to="/"
            className="text-2xl font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 tracking-tight inline-block mb-2"
          >
            Forkcast
          </Link>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              EIP Directory
            </h1>
            <div className="flex items-center gap-3">
              <EipSearch />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {filteredAndSortedEips.length} {filteredAndSortedEips.length === 1 ? 'EIP' : 'EIPs'}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter Dropdown */}
            <div className="relative dropdown-container">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  statusFilters.size > 0
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <span>Status</span>
                {statusFilters.size > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full">
                    {statusFilters.size}
                  </span>
                )}
                <svg className={`w-4 h-4 transition-transform ${openDropdown === 'status' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openDropdown === 'status' && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {statuses.map(status => (
                      <label
                        key={status}
                        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={statusFilters.has(status)}
                          onChange={() => toggleFilter(statusFilters, setStatusFilters, status)}
                          className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {status}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fork Filter Dropdown */}
            <div className="relative dropdown-container">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'fork' ? null : 'fork')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  forkFilters.size > 0
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <span>Network Upgrade</span>
                {forkFilters.size > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full">
                    {forkFilters.size}
                  </span>
                )}
                <svg className={`w-4 h-4 transition-transform ${openDropdown === 'fork' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openDropdown === 'fork' && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {forksWithNone.map(fork => {
                      const forkColor = fork !== 'No Fork' ? getForkColor(fork) : '';
                      return (
                        <label
                          key={fork}
                          className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={forkFilters.has(fork)}
                            onChange={() => toggleFilter(forkFilters, setForkFilters, fork)}
                            className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                          />
                          {fork !== 'No Fork' ? (
                            <span className={`text-sm font-medium px-2 py-0.5 rounded ${forkColor}`}>
                              {fork}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-700 dark:text-slate-300">{fork}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Category Filter Dropdown */}
            {categories.length > 0 && (
              <div className="relative dropdown-container">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    categoryFilters.size > 0
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>Type</span>
                  {categoryFilters.size > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full">
                      {categoryFilters.size}
                    </span>
                  )}
                  <svg className={`w-4 h-4 transition-transform ${openDropdown === 'category' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'category' && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    <div className="p-2 space-y-1">
                      {categories.map(category => (
                        <label
                          key={category}
                          className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={categoryFilters.has(category)}
                            onChange={() => toggleFilter(categoryFilters, setCategoryFilters, category)}
                            className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Clear All Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="ml-auto text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Table - Desktop */}
        <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('number')}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      EIP #
                      {sortField === 'number' && (
                        <span className="text-purple-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('status')}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      Status
                      {sortField === 'status' && (
                        <span className="text-purple-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Forks
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('date')}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      Created
                      {sortField === 'date' && (
                        <span className="text-purple-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredAndSortedEips.map(eip => {
                  const title = getLaymanTitle(eip);
                  const isTitleLong = title.length > 60;

                  return (
                    <tr
                      key={eip.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          to={`/eips/${eip.id}`}
                          className="text-sm font-mono font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
                        >
                          {getProposalPrefix(eip)}-{eip.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {isTitleLong ? (
                          <Tooltip text={title}>
                            <Link
                              to={`/eips/${eip.id}`}
                              className="text-sm text-slate-900 dark:text-slate-100 hover:text-purple-600 dark:hover:text-purple-400 line-clamp-2 transition-colors"
                            >
                              {title}
                            </Link>
                          </Tooltip>
                        ) : (
                          <Link
                            to={`/eips/${eip.id}`}
                            className="text-sm text-slate-900 dark:text-slate-100 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                          >
                            {title}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {eip.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {eip.category || eip.type}
                        </div>
                      </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {eip.forkRelationships.length > 0 ? (
                          eip.forkRelationships.map((fork, idx) => {
                            const forkPath = getForkPath(fork.forkName);
                            const forkColor = getForkColor(fork.forkName);
                            return forkPath ? (
                              <Link
                                key={idx}
                                to={forkPath}
                                onClick={(e) => e.stopPropagation()}
                                className={`px-1.5 py-0.5 text-xs font-medium rounded transition-colors ${forkColor}`}
                              >
                                {fork.forkName}
                              </Link>
                            ) : (
                              <span
                                key={idx}
                                className={`px-1.5 py-0.5 text-xs font-medium rounded ${forkColor}`}
                              >
                                {fork.forkName}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </div>
                    </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(eip.createdDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card List - Mobile */}
        <div className="md:hidden space-y-3">
          {filteredAndSortedEips.map(eip => (
            <Link
              key={eip.id}
              to={`/eips/${eip.id}`}
              className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-slate-700/20 transition-all hover:border-purple-300 dark:hover:border-purple-600"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-medium text-purple-600 dark:text-purple-400">
                    {getProposalPrefix(eip)}-{eip.id}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                    {eip.status}
                  </span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2 leading-snug">
                {getLaymanTitle(eip)}
              </h3>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{eip.category || eip.type}</span>
                <span>
                  {new Date(eip.createdDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short'
                  })}
                </span>
              </div>
              {eip.forkRelationships.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {eip.forkRelationships.map((fork, idx) => {
                    const forkPath = getForkPath(fork.forkName);
                    const forkColor = getForkColor(fork.forkName);
                    return forkPath ? (
                      <Link
                        key={idx}
                        to={forkPath}
                        onClick={(e) => e.stopPropagation()}
                        className={`px-1.5 py-0.5 text-xs font-medium rounded transition-colors ${forkColor}`}
                      >
                        {fork.forkName}
                      </Link>
                    ) : (
                      <span
                        key={idx}
                        className={`px-1.5 py-0.5 text-xs font-medium rounded ${forkColor}`}
                      >
                        {fork.forkName}
                      </span>
                    );
                  })}
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {filteredAndSortedEips.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              No EIPs match the selected filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EipsIndexPage;

