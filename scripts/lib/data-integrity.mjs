/**
 * Integrity checks for the hand-edited data that has no schema of its own:
 * prioritization boards, devnet specs, call configs, and the references
 * between those files and the EIP set.
 *
 * Pure: `checkDataIntegrity` takes already-parsed data and returns problems,
 * so tests can feed it broken copies. `scripts/validate-data.mjs` does the I/O.
 *
 * `errors` are references that point nowhere or shapes the pages can't render;
 * they fail the build. `warnings` are oddities worth a look that the site
 * tolerates today.
 */
import Ajv from 'ajv';

const ISO_DATE = { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' };
const TEAM_TYPE = { enum: ['EL', 'CL', 'OTHER'] };

// Mirrors PrioritizationData in src/types/prioritization.ts.
const PRIORITIZATION_SCHEMA = {
  type: 'object',
  required: ['fork', 'lastUpdated', 'teams', 'eips'],
  additionalProperties: false,
  properties: {
    fork: { type: 'string' },
    lastUpdated: ISO_DATE,
    teams: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'type', 'initials'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1 },
          type: TEAM_TYPE,
          initials: { type: 'string', minLength: 1 },
        },
      },
    },
    eips: {
      type: 'array',
      items: {
        type: 'object',
        required: ['eipId', 'stances'],
        additionalProperties: false,
        properties: {
          eipId: { type: 'integer' },
          stances: {
            type: 'array',
            items: {
              type: 'object',
              required: ['clientName', 'clientType', 'ratingSystem', 'rawRating', 'normalizedScore', 'lastUpdated'],
              additionalProperties: false,
              properties: {
                clientName: { type: 'string' },
                clientType: TEAM_TYPE,
                ratingSystem: {
                  enum: ['tier-abcds', 'tier-abcds-reject', 'support-oppose', 'priority-tier', 'custom'],
                },
                rawRating: { type: ['string', 'null'] },
                normalizedScore: { type: ['number', 'null'], minimum: 0, maximum: 5 },
                comment: { type: 'string' },
                sourceUrl: { type: 'string' },
                lastUpdated: ISO_DATE,
              },
            },
          },
        },
      },
    },
  },
};

const SUPPORT_MATRIX = {
  type: 'object',
  required: ['clients', 'matrix'],
  additionalProperties: false,
  properties: {
    clients: { type: 'array', items: { type: 'string' } },
    matrix: {
      type: 'array',
      items: {
        type: 'object',
        required: ['eipNumber', 'label', 'support'],
        additionalProperties: false,
        properties: {
          eipNumber: { type: 'integer' },
          label: { type: 'string' },
          support: { type: 'object', additionalProperties: { type: 'string' } },
        },
      },
    },
  },
};

const SPEC_REFERENCE = {
  oneOf: [
    {
      type: 'object',
      required: ['version', 'url'],
      additionalProperties: false,
      properties: { version: { type: 'string' }, url: { type: 'string' } },
    },
    { type: 'null' },
  ],
};

// Mirrors DevnetSpec in src/types/devnet-spec.ts, plus the scraper's `canceled` flag.
const DEVNET_SPEC_SCHEMA = {
  type: 'object',
  required: [
    'id',
    'title',
    'sourceUrl',
    'scrapedAt',
    'announcements',
    'eips',
    'elClientSupport',
    'clClientSupport',
    'specReferences',
  ],
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    sourceUrl: { type: 'string' },
    scrapedAt: { type: 'string' },
    sameSpecAs: { type: 'string' },
    genesisTime: { type: 'integer' },
    canceled: { type: 'boolean' },
    announcements: { type: 'array', items: { type: 'string' } },
    eips: {
      type: 'array',
      items: {
        type: 'object',
        required: ['number', 'title', 'status', 'url'],
        additionalProperties: false,
        properties: {
          number: { type: 'integer' },
          title: { type: 'string' },
          status: { enum: ['updated', 'new', 'new_optional', 'optional', 'required', null] },
          url: { type: 'string' },
        },
      },
    },
    elClientSupport: SUPPORT_MATRIX,
    clClientSupport: SUPPORT_MATRIX,
    specReferences: {
      type: 'object',
      required: ['consensusSpecs', 'executionSpecs'],
      additionalProperties: false,
      properties: { consensusSpecs: SPEC_REFERENCE, executionSpecs: SPEC_REFERENCE },
    },
  },
};

