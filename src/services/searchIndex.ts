interface CallInfo {
  type: string;
  date: string;
  number: string;
}

interface SearchCorpusCall extends CallInfo {
  transcript: string | null;
  chat: string | null;
  tldr: TldrData | null;
}

interface SearchCorpusMeta {
  sha256: string;
}

interface TldrHighlightItem {
  timestamp: string;
  highlight: string;
}

interface TldrActionItem {
  timestamp: string;
  action: string;
  owner: string;
}

interface TldrData {
  meeting: string;
  highlights: { [category: string]: TldrHighlightItem[] };
  action_items: TldrActionItem[];
  decisions: { timestamp: string; decision: string }[];
  targets: { timestamp: string; target: string }[];
}

export interface IndexedContent {
  callType: string;
  callDate: string;
  callNumber: string;
  type: 'transcript' | 'chat' | 'agenda' | 'action';
  timestamp: string;
  speaker?: string;
  text: string;
  tokens: string[]; // Pre-processed tokens for faster searching
  normalizedText: string; // Lowercase text for case-insensitive search
}

export interface SearchIndex {
  documents: IndexedContent[];
  invertedIndex: Map<string, Set<number>>; // token -> document indices
  callIndex: Map<string, number[]>; // call identifier -> document indices
  lastUpdated: number;
}

class SearchIndexService {
  private static instance: SearchIndexService;
  private index: SearchIndex | null = null;
  private indexPromise: Promise<SearchIndex> | null = null;
  private readonly DB_NAME = 'forkcast_search';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'search_index';
  private readonly INDEX_VERSION = '1.0.5';
  private readonly MAX_INDEX_AGE = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {}

  private isIndexExpired(index: SearchIndex): boolean {
    return Date.now() - index.lastUpdated > this.MAX_INDEX_AGE;
  }

  static getInstance(): SearchIndexService {
    if (!SearchIndexService.instance) {
      SearchIndexService.instance = new SearchIndexService();
    }
    return SearchIndexService.instance;
  }

