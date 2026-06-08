const LIVESTREAMED_TYPES = new Set(['acdc', 'acde']);
const COMPOSED_ZOOM_TYPES = new Set(['acdt']);

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
          sync: call.sync || null
        };
      }
      normalized[series] = calls;
    }
    return normalized;
  }

  return manifest.calls || {};
}

function generatedSync(callData, localType) {
  if (callData.sync) return callData.sync;

  if (COMPOSED_ZOOM_TYPES.has(localType)) {
    throw new Error(`Missing PM-provided sync metadata for composed Zoom recording type: ${localType}`);
  }

  const needsManualSync = LIVESTREAMED_TYPES.has(localType);
  if (needsManualSync) {
    return {
      transcriptStartTime: null,
      videoStartTime: null
    };
  }

  return {
    transcriptStartTime: '00:00:00',
    videoStartTime: '00:00:00'
  };
}

function isZeroSync(sync) {
  return sync?.transcriptStartTime === '00:00:00' && sync?.videoStartTime === '00:00:00';
}

function needsGeneratedSync(sync) {
  return !sync || isZeroSync(sync);
}

export function generateConfig(callData, localType) {
  return {
    issue: callData.issue,
    videoUrl: callData.videoUrl,
    sync: generatedSync(callData, localType)
  };
}

export function updateConfig(existingConfig, callData, localType) {
  const nextConfig = { ...existingConfig };
  let configChanged = false;

  if (callData.videoUrl && nextConfig.videoUrl !== callData.videoUrl) {
    nextConfig.videoUrl = callData.videoUrl;
    configChanged = true;
  }

  if (callData.sync && needsGeneratedSync(nextConfig.sync)) {
    nextConfig.sync = callData.sync;
    configChanged = true;
  } else if (COMPOSED_ZOOM_TYPES.has(localType) && needsGeneratedSync(nextConfig.sync)) {
    throw new Error(`Missing PM-provided sync metadata for composed Zoom recording type: ${localType}`);
  }

  return { config: nextConfig, changed: configChanged };
}
