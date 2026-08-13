import { useEffect, useCallback, type ReactNode } from 'react';
import { Link, useNavigate } from './navigation';
import { getDevnetSpec, getDevnetSeriesSiblings } from '../data/devnet-specs';
import { getNetworkEntry, getNetworkMetadata, isPublicNetworkKey } from '../domain/networks/networks';
import { getPromotedDevnet } from '../domain/networks/promotedDevnets';
import { buildForkRows, getExecutionGenesisTimestamp, type ForkRow } from '../domain/networks/forkSchedule';
import { parseMarkdownLinks, parseMarkdownBold, containsMarkdownTable, parseMarkdownTable } from '../utils/markdown';
import type {
  DevnetSpec,
  ClientSupportMatrix,
  ClientSupportStatus,
  EipDevnetStatus,
} from '../types';
import type { BlobScheduleEntry, NetworkEntry, NetworkMetadataLink } from '../types/networks';

/** Extract category key from a devnet id, e.g. "bal-devnet-3" → "bal" */
function parseCategoryKey(id: string): string {
  return id.replace(/-devnet-\d+$/, '');
}

function StatusBadge({ status }: { status: EipDevnetStatus }) {
  if (!status) return null;
  const styles: Record<string, string> = {
    updated:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    new: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    new_optional:
      'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  };
  const optionalStyle =
    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
  if (status === 'new_optional') {
    return (
      <span className="inline-flex gap-1">
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles.new}`}>
          New
        </span>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${optionalStyle}`}>
          Optional
        </span>
      </span>
    );
  }
  if (status === 'optional') {
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${optionalStyle}`}>
        Optional
      </span>
    );
  }
  if (status === 'required') {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
        Required
      </span>
    );
  }
  const labels: Record<string, string> = {
    updated: 'Updated',
    new: 'New',
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function SupportCell({ status }: { status: ClientSupportStatus }) {
  const map: Record<
    string,
    { icon: string; color: string; label: string }
  > = {
    supported: {
      icon: '✓',
      color:
        'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      label: 'Supported',
    },
    not_supported: {
      icon: '✗',
      color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
      label: 'Not supported',
    },
    in_progress: {
      icon: '🔨',
      color:
        'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
      label: 'In progress',
    },
    unknown: {
      icon: '?',
      color:
        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
      label: 'Unknown',
    },
  };

  const entry = map[status];
  if (entry) {
    return (
      <span
        className={`inline-flex items-center justify-center w-8 h-8 rounded text-sm font-medium ${entry.color}`}
        title={entry.label}
      >
        {entry.icon}
      </span>
    );
  }

  // Non-standard value — may contain markdown links (e.g., branch/PR column)
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 whitespace-nowrap"
      title={status}
    >
      {parseMarkdownLinks(status)}
    </span>
  );
}

function ClientMatrix({
  title,
  data,
}: {
  title: string;
  data: ClientSupportMatrix;
}) {
  if (data.clients.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
        {title}
      </h2>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 pr-4 font-medium text-slate-600 dark:text-slate-400">
                EIP
              </th>
              {data.clients.map((client) => (
                <th
                  key={client}
                  className="py-2 px-2 font-medium text-slate-600 dark:text-slate-400 text-center"
                >
                  {client}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.matrix.map((row) => (
              <tr
                key={row.eipNumber}
                className="border-b border-slate-100 dark:border-slate-800"
              >
                <td className="py-2 pr-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {row.label}
                </td>
                {data.clients.map((client) => (
                  <td key={client} className="py-2 px-2 text-center">
                    <SupportCell status={row.support[client] || 'unknown'} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const ICON_PATHS: Record<string, string | string[]> = {
  explorer: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  faucet: 'M12 2C12 2 6 9.5 6 14a6 6 0 0012 0c0-4.5-6-12-6-12z',
  code: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  signal: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0',
  monitor: [
    'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  ],
  check: 'M9 12l2 3 4-6m6 3a9 9 0 11-18 0 9 9 0 0118 0z',
  sync: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  link: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
};

function ResourceIcon({ name }: { name: string }) {
  const paths = ICON_PATHS[name] || ICON_PATHS.link;
  const pathList = Array.isArray(paths) ? paths : [paths];
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {pathList.map((d, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
      ))}
    </svg>
  );
}

function ResourceLinks({ networkEntry, metadataLinks }: { networkEntry: NetworkEntry | null; metadataLinks: NetworkMetadataLink[] | null }) {
  const serviceUrls = networkEntry?.serviceUrls;
  const genesisConfig = networkEntry?.genesisConfig;

  const links: Array<{ label: string; url: string; icon: string }> = [];
  if (serviceUrls?.explorer) links.push({ label: 'Block Explorer', url: serviceUrls.explorer, icon: 'explorer' });
  if (serviceUrls?.beaconExplorer) links.push({ label: 'Beacon Explorer', url: serviceUrls.beaconExplorer, icon: 'explorer' });
  if (serviceUrls?.dora) links.push({ label: 'Explorer (Dora)', url: serviceUrls.dora, icon: 'explorer' });
  if (serviceUrls?.faucet) links.push({ label: 'Faucet', url: serviceUrls.faucet, icon: 'faucet' });
  if (serviceUrls?.jsonRpc) links.push({ label: 'JSON-RPC', url: serviceUrls.jsonRpc, icon: 'code' });
  if (serviceUrls?.beaconRpc) links.push({ label: 'Beacon API', url: serviceUrls.beaconRpc, icon: 'signal' });
  if (serviceUrls?.forkmon) links.push({ label: 'Forkmon', url: serviceUrls.forkmon, icon: 'monitor' });
  if (serviceUrls?.assertoor) links.push({ label: 'Assertoor', url: serviceUrls.assertoor, icon: 'check' });
  if (serviceUrls?.checkpointSync) links.push({ label: 'Checkpoint Sync', url: serviceUrls.checkpointSync, icon: 'sync' });
  const clConfig =
    genesisConfig?.consensusLayer?.find(f => f.path.endsWith('/config.yaml')) ??
    genesisConfig?.metadata?.find(f => f.path.endsWith('/config.yaml'));
  const elGenesis = genesisConfig?.executionLayer?.find(f => f.path.endsWith('/genesis.json'));
  if (clConfig) links.push({ label: 'CL Config', url: clConfig.url, icon: 'document' });
  if (elGenesis) links.push({ label: 'EL Genesis', url: elGenesis.url, icon: 'document' });
  if (metadataLinks) {
    for (const link of metadataLinks) {
      links.push({ label: link.title, url: link.url, icon: 'link' });
    }
  }

  if (links.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
        Resources
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
        {links.map(({ label, url, icon }) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            <ResourceIcon name={icon} />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function NetworkPageLayout({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { prev, next } = getDevnetSeriesSiblings(id);
  const navigate = useNavigate();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && prev) navigate(`/networks/${prev}`);
      if (e.key === 'ArrowRight' && next) navigate(`/networks/${next}`);
    },
    [prev, next, navigate],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to="/networks"
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            &larr; Back to Networks
          </Link>
          <div className="flex items-center gap-3">
            {(prev || next) && (
              <nav className="flex items-center gap-1 text-sm">
                {prev ? (
                  <Link
                    to={`/networks/${prev}`}
                    className="px-2 py-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                    title={prev}
                  >
                    &larr; Prev
                  </Link>
                ) : (
                  <span className="px-2 py-1 text-slate-300 dark:text-slate-600">
                    &larr; Prev
                  </span>
                )}
                <span className="text-slate-300 dark:text-slate-600">|</span>
                {next ? (
                  <Link
                    to={`/networks/${next}`}
                    className="px-2 py-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                    title={next}
                  >
                    Next &rarr;
                  </Link>
                ) : (
                  <span className="px-2 py-1 text-slate-300 dark:text-slate-600">
                    Next &rarr;
                  </span>
                )}
              </nav>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function SpecHeaderLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-purple-400 dark:hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
    >
      {label}
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

function DevnetSpecContent({ spec, networkEntry, metadata }: { spec: DevnetSpec; networkEntry: NetworkEntry | null; metadata: { links: NetworkMetadataLink[] | null; description: string } | null }) {
  // The scraped title is regenerated on every re-scrape, so a promoted devnet's
  // public name is curated instead.
  const promoted = getPromotedDevnet(spec.id);
  return (
    <NetworkPageLayout id={spec.id}>
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {promoted?.name ?? spec.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
            {promoted && (
              <>
                <span>{promoted.label}</span>
                <span>&middot;</span>
                <span className="font-mono">{spec.id}</span>
                <span>&middot;</span>
                {networkEntry?.chainId !== undefined && (
                  <>
                    <span>Chain ID {networkEntry.chainId}</span>
                    <span>&middot;</span>
                  </>
                )}
              </>
            )}
            {networkEntry && (
              <SpecHeaderLink
                href={`https://ethpandaops.io/networks/${spec.id}/`}
                label="ethPandaOps Dashboard"
              />
            )}
            <SpecHeaderLink href={spec.sourceUrl} label="View Specification" />
            {spec.genesisTime && (
              <>
                <span>
                  Launched{' '}
                  {new Date(spec.genesisTime * 1000).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span>&middot;</span>
              </>
            )}
            <span>
              Scraped{' '}
              {new Date(spec.scrapedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Same-spec notice */}
        {spec.sameSpecAs && (
          <div className="mb-8 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
            This devnet used the same spec as{' '}
            <Link
              to={`/networks/${spec.sameSpecAs}`}
              className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 font-medium transition-colors"
            >
              {spec.sameSpecAs}
            </Link>.
          </div>
        )}

        {/* Announcements */}
        {spec.announcements.length > 0 && (
          <section className="mb-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-900 dark:text-blue-200 overflow-hidden divide-y divide-blue-200 dark:divide-blue-800">
            {spec.announcements.map((text, i) => (
              <div key={i} className="flex gap-3 px-4 py-3">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-blue-400 dark:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {containsMarkdownTable(text)
                    ? parseMarkdownTable(text).map((node, j) =>
                        typeof node === 'string'
                          ? <span key={j}>{parseMarkdownBold(parseMarkdownLinks(node))}</span>
                          : node
                      )
                    : parseMarkdownBold(parseMarkdownLinks(text))}
                </span>
              </div>
            ))}
          </section>
        )}

        {/* Spec References */}
        {(spec.specReferences.consensusSpecs ||
          spec.specReferences.executionSpecs) && (
          <div className="mb-8 flex flex-wrap gap-3">
            {spec.specReferences.consensusSpecs && (
              <a
                href={spec.specReferences.consensusSpecs.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Consensus Specs
                <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-mono">
                  {spec.specReferences.consensusSpecs.version}
                </span>
              </a>
            )}
            {spec.specReferences.executionSpecs && (
              <a
                href={spec.specReferences.executionSpecs.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Execution Specs
                <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-mono">
                  {spec.specReferences.executionSpecs.version}
                </span>
              </a>
            )}
          </div>
        )}

        {/* Resources (service URLs + metadata links from networks.json) */}
        <ResourceLinks
          networkEntry={networkEntry}
          metadataLinks={metadata?.links ?? null}
        />

        {/* A promoted devnet is run as a public testnet, so it gets the same
            schedules a public network page shows. Ordinary devnets activate
            everything at genesis, where the tables say nothing. */}
        {promoted && networkEntry && (
          <>
            <ForkSchedule rows={buildForkRows(networkEntry.forks, Date.now())} />
            <BlobSchedule schedule={networkEntry.blobSchedule ?? []} />
          </>
        )}

        {/* EIP List */}
        {spec.eips.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              EIP List
            </h2>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 pr-4 font-medium text-slate-600 dark:text-slate-400">
                      EIP
                    </th>
                    <th className="text-left py-2 pr-4 font-medium text-slate-600 dark:text-slate-400">
                      Title
                    </th>
                    <th className="text-left py-2 font-medium text-slate-600 dark:text-slate-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {spec.eips.map((eip) => (
                    <tr
                      key={eip.number}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="py-2 pr-4">
                        <Link
                          to={`/eips/${eip.number}`}
                          className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 font-medium transition-colors"
                        >
                          EIP-{eip.number}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">
                        {eip.title}
                      </td>
                      <td className="py-2">
                        <StatusBadge status={eip.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* EL Client Support */}
        <ClientMatrix
          title="Execution Layer Client Support"
          data={spec.elClientSupport}
        />

        {/* CL Client Support */}
        <ClientMatrix
          title="Consensus Layer Client Support"
          data={spec.clClientSupport}
        />

    </NetworkPageLayout>
  );
}

function NetworkOnlyContent({ id, networkEntry, metadata }: { id: string; networkEntry: NetworkEntry | null; metadata: { links: NetworkMetadataLink[] | null; description: string } | null }) {

  return (
    <NetworkPageLayout id={id}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {id}
        </h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          {networkEntry && (
            <a
              href={`https://ethpandaops.io/networks/${id}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors underline decoration-1 underline-offset-2"
            >
              ethPandaOps Dashboard
            </a>
          )}
        </div>
        {metadata?.description && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            {metadata.description}
          </p>
        )}
      </div>

      <ResourceLinks
        networkEntry={networkEntry}
        metadataLinks={metadata?.links ?? null}
      />
    </NetworkPageLayout>
  );
}

const formatDate = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

function ForkSchedule({ rows }: { rows: ForkRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Fork Schedule</h2>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 pr-4 font-medium text-slate-600 dark:text-slate-400">Upgrade</th>
              <th className="text-left py-2 pr-4 font-medium text-slate-600 dark:text-slate-400">Consensus</th>
              <th className="text-left py-2 pr-4 font-medium text-slate-600 dark:text-slate-400">Execution</th>
              <th className="text-left py-2 font-medium text-slate-600 dark:text-slate-400">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.timestamp}
                className={`border-b border-slate-100 dark:border-slate-800 ${
                  row.activated ? '' : 'bg-amber-50/60 dark:bg-amber-900/10'
                }`}
              >
                <td className="py-2 pr-4 align-top">
                  {row.upgradeName ? (
                    row.upgradePath ? (
                      <Link
                        to={row.upgradePath}
                        className="font-medium capitalize text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                      >
                        {row.upgradeName}
                      </Link>
                    ) : (
                      <span className="font-medium capitalize text-slate-700 dark:text-slate-300">
                        {row.upgradeName}
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400 dark:text-slate-600">&mdash;</span>
                  )}
                  {!row.activated && Object.keys(row.minClientVersions).length > 0 && (
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Minimum client versions:{' '}
                      {Object.entries(row.minClientVersions)
                        .map(([client, version]) => `${client} ${version}`)
                        .join(', ')}
                    </div>
                  )}
                </td>
                <td className="py-2 pr-4 align-top text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {row.consensus ? (
                    <>
                      <span className="capitalize">{row.consensus.name}</span>
                      {row.consensus.epoch !== undefined && (
                        <span className="ml-1.5 font-mono text-xs text-slate-400 dark:text-slate-500">
                          epoch {row.consensus.epoch.toLocaleString()}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-600">&mdash;</span>
                  )}
                </td>
                <td className="py-2 pr-4 align-top text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {row.execution ? (
                    <>
                      <span className="capitalize">{row.execution.name.replace(/_/g, ' ')}</span>
                      {row.execution.block !== undefined && (
                        <span className="ml-1.5 font-mono text-xs text-slate-400 dark:text-slate-500">
                          block {row.execution.block.toLocaleString()}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-600">&mdash;</span>
                  )}
                </td>
                <td className="py-2 align-top text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {formatDate(row.timestamp)}
                  {!row.activated && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      upcoming
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BlobSchedule({ schedule }: { schedule: BlobScheduleEntry[] }) {
  if (!schedule || schedule.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Blob Schedule</h2>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 pr-4 font-medium text-slate-600 dark:text-slate-400">Epoch</th>
              <th className="text-left py-2 pr-4 font-medium text-slate-600 dark:text-slate-400">Date</th>
              <th className="text-left py-2 font-medium text-slate-600 dark:text-slate-400">Max blobs per block</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((step) => (
              <tr key={step.epoch} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 pr-4 font-mono text-slate-700 dark:text-slate-300">
                  {step.epoch.toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {formatDate(step.timestamp)}
                </td>
                <td className="py-2 font-mono text-slate-700 dark:text-slate-300">
                  {step.maxBlobsPerBlock}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PublicNetworkContent({ id, networkEntry }: { id: string; networkEntry: NetworkEntry }) {
  const forkRows = buildForkRows(networkEntry.forks, Date.now());
  const executionGenesis = getExecutionGenesisTimestamp(networkEntry.forks);

  return (
    <NetworkPageLayout id={id}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 capitalize">{id}</h1>
        {networkEntry.description && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{networkEntry.description}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
          <SpecHeaderLink href={`https://ethpandaops.io/networks/${id}/`} label="ethPandaOps Dashboard" />
          {networkEntry.chainId !== undefined && <span>Chain ID {networkEntry.chainId}</span>}
          {executionGenesis !== null && (
            <>
              <span>&middot;</span>
              <span>Genesis {formatDate(executionGenesis)}</span>
            </>
          )}
          {/* Labelled for the layer it belongs to: on mainnet this is the Beacon
              Chain launch, which postdates the execution genesis above by 5 years. */}
          {networkEntry.genesisConfig?.genesisTime && (
            <>
              <span>&middot;</span>
              <span>Beacon genesis {formatDate(networkEntry.genesisConfig.genesisTime)}</span>
            </>
          )}
        </div>
      </div>

      {id !== 'mainnet' && <ResourceLinks networkEntry={networkEntry} metadataLinks={null} />}

      <ForkSchedule rows={forkRows} />

      <BlobSchedule schedule={networkEntry.blobSchedule ?? []} />
    </NetworkPageLayout>
  );
}

export default function NetworkDetailPage({ id }: { id: string }) {
  const spec = id ? getDevnetSpec(id) : undefined;
  const networkEntry = id ? getNetworkEntry(id) : null;
  const categoryKey = id ? parseCategoryKey(id) : '';
  const metadata = categoryKey ? getNetworkMetadata(categoryKey) : null;

  // Has a scraped spec — render the full detail page
  if (spec) {
    return <DevnetSpecContent spec={spec} networkEntry={networkEntry} metadata={metadata} />;
  }

  // A public network (mainnet/sepolia/hoodi) — fork + blob schedule instead of a spec
  if (networkEntry && isPublicNetworkKey(id)) {
    return <PublicNetworkContent id={id} networkEntry={networkEntry} />;
  }

  // No spec, but check if there's network data for this ID
  if (id && (networkEntry || metadata)) {
    return <NetworkOnlyContent id={id} networkEntry={networkEntry} metadata={metadata} />;
  }

  // No spec or network data for this id. getStaticPaths only emits pages for real
  // specs and active networks, so unknown ids hit Astro's 404 and never reach here.
  return null;
}
