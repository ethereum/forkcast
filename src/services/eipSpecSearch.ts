interface SpecEntry {
  id: number;
  text: string;
}

export interface SpecSearchResult {
  eipId: number;
  score: number;
}

class EipSpecSearchService {
  private static instance: EipSpecSearchService;
  private entries: SpecEntry[] | null = null;
  private invertedIndex: Map<string, Set<number>> | null = null;
  private loadPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): EipSpecSearchService {
    if (!EipSpecSearchService.instance) {
      EipSpecSearchService.instance = new EipSpecSearchService();
    }
    return EipSpecSearchService.instance;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  private async load(): Promise<void> {
    if (this.entries) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const res = await fetch('/eip-spec-index.json');
      if (!res.ok) throw new Error(`Failed to load EIP spec index: ${res.status}`);
      const data: SpecEntry[] = await res.json();

      const idx = new Map<string, Set<number>>();
      for (let i = 0; i < data.length; i++) {
        const tokens = this.tokenize(data[i].text);
        const seen = new Set<string>();
        for (const token of tokens) {
          if (seen.has(token)) continue;
          seen.add(token);
          let set = idx.get(token);
          if (!set) {
            set = new Set();
            idx.set(token, set);
          }
          set.add(i);
        }
      }

      this.entries = data;
      this.invertedIndex = idx;
    })().catch((err) => {
      console.error('EIP spec search index load failed:', err);
      this.loadPromise = null;
      throw err;
    });

    return this.loadPromise;
  }

  /** Ensure index is loaded. Call early to warm up. */
  async warmup(): Promise<void> {
    try {
      await this.load();
    } catch {
      // Swallow — search will return empty results
    }
  }

  async search(query: string, limit = 50): Promise<SpecSearchResult[]> {
    await this.load();
    if (!this.entries || !this.invertedIndex) return [];

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];

    const scores = new Map<number, number>();
    for (const token of queryTokens) {
      const docIndices = this.invertedIndex.get(token);
      if (!docIndices) continue;
      for (const idx of docIndices) {
        scores.set(idx, (scores.get(idx) || 0) + 1);
      }
    }

    const queryNorm = query.toLowerCase().trim();
    const results: SpecSearchResult[] = [];

    for (const [idx, tokenScore] of scores) {
      let score = tokenScore;

      // Bonus for all query tokens present
      if (tokenScore === queryTokens.length) score += 3;

      // Bonus for exact phrase match
      if (this.entries[idx].text.toLowerCase().includes(queryNorm)) {
        score += 5;
      }

      results.push({ eipId: this.entries[idx].id, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }
}

export const eipSpecSearchService = EipSpecSearchService.getInstance();
