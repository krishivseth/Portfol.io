import { StockAnalysisResult } from "../types";

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

interface CachedAnalysis {
  result: StockAnalysisResult;
  timestamp: number;
}

export class AnalysisCache {
  private state: DurableObjectState;
  private env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/get" && request.method === "GET") {
      const symbol = url.searchParams.get("symbol");
      if (!symbol) return new Response("symbol required", { status: 400 });
      const analysis = await this.getAnalysis(symbol);
      if (!analysis) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      }
      return new Response(JSON.stringify(analysis), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/cache" && request.method === "POST") {
      const { symbol, result } = await request.json() as { symbol: string; result: StockAnalysisResult };
      await this.setAnalysis(symbol, result);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/invalidate" && request.method === "POST") {
      const { symbol } = await request.json() as { symbol?: string };
      if (symbol) {
        await this.invalidate(symbol);
      } else {
        await this.invalidateAll();
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  }
  async getAnalysis(symbol: string): Promise<StockAnalysisResult | null> {
    const key = `analysis:${symbol.toUpperCase()}`;
    const cached = await this.state.storage.get<CachedAnalysis>(key);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache is expired
    const age = Date.now() - cached.timestamp;
    if (age > CACHE_TTL) {
      await this.state.storage.delete(key);
      return null;
    }
    
    return cached.result;
  }

  async setAnalysis(symbol: string, result: StockAnalysisResult): Promise<void> {
    const key = `analysis:${symbol.toUpperCase()}`;
    const cached: CachedAnalysis = {
      result,
      timestamp: Date.now(),
    };
    await this.state.storage.put(key, cached);
  }

  async invalidate(symbol: string): Promise<void> {
    const key = `analysis:${symbol.toUpperCase()}`;
    await this.state.storage.delete(key);
  }

  async invalidateAll(): Promise<void> {
    const keys = await this.state.storage.list({ prefix: "analysis:" });
    for (const [key] of keys.entries()) {
      await this.state.storage.delete(key);
    }
  }

  async getMultiple(symbols: string[]): Promise<Map<string, StockAnalysisResult>> {
    const results = new Map<string, StockAnalysisResult>();
    for (const symbol of symbols) {
      const analysis = await this.getAnalysis(symbol);
      if (analysis) {
        results.set(symbol.toUpperCase(), analysis);
      }
    }
    return results;
  }
}

