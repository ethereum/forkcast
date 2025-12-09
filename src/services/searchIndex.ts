import { protocolCalls } from '../data/calls';

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
  private async loadFromStorage(): Promise<SearchIndex | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);

      const data = await new Promise<any>((resolve, reject) => {
        const request = store.get('index');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      db.close();

      if (!data) return null;

      // Check version and age
      if (data.version !== this.INDEX_VERSION) return null;
      if (Date.now() - data.lastUpdated > this.MAX_INDEX_AGE) return null;

      // Reconstruct Maps from stored data
      const index: SearchIndex = {
        documents: data.documents,
        invertedIndex: new Map(
          Object.entries(data.invertedIndex).map(([key, value]) => [key, new Set(value as number[])])
        ),
        callIndex: new Map(Object.entries(data.callIndex)),
        lastUpdated: data.lastUpdated
      };

      return index;
    } catch (error) {
      console.error('Error loading search index from storage:', error);
      return null;
    }
  }

  // Save index to IndexedDB
  private async saveToStorage(index: SearchIndex): Promise<void> {
    try {
      const data = {
        version: this.INDEX_VERSION,
        documents: index.documents,
        invertedIndex: Object.fromEntries(
          Array.from(index.invertedIndex.entries()).map(([key, value]) => [key, Array.from(value)])
        ),
        callIndex: Object.fromEntries(index.callIndex.entries()),
        lastUpdated: index.lastUpdated
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

  // Build the search index
  async buildIndex(onProgress?: (progress: number) => void): Promise<SearchIndex> {
    const index: SearchIndex = {
      documents: [],
      invertedIndex: new Map(),
      callIndex: new Map(),
      lastUpdated: Date.now()
    };

    const totalCalls = protocolCalls.length;
    let processedCalls = 0;

    for (const call of protocolCalls) {
      const callKey = `${call.type}_${call.date}_${call.number}`;
      const callDocIndices: number[] = [];

      try {
        // Fetch all content for this call
        const baseUrl = `/artifacts/${call.type}/${call.date}_${call.number}`;

        const [transcript, chat, agenda, tldr] = await Promise.all([
          fetch(`${baseUrl}/transcript.vtt`).then(res => res.ok ? res.text() : null).catch(() => null),
          fetch(`${baseUrl}/chat.txt`).then(res => res.ok ? res.text() : null).catch(() => null),
          fetch(`${baseUrl}/agenda.json`).then(res => res.ok ? res.json() : null).catch(() => null),
          fetch(`${baseUrl}/tldr.json`).then(res => res.ok ? res.json() : null).catch(() => null)
        ]);

        // Process transcript
        if (transcript) {
          const entries = this.parseTranscriptForIndex(transcript, call);
          entries.forEach(entry => {
            const docIndex = index.documents.length;
            index.documents.push(entry);
            callDocIndices.push(docIndex);

            // Update inverted index
            entry.tokens.forEach(token => {
              if (!index.invertedIndex.has(token)) {
                index.invertedIndex.set(token, new Set());
              }
              index.invertedIndex.get(token)!.add(docIndex);
            });
          });
        }

        // Process chat
        if (chat) {
          const entries = this.parseChatForIndex(chat, call);
          entries.forEach(entry => {
            const docIndex = index.documents.length;
            index.documents.push(entry);
            callDocIndices.push(docIndex);

            // Update inverted index
            entry.tokens.forEach(token => {
              if (!index.invertedIndex.has(token)) {
                index.invertedIndex.set(token, new Set());
              }
              index.invertedIndex.get(token)!.add(docIndex);
            });
          });
        }

        // Process agenda (includes action items)
        if (agenda?.agenda) {
          const entries = this.parseAgendaForIndex(agenda, call);
          entries.forEach(entry => {
            const docIndex = index.documents.length;
            index.documents.push(entry);
            callDocIndices.push(docIndex);

            // Update inverted index
            entry.tokens.forEach(token => {
              if (!index.invertedIndex.has(token)) {
                index.invertedIndex.set(token, new Set());
              }
              index.invertedIndex.get(token)!.add(docIndex);
            });
          });
        }

        // Process TLDR (highlights, action items, decisions, targets)
        if (tldr) {
          const entries = this.parseTldrForIndex(tldr, call);
          entries.forEach(entry => {
            const docIndex = index.documents.length;
            index.documents.push(entry);
            callDocIndices.push(docIndex);

            // Update inverted index
            entry.tokens.forEach(token => {
              if (!index.invertedIndex.has(token)) {
                index.invertedIndex.set(token, new Set());
              }
              index.invertedIndex.get(token)!.add(docIndex);
            });
          });
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
    await this.saveToStorage(index);

    return index;
  }

  // Parse transcript for indexing
  private parseTranscriptForIndex(content: string, call: any): IndexedContent[] {
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
  private parseChatForIndex(content: string, call: any): IndexedContent[] {
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

  // Parse agenda for indexing
  private parseAgendaForIndex(agendaData: any, call: any): IndexedContent[] {
    const results: IndexedContent[] = [];

    agendaData.agenda.forEach((section: any) => {
      section.items?.forEach((item: any) => {
        // Index agenda item itself
        if (item.title || item.summary) {
          // Use title as the text for matching, but include both title and summary in tokens for searching
          const searchText = [item.title, item.summary].filter(Boolean).join(' ');
          results.push({
            callType: call.type,
            callDate: call.date,
            callNumber: call.number,
            type: 'agenda',
            timestamp: item.start_timestamp || '00:00:00',
            text: item.title, // Store just the title for matching in AgendaSummary
            tokens: this.tokenize(searchText), // But index both title and summary for search
            normalizedText: this.normalize(searchText)
          });
        }

        // Index action items within this agenda item
        if (item.action_items && Array.isArray(item.action_items)) {
          item.action_items.forEach((actionItem: any) => {
            if (actionItem.what) {
              results.push({
                callType: call.type,
                callDate: call.date,
                callNumber: call.number,
                type: 'action',
                timestamp: actionItem.timestamp || item.start_timestamp || '00:00:00',
                speaker: actionItem.who,
                text: actionItem.what,
                tokens: this.tokenize(actionItem.what + ' ' + (actionItem.who || '')),
                normalizedText: this.normalize(actionItem.what)
              });
            }
          });
        }
      });
    });

    return results;
  }

  // Parse TLDR for indexing (highlights, action items, decisions, targets)
  private parseTldrForIndex(tldrData: any, call: any): IndexedContent[] {
    const results: IndexedContent[] = [];

    // Index highlights (categorized agenda items)
    if (tldrData.highlights) {
      Object.values(tldrData.highlights).forEach((categoryHighlights: any) => {
        categoryHighlights.forEach((item: any) => {
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
      });
    }

    // Index action items
    if (tldrData.action_items && Array.isArray(tldrData.action_items)) {
      tldrData.action_items.forEach((item: any) => {
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
    if (tldrData.decisions && Array.isArray(tldrData.decisions)) {
      tldrData.decisions.forEach((item: any) => {
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
    if (tldrData.targets && Array.isArray(tldrData.targets)) {
      tldrData.targets.forEach((item: any) => {
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
    // Return existing index if available
    if (this.index) {
      return this.index;
    }

    // Return ongoing index build if in progress
    if (this.indexPromise) {
      return this.indexPromise;
    }

    // Try loading from storage
    const storedIndex = await this.loadFromStorage();
    if (storedIndex) {
      this.index = storedIndex;
      return storedIndex;
    }

    // Build new index
    this.indexPromise = this.buildIndex();
    this.index = await this.indexPromise;
    this.indexPromise = null;

    return this.index;
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

    await this.buildIndex(onProgress);
  }

  // Check if index needs rebuilding
  needsRebuild(): boolean {
    if (!this.index) return true;
    return Date.now() - this.index.lastUpdated > this.MAX_INDEX_AGE;
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