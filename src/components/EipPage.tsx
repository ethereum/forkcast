import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { eipsData } from '../data/eips';
import { protocolCalls } from '../data/calls';
import { EIP, ForkRelationship } from '../types';
import { getInclusionStage, getLaymanTitle, getProposalPrefix } from '../utils';
import { useMetaTags } from '../hooks/useMetaTags';
import { useAnalytics } from '../hooks/useAnalytics';
import ThemeToggle from './ui/ThemeToggle';
import { EipCard } from './network-upgrade';

const asEips = eipsData as unknown as EIP[];

const EipPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const numericId = Number(id);
  const eip = asEips.find(item => item.id === numericId);
  const { trackLinkClick } = useAnalytics();

  const pageTitle = eip
    ? `${getProposalPrefix(eip)}-${eip.id}: ${getLaymanTitle(eip)} - Forkcast`
    : 'EIP not found - Forkcast';

  const pageDescription = eip
    ? eip.laymanDescription || eip.description
    : 'The requested EIP could not be found on Forkcast.';

  const pageUrl = `https://forkcast.org/eips/${id ?? ''}`;

  useMetaTags({
    title: pageTitle,
    description: pageDescription,
    url: pageUrl,
  });

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

  const findCall = (callId?: string) => {
    if (!callId) return undefined;
    return protocolCalls.find(call => call.path === callId);
  };

  const renderForkTimeline = (fork: ForkRelationship) => {
    const events = fork.statusHistory ?? [];
    const currentStage = getInclusionStage(eip as EIP, fork.forkName);

    return (
      <section key={fork.forkName} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {fork.forkName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Current inclusion status: <span className="font-medium">{currentStage}</span>
            </p>
          </div>
          {fork.layer && (
            <span className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
              {fork.layer}
            </span>
          )}
        </div>

        {events.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No status history has been recorded for this fork yet.
          </p>
        ) : (
          <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-2 mt-2">
            {events.map((event, index) => {
              const call = findCall(event.call);
              const isLatest = index === events.length - 1;

              const callLabel = event.call ? (() => {
                const [type, number] = event.call.split('/');
                const displayType = (call?.type || type).toUpperCase();
                const displayNumber = call?.number || number;
                return `${displayType} #${displayNumber}`;
              })() : null;

              return (
                <li key={`${fork.forkName}-${index}`} className="mb-4 ml-4">
                  <div className="absolute -left-2 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 bg-slate-300 dark:bg-slate-500" />
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {event.status}
                    {isLatest && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                        Latest
                      </span>
                    )}
                  </p>
                  {event.call && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Discussed in{' '}
                      <Link
                        to={`/calls/${call?.path ?? event.call}`}
                        className="underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2 hover:text-slate-900 dark:hover:text-slate-200"
                        onClick={() => handleExternalLinkClick('call', `/calls/${call?.path ?? event.call}`)}
                      >
                        {callLabel}
                      </Link>
                      {call?.date && ` on ${call.date}`}
                    </p>
                  )}
                  {event.reason && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {event.reason}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    );
  };

  if (!eip) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex justify-between items-start">
            <Link to="/" className="text-3xl font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 tracking-tight">
              Forkcast
            </Link>
            <ThemeToggle />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            EIP {id} was not found in the Forkcast dataset.
          </p>
          <Link
            to="/"
            className="text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-1 underline-offset-2"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  const primaryForkName = eip.forkRelationships[0]?.forkName;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <Link to="/" className="text-3xl font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 tracking-tight">
            Forkcast
          </Link>
          <ThemeToggle />
        </div>

        <Link
          to="/"
          className="text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 mb-4 inline-block text-sm font-medium"
        >
          ← All Network Upgrades
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-light text-slate-900 dark:text-slate-100 tracking-tight mb-2">
            {getProposalPrefix(eip)}-{eip.id}: {getLaymanTitle(eip)}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
            {eip.laymanDescription || eip.description}
          </p>
        </div>

        {/* EIP context */}
        {primaryForkName && (
          <div className="mb-8">
            <EipCard
              eip={eip}
              forkName={primaryForkName}
              handleExternalLinkClick={handleExternalLinkClick}
            />
          </div>
        )}

        {/* Fork status history */}
        <section className="mt-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide">
            Fork inclusion history
          </h2>
          {eip.forkRelationships.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              This EIP has not yet been associated with any network upgrade in Forkcast.
            </p>
          ) : (
            <div className="space-y-4">
              {eip.forkRelationships.map(renderForkTimeline)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default EipPage;