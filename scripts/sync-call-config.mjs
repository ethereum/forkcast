const LIVESTREAMED_TYPES = new Set(['acdc', 'acde']);

const ZERO_SYNC = {
  transcriptStartTime: '00:00:00',
  videoStartTime: '00:00:00'
};

// Breakout sessions bundled into a parent call (e.g. the ACDT CL breakout).
// PM publishes their assets alongside the parent call's, with resource keys
// suffixed by kind (transcript_cl, chat_cl, tldr_cl) plus breakoutVideoUrls.
function extractBreakouts(call) {
  const videoUrls = call.breakoutVideoUrls || {};
  const resources = call.resources || {};
  const breakouts = {};

  for (const [kind, videoUrl] of Object.entries(videoUrls)) {
    if (!videoUrl) continue;
    breakouts[kind] = {
      videoUrl,
      has_transcript: Boolean(resources[`transcript_${kind}`]),
      has_chat: Boolean(resources[`chat_${kind}`]),
      has_tldr: Boolean(resources[`tldr_${kind}`])
    };
  }

  return Object.keys(breakouts).length > 0 ? breakouts : null;
}

export function normalizeManifest(manifest) {
  if (manifest?.series && typeof manifest.series === 'object') {
    const normalized = {};
    for (const [series, seriesData] of Object.entries(manifest.series)) {
      const calls = {};
      for (const call of seriesData.calls || []) {
        const callId = call?.path?.split('/')?.[1];
        if (!callId) continue;
        const resources = call.resources || {};
        calls[callId] = {
          has_tldr: Boolean(resources.tldr),
          has_transcript: Boolean(resources.transcript),
          has_corrected_transcript: Boolean(resources.transcript_corrected),
          has_chat: Boolean(resources.chat),
          has_transcript_changelog: Boolean(resources.changelog),
          last_updated: call.updated || call.date || null,
          // Metadata for config.json generation
          issue: call.issue || null,
          videoUrl: call.videoUrl || null,
          breakouts: extractBreakouts(call)
        };
      }
      normalized[series] = calls;
    }
    return normalized;
  }

  return manifest.calls || {};
}

function generatedSync(localType) {
  if (LIVESTREAMED_TYPES.has(localType)) {
    return {
      transcriptStartTime: null,
      videoStartTime: null
    };
  }

  return { ...ZERO_SYNC };
}

function generatedBreakouts(callData) {
  if (!callData.breakouts) return null;

  const breakouts = {};
  for (const [kind, breakout] of Object.entries(callData.breakouts)) {
    // Breakout video and transcript come from the same Zoom recording,
    // so zero offsets are the correct default (like other raw Zoom calls).
    breakouts[kind] = { videoUrl: breakout.videoUrl, sync: { ...ZERO_SYNC } };
  }
  return breakouts;
}

export function generateConfig(callData, localType) {
  const config = {
    issue: callData.issue,
    videoUrl: callData.videoUrl,
    sync: generatedSync(localType)
  };

  const breakouts = generatedBreakouts(callData);
  if (breakouts) config.breakouts = breakouts;

  return config;
}

export function updateConfig(existingConfig, callData) {
  const nextConfig = { ...existingConfig };
  let configChanged = false;

  if (callData.videoUrl && nextConfig.videoUrl !== callData.videoUrl) {
    nextConfig.videoUrl = callData.videoUrl;
    configChanged = true;
  }

  for (const [kind, breakout] of Object.entries(callData.breakouts || {})) {
    const existingBreakout = nextConfig.breakouts?.[kind];
    if (!existingBreakout) {
      nextConfig.breakouts = {
        ...nextConfig.breakouts,
        [kind]: { videoUrl: breakout.videoUrl, sync: { ...ZERO_SYNC } }
      };
      configChanged = true;
    } else if (existingBreakout.videoUrl !== breakout.videoUrl) {
      // Preserve any manually tuned sync; only refresh the video link.
      nextConfig.breakouts = {
        ...nextConfig.breakouts,
        [kind]: { ...existingBreakout, videoUrl: breakout.videoUrl }
      };
      configChanged = true;
    }
  }

  return { config: nextConfig, changed: configChanged };
}