  // Tokenize text for indexing
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(token => token.length > 1); // Filter out single characters
  }

  // Normalize text for searching
  private normalize(text: string): string {
    return text.toLowerCase().trim();
  }

  // Open IndexedDB
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
    });
  }

  // Load index from IndexedDB
  private async loadFromStorage(expectedCorpusHash?: string): Promise<SearchIndex | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);

      interface StoredIndex {
        version: string;
        documents: IndexedContent[];
        invertedIndex: Record<string, number[]>;
        callIndex: Record<string, number[]>;
        lastUpdated: number;
        corpusHash?: string;
      }
      const data = await new Promise<StoredIndex | undefined>((resolve, reject) => {
        const request = store.get('index');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      db.close();

      if (!data) return null;

      // Check version and age
      if (data.version !== this.INDEX_VERSION) return null;
      if (expectedCorpusHash) {
        if (data.corpusHash !== expectedCorpusHash) return null;
      } else if (Date.now() - data.lastUpdated > this.MAX_INDEX_AGE) {
        // Fallback freshness check if metadata isn't available.
        return null;
      }

      // When corpus hash matches, treat the loaded index as fresh for this session.
      const effectiveLastUpdated = expectedCorpusHash ? Date.now() : data.lastUpdated;

      // Reconstruct Maps from stored data
      const index: SearchIndex = {
        documents: data.documents,
        invertedIndex: new Map(
          Object.entries(data.invertedIndex).map(([key, value]) => [key, new Set(value as number[])])
        ),
        callIndex: new Map(Object.entries(data.callIndex)),
        lastUpdated: effectiveLastUpdated
      };

      return index;
    } catch (error) {
      console.error('Error loading search index from storage:', error);
      return null;
    }
  }

  // Save index to IndexedDB
  private async saveToStorage(index: SearchIndex, corpusHash?: string): Promise<void> {
    try {
      const data = {
        version: this.INDEX_VERSION,
        documents: index.documents,
        invertedIndex: Object.fromEntries(
          Array.from(index.invertedIndex.entries()).map(([key, value]) => [key, Array.from(value)])
        ),
        callIndex: Object.fromEntries(index.callIndex.entries()),
        lastUpdated: index.lastUpdated,
        corpusHash
      };

      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.put(data, 'index');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      db.close();
    } catch (error) {
      console.error('Error saving search index to storage:', error);
    }
  }

  private async fetchCorpusMeta(): Promise<SearchCorpusMeta | null> {
    try {
      const response = await fetch('/search-corpus.meta.json', { cache: 'no-cache' });
      if (!response.ok) return null;

      const data = await response.json();
      if (!data || typeof data.sha256 !== 'string') return null;

      return { sha256: data.sha256 };
    } catch (error) {
      console.warn('Unable to load search corpus metadata:', error);
      return null;
    }
  }

  private async sha256Hex(content: string): Promise<string | null> {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;

    try {
      const bytes = new TextEncoder().encode(content);
      const digest = await subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.warn('Unable to hash search corpus payload:', error);
      return null;
    }
  }

  private async fetchCorpus(cache: RequestCache = 'default'): Promise<{ corpus: SearchCorpusCall[]; hash: string | null }> {
    const response = await fetch('/search-corpus.json', { cache });
    if (!response.ok) {
      throw new Error(`Failed to fetch search corpus: ${response.status} ${response.statusText}`);
    }

    const rawCorpus = await response.text();
    const parsed = JSON.parse(rawCorpus);
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid search corpus format');
    }

    const hash = await this.sha256Hex(rawCorpus);
    return { corpus: parsed as SearchCorpusCall[], hash };
  }

  // Build the search index
  async buildIndex(onProgress?: (progress: number) => void, corpusHash?: string): Promise<SearchIndex> {
    const index: SearchIndex = {
      documents: [],
      invertedIndex: new Map(),
      callIndex: new Map(),
      lastUpdated: Date.now()
    };

    let { corpus, hash: fetchedHash } = await this.fetchCorpus('no-cache');
    let resolvedCorpusHash = corpusHash;

    if (corpusHash && !fetchedHash) {
      console.warn('Search corpus hash unavailable; falling back to TTL-based cache validation.');
      resolvedCorpusHash = undefined;
    }

    if (corpusHash && fetchedHash && fetchedHash !== corpusHash) {
      // One forced reload to handle transient cache inconsistency during deploy.
      const retry = await this.fetchCorpus('reload');
      corpus = retry.corpus;
      fetchedHash = retry.hash;

      if (fetchedHash !== corpusHash) {
        console.warn('Search corpus hash mismatch after reload; falling back to TTL-based cache validation.');
        resolvedCorpusHash = undefined;
      }
    }

    const totalCalls = corpus.length;

    if (totalCalls === 0) {
      if (onProgress) onProgress(100);
      await this.saveToStorage(index, resolvedCorpusHash);
      return index;
    }

    let processedCalls = 0;

    for (const call of corpus) {
      const callKey = `${call.type}_${call.date}_${call.number}`;
      const callDocIndices: number[] = [];

      try {
        // Process transcript
        if (call.transcript) {
          this.addEntriesToIndex(index, callDocIndices, this.parseTranscriptForIndex(call.transcript, call));
        }

        // Process chat
        if (call.chat) {
          this.addEntriesToIndex(index, callDocIndices, this.parseChatForIndex(call.chat, call));
        }

        // Process TLDR (highlights, action items, decisions, targets)
        if (call.tldr) {
          this.addEntriesToIndex(index, callDocIndices, this.parseTldrForIndex(call.tldr, call));
        }

        // Update call index
        if (callDocIndices.length > 0) {
          index.callIndex.set(callKey, callDocIndices);
        }

      } catch (error) {
        console.error(`Error indexing call ${callKey}:`, error);
      }

      processedCalls++;
      if (onProgress) {
        onProgress((processedCalls / totalCalls) * 100);
      }
    }

    // Save to storage
    await this.saveToStorage(index, resolvedCorpusHash);

    return index;
  }

  private addEntriesToIndex(index: SearchIndex, callDocIndices: number[], entries: IndexedContent[]): void {
    entries.forEach(entry => {
      const docIndex = index.documents.length;
      index.documents.push(entry);
      callDocIndices.push(docIndex);

      entry.tokens.forEach(token => {
        if (!index.invertedIndex.has(token)) {
          index.invertedIndex.set(token, new Set());
        }
        index.invertedIndex.get(token)!.add(docIndex);
      });
    });
  }

  // Parse transcript for indexing
  private parseTranscriptForIndex(content: string, call: CallInfo): IndexedContent[] {
    const lines = content.split('\n');
    const results: IndexedContent[] = [];

    // VTT format has entries like:
    // <cue number>
    // <timestamp> --> <timestamp>
    // <speaker>: <text>
    // <blank line>

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Look for timestamp line
      const timestampMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/);
      if (timestampMatch && i + 1 < lines.length) {
        const startTime = timestampMatch[1].split('.')[0];

        // Next line(s) should be content
        const contentLines: string[] = [];
        let j = i + 1;
        while (j < lines.length && lines[j].trim() !== '' && !lines[j].match(/^\d+$/)) {
          contentLines.push(lines[j]);
          j++;
        }

        if (contentLines.length > 0) {
          const content = contentLines.join(' ');
          const speakerMatch = content.match(/^([^:]+):\s*(.+)/);

          if (speakerMatch) {
            const text = speakerMatch[2].trim();
            results.push({
              callType: call.type,
              callDate: call.date,
              callNumber: call.number,
              type: 'transcript',
              timestamp: startTime,
              speaker: speakerMatch[1].trim(),
              text: text,
              tokens: this.tokenize(text + ' ' + speakerMatch[1]),
              normalizedText: this.normalize(text)
            });
          }
        }

        // Skip ahead
        i = j;
      }
    }

    return results;
  }

  // Parse chat for indexing
  private parseChatForIndex(content: string, call: CallInfo): IndexedContent[] {
    const lines = content.split('\n').filter(line => line.trim());
    const results: IndexedContent[] = [];

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split('\t');
      if (parts.length < 3) continue;

      const [timestamp, speaker, ...messageParts] = parts;
      let message = messageParts.join('\t');

      // Skip reactions (covers both "Reacted to "..." and "Reacted to ...")
      if (message.startsWith('Reacted to ')) continue;

      // Handle replies
      if (message.startsWith('Replying to "') || message.startsWith('In reply to "')) {
        if (i + 1 < lines.length && !lines[i + 1].includes('\t')) {
          message = lines[i + 1].trim();
          i++;
        }
      }

      if (message.trim()) {
        results.push({
          callType: call.type,
          callDate: call.date,
          callNumber: call.number,
          type: 'chat',
          timestamp,
          speaker: speaker.trim(),
          text: message.trim(),
          tokens: this.tokenize(message + ' ' + speaker),
          normalizedText: this.normalize(message)
        });
      }
    }

    return results;
  }

  // Parse TLDR for indexing (highlights, action items, decisions, targets)
  private parseTldrForIndex(tldrData: TldrData, call: CallInfo): IndexedContent[] {
    const results: IndexedContent[] = [];

    // Index highlights (categorized agenda items)
    if (tldrData.highlights) {
      const allHighlights: TldrHighlightItem[] = Object.values(tldrData.highlights).flat();
      allHighlights.forEach(item => {
        if (item.highlight) {
          results.push({
            callType: call.type,
            callDate: call.date,
            callNumber: call.number,
            type: 'agenda',
            timestamp: item.timestamp || '00:00:00',
            text: item.highlight,
            tokens: this.tokenize(item.highlight),
            normalizedText: this.normalize(item.highlight)
          });
        }
      });
    }

    // Index action items
    if (tldrData.action_items) {
      tldrData.action_items.forEach(item => {
        if (item.action) {
          results.push({
            callType: call.type,
            callDate: call.date,
            callNumber: call.number,
            type: 'action',
            timestamp: item.timestamp || '00:00:00',
            speaker: item.owner,
            text: item.action,
            tokens: this.tokenize(item.action + ' ' + (item.owner || '')),
            normalizedText: this.normalize(item.action)
          });
        }
      });
    }

    // Index decisions as agenda items
    if (tldrData.decisions) {
      tldrData.decisions.forEach(item => {
        if (item.decision) {
          results.push({
            callType: call.type,
            callDate: call.date,
            callNumber: call.number,
            type: 'agenda',
            timestamp: item.timestamp || '00:00:00',
            text: item.decision,
            tokens: this.tokenize(item.decision),
            normalizedText: this.normalize(item.decision)
          });
        }
      });
    }

    // Index targets as agenda items
    if (tldrData.targets) {
      tldrData.targets.forEach(item => {
        if (item.target) {
          results.push({
            callType: call.type,
            callDate: call.date,
            callNumber: call.number,
            type: 'agenda',
            timestamp: item.timestamp || '00:00:00',
            text: item.target,
            tokens: this.tokenize(item.target),
            normalizedText: this.normalize(item.target)
          });
        }
      });
    }

    return results;
  }

  // Search the index
  async search(query: string, options: {
    callType?: 'all' | 'ACDC' | 'ACDE' | 'ACDT';
    contentType?: 'all' | 'transcript' | 'chat' | 'agenda' | 'action';
    limit?: number;
  } = {}): Promise<IndexedContent[]> {
    // Ensure index is loaded
    const index = await this.getIndex();

    const queryTokens = this.tokenize(query);
    const queryNormalized = this.normalize(query);

    // Find documents containing query tokens
    const docScores = new Map<number, number>();

    // Score based on token matches
    queryTokens.forEach(token => {
      const docIndices = index.invertedIndex.get(token);
      if (docIndices) {
        docIndices.forEach(docIndex => {
          const currentScore = docScores.get(docIndex) || 0;
          docScores.set(docIndex, currentScore + 1);
        });
      }
    });

    // Get documents with scores
    const scoredDocs: Array<{ doc: IndexedContent; score: number }> = [];

    docScores.forEach((score, docIndex) => {
      const doc = index.documents[docIndex];

      // Apply filters
      if (options.callType && options.callType !== 'all' && doc.callType.toUpperCase() !== options.callType) {
        return;
      }
      if (options.contentType && options.contentType !== 'all' && doc.type !== options.contentType) {
        return;
      }

      // Calculate final score
      let finalScore = score;

      // Bonus for exact phrase match
      if (doc.normalizedText.includes(queryNormalized)) {
        finalScore += 10;
      }

      // Bonus for all tokens present
      const allTokensPresent = queryTokens.every(token =>
        doc.tokens.includes(token)
      );
      if (allTokensPresent) {
        finalScore += 5;
      }

      // Type bonuses
      if (doc.type === 'action') finalScore += 3;
      if (doc.type === 'agenda') finalScore += 2;

      scoredDocs.push({ doc, score: finalScore });
    });

    // Sort by score and date
    scoredDocs.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (Math.abs(scoreDiff) > 1) return scoreDiff;

      // For similar scores, sort by date (newest first)
      return b.doc.callDate.localeCompare(a.doc.callDate);
    });

    // Apply limit
    const limit = options.limit || 100;
    return scoredDocs.slice(0, limit).map(item => item.doc);
  }

  // Get or build the index
  async getIndex(): Promise<SearchIndex> {
    // Return existing index if available and fresh.
    if (this.index && !this.isIndexExpired(this.index)) {
      return this.index;
    }

    // Avoid serving stale in-memory indexes.
    this.index = null;

    // Single-flight: one load/build flow shared across concurrent callers.
    if (!this.indexPromise) {
      this.indexPromise = (async () => {
        const corpusMeta = await this.fetchCorpusMeta();
        const expectedCorpusHash = corpusMeta?.sha256;

        const storedIndex = await this.loadFromStorage(expectedCorpusHash);
        if (storedIndex) {
          this.index = storedIndex;
          return storedIndex;
        }

        const builtIndex = await this.buildIndex(undefined, expectedCorpusHash);
        this.index = builtIndex;
        return builtIndex;
      })().finally(() => {
        this.indexPromise = null;
      });
    }

    return this.indexPromise;
  }

  preload(): void {
    void this.getIndex().catch(error => {
      console.error('Error preloading search index:', error);
    });
  }

  // Force rebuild the index
  async rebuildIndex(onProgress?: (progress: number) => void): Promise<void> {
    this.index = null;
    this.indexPromise = null;

    // Clear IndexedDB
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      await new Promise<void>((resolve, reject) => {
        const request = store.delete('index');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      db.close();
    } catch (error) {
      console.error('Error clearing index:', error);
    }

    const corpusMeta = await this.fetchCorpusMeta();
    this.index = await this.buildIndex(onProgress, corpusMeta?.sha256);
  }

  // Check if index needs rebuilding
  needsRebuild(): boolean {
    if (!this.index) return true;
    return this.isIndexExpired(this.index);
  }

  // Get index statistics
  getStats(): { documentCount: number; tokenCount: number; callCount: number; lastUpdated: Date | null } | null {
    if (!this.index) return null;

    return {
      documentCount: this.index.documents.length,
      tokenCount: this.index.invertedIndex.size,
      callCount: this.index.callIndex.size,
      lastUpdated: new Date(this.index.lastUpdated)
    };
  }
}

export const searchIndexService = SearchIndexService.getInstance();