// Per-upgrade devnet roll-up (devnets/glamsterdam.json): the files with `upgrade`.
const DEVNET_UPGRADE_SCHEMA = {
  type: 'object',
  required: ['upgrade', 'lastUpdated', 'devnets'],
  additionalProperties: false,
  properties: {
    upgrade: { type: 'string' },
    lastUpdated: ISO_DATE,
    devnets: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'type', 'version', 'eips'],
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          type: { enum: ['headliner', 'combined'] },
          headliner: { type: 'string' },
          version: { type: 'integer' },
          launchDate: ISO_DATE,
          isTarget: { type: 'boolean' },
          eips: { type: 'array', items: { type: 'integer' } },
          updatedEips: { type: 'array', items: { type: 'integer' } },
          optionalEips: { type: 'array', items: { type: 'integer' } },
        },
      },
    },
  },
};

const SYNC = {
  type: 'object',
  required: ['transcriptStartTime', 'videoStartTime'],
  additionalProperties: false,
  properties: {
    transcriptStartTime: { type: ['string', 'null'], pattern: '^[0-9]{2}:[0-9]{2}:[0-9]{2}$' },
    videoStartTime: { type: ['string', 'null'], pattern: '^[0-9]{2}:[0-9]{2}:[0-9]{2}$' },
  },
};

// Mirrors CallConfig in src/components/call/CallPage.tsx.
const CALL_CONFIG_SCHEMA = {
  type: 'object',
  required: ['videoUrl'],
  additionalProperties: false,
  properties: {
    videoUrl: { type: 'string', minLength: 1 },
    issue: { type: 'integer' },
    sync: SYNC,
    breakouts: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        required: ['videoUrl'],
        additionalProperties: false,
        properties: { videoUrl: { type: 'string', minLength: 1 }, sync: SYNC },
      },
    },
  },
};

const ajv = new Ajv({ allErrors: true, verbose: true });
const validators = {
  prioritization: ajv.compile(PRIORITIZATION_SCHEMA),
  devnetSpec: ajv.compile(DEVNET_SPEC_SCHEMA),
  devnetUpgrade: ajv.compile(DEVNET_UPGRADE_SCHEMA),
  callConfig: ajv.compile(CALL_CONFIG_SCHEMA),
};

function schemaErrors(validate, data, file) {
  if (validate(data)) return [];
  return validate.errors.map(err => {
    const extra = err.params?.additionalProperty
      ? ` (property: "${err.params.additionalProperty}")`
      : err.params?.allowedValues
        ? ` (got ${JSON.stringify(err.data)})`
        : '';
    return `${file}: ${err.instancePath || '/'} ${err.message}${extra}`;
  });
}

/** "acdt/66" -> "acdt/066", the path protocol-calls.generated.json uses. */
const callPath = ref => {
  const [type, number] = ref.split('/');
  return `${type}/${number.padStart(3, '0')}`;
};

