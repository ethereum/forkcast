import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Logo } from './ui/Logo';
import ThemeToggle from './ui/ThemeToggle';
import { useDevnetSpec } from '../hooks/useDevnetSpec';
import { useMetaTags } from '../hooks/useMetaTags';
import { ImplementationStatus, DevnetSpecPR } from '../types/devnet-spec';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ChangeStatusBadge({ status, commitSha }: { status: string; commitSha?: string }) {
  const baseClasses = 'px-1.5 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide';

  let colorClasses = '';
  let label = '';

  switch (status) {
    case 'new':
      colorClasses = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      label = 'new';
      break;
    case 'updated':
      colorClasses = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      label = 'updated';
      break;
    default:
      return null;
  }

  if (commitSha) {
    return (
      <a
        href={`https://github.com/ethereum/EIPs/commit/${commitSha}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClasses} ${colorClasses} hover:opacity-80`}
      >
        {label}
      </a>
    );
  }

  return (
    <span className={`${baseClasses} ${colorClasses}`}>
      {label}
    </span>
  );
}

function ImplStatusCell({ status }: { status: ImplementationStatus }) {
  switch (status) {
    case 'done':
      return (
        <span className="inline-flex items-center justify-center size-6 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" title="Done">
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      );
    case 'in-progress':
      return (
        <span className="inline-flex items-center justify-center size-6 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" title="In Progress">
          <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5" />
          </svg>
        </span>
      );
    case 'not-started':
      return (
        <span className="inline-flex items-center justify-center size-6 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400" title="Not Started">
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500" title="Unknown">
          ?
        </span>
      );
  }
}

