import { PortfolioState } from "./durable-objects/PortfolioState";
import { TransactionLog } from "./durable-objects/TransactionLog";
import { ConversationMemory } from "./durable-objects/ConversationMemory";
import { AnalysisCache } from "./durable-objects/AnalysisCache";
import { WebSocketConnection } from "./durable-objects/WebSocketConnection";
import { StockAnalysisPipeline } from "./workflows/stockAnalysisPipeline";
import { processVoiceQuery } from "./utils/llmClient";
import { fetchStockQuote } from "./utils/stockData";
import { ResponseRequiredRequest, ResponseResponse, TradeRequest, AnalyzeRequest } from "./types";

// Export Durable Objects for Wrangler
export { PortfolioState, TransactionLog, ConversationMemory, AnalysisCache, WebSocketConnection };

export interface Env {
  PORTFOLIO_STATE: DurableObjectNamespace<PortfolioState>;
  TRANSACTION_LOG: DurableObjectNamespace<TransactionLog>;
  CONVERSATION_MEMORY: DurableObjectNamespace<ConversationMemory>;
  ANALYSIS_CACHE: DurableObjectNamespace<AnalysisCache>;
  WS_CONNECTION: DurableObjectNamespace<WebSocketConnection>;
  STOCK_ANALYSIS: any; // Workflow binding
  AI: any; // Workers AI binding
  FINNHUB_API_KEY: string;
  ALPHAVANTAGE_API_KEY: string;
  RETELL_API_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }
    
    // WebSocket upgrade for voice interface
    if (url.pathname.startsWith("/llm-websocket/")) {
      return handleWebSocketUpgrade(request, env, ctx);
    }
    
    // API routes
    try {
      if (url.pathname === "/api/portfolio" && request.method === "GET") {
        return handleGetPortfolio(request, env);
      }
      
      if (url.pathname.startsWith("/api/portfolio/") && request.method === "GET") {
        const userId = url.pathname.split("/")[3];
        return handleGetUserPortfolio(userId, env);
      }
      
      if (url.pathname.startsWith("/api/transactions/") && request.method === "GET") {
        const userId = url.pathname.split("/")[3];
        return handleGetTransactions(userId, env);
      }
      
      if (url.pathname === "/api/trade" && request.method === "POST") {
        return handleTrade(request, env);
      }
      
      if (url.pathname === "/api/analyze" && request.method === "POST") {
        return handleAnalyze(request, env);
      }
      
      if (url.pathname.startsWith("/api/analysis/") && request.method === "GET") {
        const symbol = url.pathname.split("/")[3];
        return handleGetAnalysis(symbol, env);
      }
      
      if (url.pathname === "/webhook" && request.method === "POST") {
        return handleWebhook(request, env);
      }
      
      if (url.pathname === "/api/migrate" && request.method === "POST") {
        return handleMigrate(request, env);
      }
      
      return new Response("Not Found", { status: 404 });
    } catch (error: any) {
      console.error("Error handling request:", error);
      return jsonResponse({ error: error.message || "Internal Server Error" }, 500);
    }
  },
};

// CORS headers helper
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

// Get all portfolios
async function handleGetPortfolio(request: Request, env: Env): Promise<Response> {
  const id = env.PORTFOLIO_STATE.idFromName("global");
  const stub = env.PORTFOLIO_STATE.get(id);
  const response = await stub.fetch("http://internal/all");
  const portfolios = await response.json();
  return jsonResponse(portfolios);
}

// Get user portfolio
async function handleGetUserPortfolio(userId: string, env: Env): Promise<Response> {
  try {
    const id = env.PORTFOLIO_STATE.idFromName(userId);
    const stub = env.PORTFOLIO_STATE.get(id);
    const response = await stub.fetch(`http://internal/get?userId=${userId}`);
    
    if (!response.ok) {
      return jsonResponse({ error: "User not found" }, 404);
    }
    
    const portfolio = await response.json();
    
    if (!portfolio || portfolio === null) {
      return jsonResponse({ error: "User not found" }, 404);
    }
    
    return jsonResponse(portfolio);
  } catch (error: any) {
    console.error("Error getting portfolio:", error);
    return jsonResponse({ error: error.message || "Internal server error" }, 500);
  }
}

// Get user transactions
async function handleGetTransactions(userId: string, env: Env): Promise<Response> {
  const id = env.TRANSACTION_LOG.idFromName("global");
  const stub = env.TRANSACTION_LOG.get(id);
  const response = await stub.fetch(`http://internal/get?userId=${userId}`);
  const transactions = await response.json();
  return jsonResponse(transactions);
}

