// Type definitions for the portfolio management system

export interface UserPortfolio {
  userid: string;
  user_name: string;
  bank_bal: number;
  portfolio: Record<string, number>; // stock_symbol -> quantity
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

export interface ConversationMessage {
  role: "agent" | "user" | "system";
  content: string;
  timestamp: number;
}

export interface TechnicalAnalysis {
  symbol: string;
  timestamp: number;
  currentPrice: number;
  fibonacci: {
    level23_6: number;
    level38_2: number;
    level50: number;
    level61_8: number;
    level78_6: number;
  };
  regression: {
    linear: {
      slope: number;
      intercept: number;
      rSquared: number;
    };
    polynomial: {
      coefficients: number[];
      rSquared: number;
    };
  };
  reversalPoints: Array<{
    index: number;
    price: number;
    type: "support" | "resistance";
    strength: number;
  }>;
  rsi: number;
  movingAverages: {
    sma20: number;
    sma50: number;
    ema20: number;
    ema50: number;
  };
}

export interface StockAnalysisResult {
  symbol: string;
  technicalAnalysis: TechnicalAnalysis;
  recommendation: "buy" | "hold" | "sell";
  reasoning: string;
  confidence: number;
  timestamp: number;
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

// Retell AI types
export interface Utterance {
  role: "agent" | "user" | "system";
  content: string;
}

export interface ResponseRequiredRequest {
  interaction_type: "reminder_required" | "response_required";
  response_id: number;
  transcript: Utterance[];
}

export interface ResponseResponse {
  response_type: "response";
  response_id: number;
  content: string;
  content_complete: boolean;
  end_call?: boolean;
}

export interface ConfigResponse {
  response_type: "config";
  config: {
    auto_reconnect: boolean;
    call_details: boolean;
  };
  response_id: number;
}

export interface PingPongResponse {
  response_type: "ping_pong";
  timestamp: number;
}

