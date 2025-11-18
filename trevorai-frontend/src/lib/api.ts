// API client for Cloudflare Workers backend

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787";

export interface UserPortfolio {
  userid: string;
  user_name: string;
  bank_bal: number;
  portfolio: Record<string, number>;
}

export interface Transaction {
  id: string;
  userid: string;
  stock_symbol: string;
  stock_name: string;
  type: "buy" | "sell";
  shares: number;
  price_per_share: number;
  date: string;
  initiator: "agent" | "user";
}

export interface TradeRequest {
  userid: string;
  stock_symbol: string;
  quantity: number;
  type: "buy" | "sell";
  initiator?: "agent" | "user";
}

export interface AnalyzeRequest {
  symbol: string;
  userId?: string;
  useCache?: boolean;
}

export interface StockAnalysisResult {
  symbol: string;
  technicalAnalysis: any;
  recommendation: "buy" | "hold" | "sell";
  reasoning: string;
  confidence: number;
  timestamp: number;
}

export async function getPortfolio(userId: string): Promise<UserPortfolio> {
  const response = await fetch(`${WORKER_URL}/api/portfolio/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch portfolio: ${response.statusText}`);
  }
  return response.json();
}

export async function getTransactions(userId: string): Promise<Transaction[]> {
  const response = await fetch(`${WORKER_URL}/api/transactions/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.statusText}`);
  }
  return response.json();
}

export async function executeTrade(trade: TradeRequest): Promise<{ success: boolean; newBalance?: number; message?: string; error?: string }> {
  const response = await fetch(`${WORKER_URL}/api/trade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(trade),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Trade failed: ${response.statusText}`);
  }
  
  return response.json();
}

export async function analyzeStock(request: AnalyzeRequest): Promise<StockAnalysisResult> {
  const response = await fetch(`${WORKER_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }
  
  return response.json();
}

export async function getCachedAnalysis(symbol: string): Promise<StockAnalysisResult | null> {
  const response = await fetch(`${WORKER_URL}/api/analysis/${symbol}`);
  if (!response.ok) {
    return null;
  }
  return response.json();
}