// Execute trade (buy/sell)
async function handleTrade(request: Request, env: Env): Promise<Response> {
  const tradeRequest: TradeRequest = await request.json();
  
  // Get current stock price
  const currentPrice = await fetchStockQuote(tradeRequest.stock_symbol, env.FINNHUB_API_KEY);
  if (!currentPrice) {
    return jsonResponse({ error: "Could not fetch stock price" }, 400);
  }
  
  // Get portfolio state
  const portfolioId = env.PORTFOLIO_STATE.idFromName(tradeRequest.userid);
  const portfolioStub = env.PORTFOLIO_STATE.get(portfolioId);
  
  const tradeEndpoint = tradeRequest.type === "buy" ? "/buy" : "/sell";
  const tradeResponse = await portfolioStub.fetch(`http://internal${tradeEndpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: tradeRequest.userid,
      stockSymbol: tradeRequest.stock_symbol,
      quantity: tradeRequest.quantity,
      pricePerShare: currentPrice,
    }),
  });
  
  const result = await tradeResponse.json();
  
  if (!result.success) {
    return jsonResponse({ error: result.error }, 400);
  }
  
  // Log transaction
  const transactionId = env.TRANSACTION_LOG.idFromName("global");
  const transactionStub = env.TRANSACTION_LOG.get(transactionId);
  
  const idResponse = await transactionStub.fetch("http://internal/generate-id");
  const { id: txId } = await idResponse.json();
  
  await transactionStub.fetch("http://internal/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: txId,
      userid: tradeRequest.userid,
      stock_symbol: tradeRequest.stock_symbol,
      stock_name: tradeRequest.stock_symbol, // Could be enhanced with company name lookup
      type: tradeRequest.type,
      shares: tradeRequest.quantity,
      price_per_share: currentPrice,
      date: new Date().toISOString().split("T")[0],
      initiator: tradeRequest.initiator || "user",
    }),
  });
  
  return jsonResponse({
    success: true,
    newBalance: result.newBalance,
    message: `Stock ${tradeRequest.type} executed successfully`,
  });
}

// Analyze stock (on-demand)
async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  const analyzeRequest: AnalyzeRequest = await request.json();
  const { symbol, userId, useCache = true } = analyzeRequest;
  
  // Check cache first if requested
  if (useCache) {
    const cacheId = env.ANALYSIS_CACHE.idFromName("global");
    const cacheStub = env.ANALYSIS_CACHE.get(cacheId);
    const cacheResponse = await cacheStub.fetch(`http://internal/get?symbol=${symbol}`);
    if (cacheResponse.ok) {
      const cached = await cacheResponse.json();
      return jsonResponse(cached);
    }
  }
  
  // Get user portfolio if userId provided
  let portfolio = undefined;
  if (userId) {
    const portfolioId = env.PORTFOLIO_STATE.idFromName(userId);
    const portfolioStub = env.PORTFOLIO_STATE.get(portfolioId);
    const portfolioResponse = await portfolioStub.fetch(`http://internal/get?userId=${userId}`);
    portfolio = await portfolioResponse.json();
  }
  
  // Trigger workflow
  const workflow = new StockAnalysisPipeline();
  const workflowResult = await workflow.run(
    {
      payload: {
        symbol,
        userId,
        portfolio,
        finnhubKey: env.FINNHUB_API_KEY,
        alphaVantageKey: env.ALPHAVANTAGE_API_KEY,
        aiBinding: env.AI,
      },
    } as any,
    env,
    {} as ExecutionContext
  );
  
  if (!workflowResult.success || !workflowResult.result) {
    return jsonResponse({ error: workflowResult.error || "Analysis failed" }, 500);
  }
  
  // Cache the result
  const cacheId = env.ANALYSIS_CACHE.idFromName("global");
  const cacheStub = env.ANALYSIS_CACHE.get(cacheId);
  await cacheStub.fetch("http://internal/cache", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol,
      result: workflowResult.result,
    }),
  });
  
  return jsonResponse(workflowResult.result);
}

// Get cached analysis
async function handleGetAnalysis(symbol: string, env: Env): Promise<Response> {
  const cacheId = env.ANALYSIS_CACHE.idFromName("global");
  const cacheStub = env.ANALYSIS_CACHE.get(cacheId);
  const response = await cacheStub.fetch(`http://internal/get?symbol=${symbol}`);
  
  if (!response.ok) {
    return jsonResponse({ error: "Analysis not found in cache" }, 404);
  }
  
  const analysis = await response.json();
  return jsonResponse(analysis);
}

// Handle Retell webhook
async function handleWebhook(request: Request, env: Env): Promise<Response> {
  // Verify signature if RETELL_API_KEY is set
  if (env.RETELL_API_KEY) {
    const signature = request.headers.get("X-Retell-Signature");
    // Add signature verification logic here if needed
  }
  
  const data = await request.json();
  console.log("Webhook event:", data.event, data.data?.call_id);
  
  return jsonResponse({ received: true });
}

// Migrate portfolio data from JSON
async function handleMigrate(request: Request, env: Env): Promise<Response> {
  try {
    const { portfolios } = await request.json() as { portfolios: any[] };
    let migrated = 0;
    
    for (const portfolio of portfolios) {
      const id = env.PORTFOLIO_STATE.idFromName(portfolio.userid);
      const stub = env.PORTFOLIO_STATE.get(id);
      
      await stub.fetch("http://internal/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: portfolio.userid,
          portfolio: portfolio,
        }),
      });
      
      migrated++;
    }
    
    return jsonResponse({ success: true, migrated });
  } catch (error: any) {
    console.error("Migration error:", error);
    return jsonResponse({ error: error.message || "Migration failed" }, 500);
  }
}

// Handle WebSocket upgrade for voice interface
async function handleWebSocketUpgrade(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const callId = url.pathname.split("/")[2];
  
  if (!callId) {
    return new Response("Call ID required", { status: 400 });
  }
  
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);
  
  // Get WebSocket Durable Object
  const id = env.WS_CONNECTION.idFromName(callId);
  const stub = env.WS_CONNECTION.get(id);
  
  // Accept the WebSocket connection via Durable Object
  ctx.waitUntil(
    stub.fetch(new Request("http://internal/ws", {
      method: "GET",
      headers: { "Upgrade": "websocket" },
    })).catch((error: any) => {
      console.error("WebSocket error:", error);
      server.close(1011, "Server error");
    })
  );
  
  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