/**
 * @param {object} data
 * @param {Array<{file: string, eip: object}>} data.eips  every src/data/eips file
 * @param {string[]} data.forkNames     valid upgrade ids, lowercase
 * @param {Array<{path: string, type: string, date: string, number: string}>} data.calls  protocol-calls.generated.json
 * @param {Array<{file: string, data: object}>} data.prioritization
 * @param {Array<{file: string, data: object}>} data.devnets   every src/data/devnets file
 * @param {Array<{dir: string, config: object | null, hasTranscript: boolean}>} data.callDirs  public/artifacts/<type>/<date>_<n> dirs
 * @param {Array<{name: string, type: string}>} data.clientTeams  ALL_CLIENT_TEAMS
 * @param {Array<{id: string, eips?: number[], subcategories?: Array<{eips: number[]}>}>} data.eipCategories
 * @param {Array<{parentPath: string, artifactDir: string}>} data.breakouts
 * @param {(artifactDir: string) => boolean} data.artifactExists
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function checkDataIntegrity(data) {
  const errors = [];
  const warnings = [];

  const eipIds = new Set(data.eips.map(({ eip }) => eip.id));
  const forkNames = new Set(data.forkNames);
  const callPaths = new Set(data.calls.map(call => call.path));

  // EIPs: call references resolve, statusHistory is in date order. The schema
  // already pins the shape and the fork names.
  for (const { file, eip } of data.eips) {
    for (const rel of eip.forkRelationships) {
      const where = `src/data/eips/${file} (${rel.forkName})`;
      const refs = [
        ...rel.statusHistory.map(entry => entry.call),
        ...(rel.presentationHistory ?? []).map(entry => entry.call),
        rel.notice?.call,
      ].filter(Boolean);
      for (const ref of refs) {
        if (!callPaths.has(callPath(ref))) {
          errors.push(`${where}: call "${ref}" is not in protocol-calls.generated.json`);
        }
      }

      const dates = rel.statusHistory.map(entry => entry.date).filter(Boolean);
      if (dates.some((date, i) => i > 0 && date < dates[i - 1])) {
        errors.push(`${where}: statusHistory is not in date order (pages take the last entry as current)`);
      }
    }
  }

  // Prioritization boards.
  const rosterByName = new Map(data.clientTeams.map(team => [team.name, team]));
  for (const { file, data: board } of data.prioritization) {
    const where = `src/data/prioritization/${file}`;
    const shapeErrors = schemaErrors(validators.prioritization, board, where);
    errors.push(...shapeErrors);
    if (shapeErrors.length > 0) continue;

    if (!forkNames.has(board.fork)) errors.push(`${where}: fork "${board.fork}" is not an upgrade id`);
    if (file !== `${board.fork}.json`) errors.push(`${where}: fork "${board.fork}" does not match the file name`);

    const teams = new Map(board.teams.map(team => [team.name, team]));
    for (const team of board.teams) {
      if (team.type === 'OTHER') continue;
      const known = rosterByName.get(team.name);
      if (!known) {
        warnings.push(`${where}: team "${team.name}" is not in ALL_CLIENT_TEAMS (src/constants/client-teams.ts)`);
      } else if (known.type !== team.type) {
        errors.push(`${where}: team "${team.name}" is ${team.type} here but ${known.type} in ALL_CLIENT_TEAMS`);
      }
    }

    const seenEips = new Set();
    for (const { eipId, stances } of board.eips) {
      if (!eipIds.has(eipId)) errors.push(`${where}: EIP ${eipId} has no file in src/data/eips`);
      if (seenEips.has(eipId)) errors.push(`${where}: EIP ${eipId} is listed twice`);
      seenEips.add(eipId);

      const seenClients = new Set();
      for (const stance of stances) {
        const team = teams.get(stance.clientName);
        if (!team) {
          errors.push(`${where}: EIP ${eipId} has a stance from "${stance.clientName}", who is not in teams[]`);
        } else if (team.type !== stance.clientType) {
          errors.push(`${where}: EIP ${eipId} stance from "${stance.clientName}" says ${stance.clientType}, teams[] says ${team.type}`);
        }
        if (seenClients.has(stance.clientName)) {
          errors.push(`${where}: EIP ${eipId} has two stances from "${stance.clientName}"`);
        }
        seenClients.add(stance.clientName);
        // A rating with no score is fine ("neutral", "uncertain", "TBD"); a
        // score with no rating has nothing to show in the cell.
        if (stance.rawRating === null && stance.normalizedScore !== null) {
          errors.push(`${where}: EIP ${eipId} stance from "${stance.clientName}" has a normalizedScore but no rawRating`);
        }
      }
    }
  }

  // Devnet specs and per-upgrade roll-ups.
  const specIds = new Set(data.devnets.filter(({ data: d }) => !('upgrade' in d)).map(({ data: d }) => d.id));
  for (const { file, data: devnet } of data.devnets) {
    const where = `src/data/devnets/${file}`;
    if ('upgrade' in devnet) {
      const shapeErrors = schemaErrors(validators.devnetUpgrade, devnet, where);
      errors.push(...shapeErrors);
      if (shapeErrors.length > 0) continue;

      if (!forkNames.has(devnet.upgrade)) errors.push(`${where}: upgrade "${devnet.upgrade}" is not an upgrade id`);
      for (const entry of devnet.devnets) {
        if (!specIds.has(entry.id)) warnings.push(`${where}: devnet "${entry.id}" has no spec file`);
        for (const id of [...entry.eips, ...(entry.updatedEips ?? []), ...(entry.optionalEips ?? [])]) {
          if (!eipIds.has(id)) errors.push(`${where}: ${entry.id} lists EIP ${id}, which has no file in src/data/eips`);
        }
      }
      continue;
    }

    const shapeErrors = schemaErrors(validators.devnetSpec, devnet, where);
    errors.push(...shapeErrors);
    if (shapeErrors.length > 0) continue;

    if (file !== `${devnet.id}.json`) errors.push(`${where}: id "${devnet.id}" does not match the file name`);
    if (devnet.sameSpecAs && !specIds.has(devnet.sameSpecAs)) {
      errors.push(`${where}: sameSpecAs "${devnet.sameSpecAs}" has no spec file`);
    }
    for (const { number } of devnet.eips) {
      if (!eipIds.has(number)) warnings.push(`${where}: EIP ${number} has no file in src/data/eips`);
    }
  }

  // Call artifacts: every listed call has a config, every config has a shape
  // CallPage can read, and every call folder is listed (else it has no page).
  const dirByPath = new Map();
  for (const { dir, config, hasTranscript } of data.callDirs) {
    const [type, callId] = dir.split('/');
    const number = callId.slice(callId.lastIndexOf('_') + 1).padStart(3, '0');
    dirByPath.set(`${type}/${number}`, dir);

    if (config === null) {
      warnings.push(`public/artifacts/${dir}: no config.json`);
      continue;
    }
    errors.push(...schemaErrors(validators.callConfig, config, `public/artifacts/${dir}/config.json`));
    if (hasTranscript && !config.sync) warnings.push(`public/artifacts/${dir}/config.json: no sync offsets (transcript won't follow the video)`);
  }
  for (const call of data.calls) {
    const dir = dirByPath.get(call.path);
    if (!dir) {
      errors.push(`src/data/protocol-calls.generated.json: ${call.path} has no artifact folder`);
    } else if (!dir.startsWith(`${call.type}/${call.date}_`)) {
      warnings.push(`src/data/protocol-calls.generated.json: ${call.path} is dated ${call.date} but its folder is ${dir}`);
    }
  }
  for (const [path, dir] of dirByPath) {
    if (!callPaths.has(path)) warnings.push(`public/artifacts/${dir}: not in protocol-calls.generated.json, so it has no page`);
  }

  // TS-side registries that point into the data.
  for (const category of data.eipCategories) {
    const ids = [...(category.eips ?? []), ...(category.subcategories ?? []).flatMap(sub => sub.eips)];
    for (const id of ids) {
      if (!eipIds.has(id)) errors.push(`src/data/eip-categories.ts: category "${category.id}" lists EIP ${id}, which has no file in src/data/eips`);
    }
  }
  for (const breakout of data.breakouts) {
    if (!callPaths.has(breakout.parentPath)) {
      errors.push(`src/data/breakouts.ts: parent call "${breakout.parentPath}" is not in protocol-calls.generated.json`);
    }
    if (!data.artifactExists(breakout.artifactDir)) {
      warnings.push(`src/data/breakouts.ts: artifactDir "${breakout.artifactDir}" does not exist under public/artifacts (the tab shows video only)`);
    }
  }

  return { errors, warnings };
}