function PRStatusBadge({ pr }: { pr: DevnetSpecPR }) {
  if (!pr.status) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
        unknown
      </span>
    );
  }

  const commitUrl = pr.headSha ? `https://github.com/${pr.repo}/commit/${pr.headSha}` : undefined;
  const badgeClasses: Record<NonNullable<DevnetSpecPR['status']>, string> = {
    merged: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    closed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    draft: 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300',
  };

  if (commitUrl) {
    return (
      <a
        href={commitUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`px-2 py-0.5 text-xs font-medium rounded-full hover:opacity-80 ${badgeClasses[pr.status]}`}
      >
        {pr.status}
      </a>
    );
  }

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badgeClasses[pr.status]}`}>
      {pr.status}
    </span>
  );
}

const DevnetSpecPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { spec, loading, error } = useDevnetSpec(id);

  useMetaTags({
    title: spec ? `${spec.id} Spec Sheet - Forkcast` : 'Devnet Spec Sheet - Forkcast',
    description: spec
      ? `Spec sheet for ${spec.id}: EIP list, client implementation matrix, and PR tracker.`
      : 'Devnet spec sheet with EIP list, implementation matrix, and PR tracker.',
    url: `https://forkcast.org/devnets/${id}`,
  });

  if (loading) {
    return (
      <div className="min-h-dvh bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
        <div className="max-w-5xl mx-auto">
          <Logo size="md" className="mb-4" />
          <div className="flex items-center justify-center py-20">
            <svg className="size-6 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="min-h-dvh bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
        <div className="max-w-5xl mx-auto">
          <Logo size="md" className="mb-4" />
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
            <h2 className="text-lg font-semibold mb-2">Spec sheet not found</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              No spec sheet exists for devnet "{id}".
            </p>
            <Link
              to="/devnets"
              className="text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline"
            >
              Back to devnets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const elClients = spec.implementations.el.length > 0
    ? Object.keys(spec.implementations.el[0].clients).sort()
    : [];
  const clClients = spec.implementations.cl.length > 0
    ? Object.keys(spec.implementations.cl[0].clients).sort()
    : [];

  const eipPrMap = new Map<number, typeof spec.prs>();
  for (const pr of spec.prs) {
    if (pr.eipId) {
      const existing = eipPrMap.get(pr.eipId) || [];
      existing.push(pr);
      eipPrMap.set(pr.eipId, existing);
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <Logo size="md" className="mb-4" />
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Link
              to="/devnets"
              className="text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
            >
              Devnets
            </Link>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <h1 className="text-xl font-semibold">{spec.id}</h1>
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded">
              {spec.upgrade}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400 mt-2">
            {spec.launchDate && (
              <div className="flex items-center gap-1.5">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Launch: {formatDate(spec.launchDate)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Updated: {formatDate(spec.lastUpdated)}</span>
            </div>
          </div>

          {/* Spec Versions */}
          <div className="flex flex-wrap gap-2 mt-3">
            {spec.specVersions.consensusSpecs && (
              <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded">
                Consensus Specs: {spec.specVersions.consensusSpecs}
              </span>
            )}
            {spec.specVersions.executionSpecs && (
              <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded">
                Execution Specs: {spec.specVersions.executionSpecs}
              </span>
            )}
            {spec.specVersions.engineApi && (
              <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded">
                Engine API: {spec.specVersions.engineApi}
              </span>
            )}
          </div>

          {/* Notes */}
          {spec.notes && spec.notes.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg">
              {spec.notes.map((note, i) => (
                <p key={i} className="text-sm text-amber-800 dark:text-amber-300">{note}</p>
              ))}
            </div>
          )}
        </div>

        {/* EIP List */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">EIP List</h2>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600 dark:text-slate-400 w-12">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600 dark:text-slate-400">EIP</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600 dark:text-slate-400">Title</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600 dark:text-slate-400">Summary</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600 dark:text-slate-400">PRs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {spec.eips.map((eip) => {
                  const relatedPrs = eipPrMap.get(eip.id) || [];
                  return (
                    <tr key={eip.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-2.5">
                        <ChangeStatusBadge status={eip.changeStatus} commitSha={eip.lastCommitSha} />
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <Link
                          to={`/eips/${eip.id}`}
                          className="font-mono text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                        >
                          EIP-{eip.id}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100">
                        {eip.title}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 text-xs">
                        {eip.summary}
                      </td>
                      <td className="px-4 py-2.5">
                        {relatedPrs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {relatedPrs.map((pr) => (
                              <a
                                key={`${pr.repo}#${pr.number}`}
                                href={`https://github.com/${pr.repo}/pull/${pr.number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-1 underline-offset-2"
                              >
                                #{pr.number}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex flex-col gap-2">
            {spec.eips.map((eip) => {
              const relatedPrs = eipPrMap.get(eip.id) || [];
              return (
                <div key={eip.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ChangeStatusBadge status={eip.changeStatus} commitSha={eip.lastCommitSha} />
                    <Link
                      to={`/eips/${eip.id}`}
                      className="font-mono text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      EIP-{eip.id}
                    </Link>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">{eip.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{eip.summary}</p>
                  {relatedPrs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {relatedPrs.map((pr) => (
                        <a
                          key={`${pr.repo}#${pr.number}`}
                          href={`https://github.com/${pr.repo}/pull/${pr.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-1 underline-offset-2"
                        >
                          #{pr.number}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Implementation Matrix - EL */}
        {spec.implementations.el.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-1">Execution Layer Implementation</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Client readiness per EIP</p>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600 dark:text-slate-400">EIP</th>
                      {elClients.map((client) => (
                        <th key={client} className="px-3 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400">
                          {client}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {spec.implementations.el.map((row) => {
                      const eip = spec.eips.find((e) => e.id === row.eipId);
                      return (
                        <tr key={row.eipId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-2.5">
                            <Link
                              to={`/eips/${row.eipId}`}
                              className="font-mono text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                            >
                              EIP-{row.eipId}
                            </Link>
                            {eip && (
                              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{eip.title}</span>
                            )}
                          </td>
                          {elClients.map((client) => (
                            <td key={client} className="px-3 py-2.5 text-center">
                              <ImplStatusCell status={row.clients[client] || 'unknown'} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-2">
              {spec.implementations.el.map((row) => {
                const eip = spec.eips.find((e) => e.id === row.eipId);
                return (
                  <div key={row.eipId} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <Link
                      to={`/eips/${row.eipId}`}
                      className="font-mono text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      EIP-{row.eipId}
                    </Link>
                    {eip && <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{eip.title}</span>}
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {elClients.map((client) => (
                        <div key={client} className="flex items-center gap-1.5">
                          <ImplStatusCell status={row.clients[client] || 'unknown'} />
                          <span className="text-xs text-slate-600 dark:text-slate-400">{client}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Implementation Matrix - CL */}
        {spec.implementations.cl.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-1">Consensus Layer Implementation</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Client readiness per EIP</p>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600 dark:text-slate-400">EIP</th>
                      {clClients.map((client) => (
                        <th key={client} className="px-3 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400">
                          {client}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {spec.implementations.cl.map((row) => {
                      const eip = spec.eips.find((e) => e.id === row.eipId);
                      return (
                        <tr key={row.eipId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-2.5">
                            <Link
                              to={`/eips/${row.eipId}`}
                              className="font-mono text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                            >
                              EIP-{row.eipId}
                            </Link>
                            {eip && (
                              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{eip.title}</span>
                            )}
                          </td>
                          {clClients.map((client) => (
                            <td key={client} className="px-3 py-2.5 text-center">
                              <ImplStatusCell status={row.clients[client] || 'unknown'} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-2">
              {spec.implementations.cl.map((row) => {
                const eip = spec.eips.find((e) => e.id === row.eipId);
                return (
                  <div key={row.eipId} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <Link
                      to={`/eips/${row.eipId}`}
                      className="font-mono text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      EIP-{row.eipId}
                    </Link>
                    {eip && <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{eip.title}</span>}
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {clClients.map((client) => (
                        <div key={client} className="flex items-center gap-1.5">
                          <ImplStatusCell status={row.clients[client] || 'unknown'} />
                          <span className="text-xs text-slate-600 dark:text-slate-400">{client}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Implementation Legend */}
        <div className="mb-8 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ImplStatusCell status="done" />
            <span>Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ImplStatusCell status="in-progress" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ImplStatusCell status="not-started" />
            <span>Not Started</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ImplStatusCell status="unknown" />
            <span>Unknown</span>
          </div>
        </div>

        {/* PR Tracker */}
        {spec.prs.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Tracked PRs</h2>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-600 dark:text-slate-400">Repo</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-600 dark:text-slate-400">PR</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-600 dark:text-slate-400">Description</th>
                    <th className="px-4 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {(() => {
                    const categoryOrder = ['ethereum/EIPs', 'ethereum/execution-specs', 'ethereum/consensus-specs', 'ethereum/execution-apis'];
                    const categoryLabels: Record<string, string> = {
                      'ethereum/EIPs': 'EIPs',
                      'ethereum/execution-specs': 'Execution Specs',
                      'ethereum/consensus-specs': 'Consensus Specs',
                      'ethereum/execution-apis': 'Execution APIs',
                    };
                    const groupedPrs = new Map<string, typeof spec.prs>();
                    for (const pr of spec.prs) {
                      const existing = groupedPrs.get(pr.repo) || [];
                      existing.push(pr);
                      groupedPrs.set(pr.repo, existing);
                    }
                    const sortedCategories = [...groupedPrs.keys()].sort((a, b) => {
                      const aIdx = categoryOrder.indexOf(a);
                      const bIdx = categoryOrder.indexOf(b);
                      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
                      if (aIdx === -1) return 1;
                      if (bIdx === -1) return -1;
                      return aIdx - bIdx;
                    });
                    const rows: React.ReactNode[] = [];
                    sortedCategories.forEach((repo, catIndex) => {
                      const prs = groupedPrs.get(repo) || [];
                      if (catIndex > 0) {
                        rows.push(
                          <tr key={`sep-${repo}`}>
                            <td colSpan={4} className="px-4 py-2 bg-slate-100 dark:bg-slate-700/70">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                {categoryLabels[repo] || repo}
                              </span>
                            </td>
                          </tr>
                        );
                      } else {
                        rows.push(
                          <tr key={`sep-${repo}`}>
                            <td colSpan={4} className="px-4 py-2 bg-slate-100 dark:bg-slate-700/70">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                {categoryLabels[repo] || repo}
                              </span>
                            </td>
                          </tr>
                        );
                      }
                      prs.forEach((pr) => {
                        const key = `${pr.repo}#${pr.number}`;
                        rows.push(
                          <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                              {pr.repo}
                            </td>
                            <td className="px-4 py-2.5">
                              <a
                                href={`https://github.com/${pr.repo}/pull/${pr.number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                              >
                                #{pr.number}
                              </a>
                            </td>
                            <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100">
                              {pr.title || pr.description}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <PRStatusBadge pr={pr} />
                            </td>
                          </tr>
                        );
                      });
                    });
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-2">
              {(() => {
                const categoryOrder = ['ethereum/EIPs', 'ethereum/execution-specs', 'ethereum/consensus-specs', 'ethereum/execution-apis'];
                const categoryLabels: Record<string, string> = {
                  'ethereum/EIPs': 'EIPs',
                  'ethereum/execution-specs': 'Execution Specs',
                  'ethereum/consensus-specs': 'Consensus Specs',
                  'ethereum/execution-apis': 'Execution APIs',
                };
                const groupedPrs = new Map<string, typeof spec.prs>();
                for (const pr of spec.prs) {
                  const existing = groupedPrs.get(pr.repo) || [];
                  existing.push(pr);
                  groupedPrs.set(pr.repo, existing);
                }
                const sortedCategories = [...groupedPrs.keys()].sort((a, b) => {
                  const aIdx = categoryOrder.indexOf(a);
                  const bIdx = categoryOrder.indexOf(b);
                  if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
                  if (aIdx === -1) return 1;
                  if (bIdx === -1) return -1;
                  return aIdx - bIdx;
                });
                const items: React.ReactNode[] = [];
                sortedCategories.forEach((repo) => {
                  const prs = groupedPrs.get(repo) || [];
                  items.push(
                    <div key={`sep-${repo}`} className="px-2 py-1.5 bg-slate-100 dark:bg-slate-700/70 rounded-md">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                        {categoryLabels[repo] || repo}
                      </span>
                    </div>
                  );
                  prs.forEach((pr) => {
                    const key = `${pr.repo}#${pr.number}`;
                    items.push(
                      <div key={key} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <a
                            href={`https://github.com/${pr.repo}/pull/${pr.number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                          >
                            {pr.repo}#{pr.number}
                          </a>
                          <PRStatusBadge pr={pr} />
                        </div>
                        <p className="text-sm text-slate-900 dark:text-slate-100">{pr.title || pr.description}</p>
                      </div>
                    );
                  });
                });
                return items;
              })()}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>
            <Link to="/devnets" className="underline hover:text-slate-600 dark:hover:text-slate-300">
              Back to Devnets
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DevnetSpecPage;
