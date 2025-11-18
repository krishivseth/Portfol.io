import { TechnicalAnalysis, UserPortfolio, StockAnalysisResult } from "../types";

interface LLMEnv {
  AI: any; // Workers AI binding
}

/**
 * Generate investment recommendation using Llama 3.3
 */
export async function generateRecommendation(
  env: LLMEnv,
  symbol: string,
  technicalAnalysis: TechnicalAnalysis,
  portfolio?: UserPortfolio
): Promise<{ recommendation: "buy" | "hold" | "sell"; reasoning: string; confidence: number }> {
  const prompt = buildRecommendationPrompt(symbol, technicalAnalysis, portfolio);
  
  const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct", {
    messages: [
      {
        role: "system",
        content: "You are Trevor, a professional investment banking assistant. Provide clear, data-driven investment recommendations.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });
  
  const content = response.response || JSON.stringify(response);
  return parseRecommendationResponse(content);
}

/**
 * Process voice query for conversational interface
 */
export async function processVoiceQuery(
  env: LLMEnv,
  transcript: Array<{ role: string; content: string }>,
  context?: { portfolio?: UserPortfolio; recentAnalysis?: StockAnalysisResult[] }
): Promise<string> {
  const systemPrompt = buildVoiceSystemPrompt(context);
  
  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
    ...transcript.map(msg => ({
      role: msg.role === "agent" ? "assistant" : "user",
      content: msg.content,
    })),
  ];
  
  const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct", {
    messages,
  });
  
  return response.response || JSON.stringify(response);
}

/**
 * Summarize technical analysis for user-friendly presentation
 */
export async function summarizeAnalysis(
  env: LLMEnv,
  technicalAnalysis: TechnicalAnalysis
): Promise<string> {
  const prompt = `Summarize this technical analysis in 2-3 sentences for an investor:

Symbol: ${technicalAnalysis.symbol}
Current Price: $${technicalAnalysis.currentPrice.toFixed(2)}
RSI: ${technicalAnalysis.rsi.toFixed(2)}
20-day SMA: $${technicalAnalysis.movingAverages.sma20.toFixed(2)}
50-day SMA: $${technicalAnalysis.movingAverages.sma50.toFixed(2)}
Trend (Linear Regression R²): ${technicalAnalysis.regression.linear.rSquared.toFixed(3)}
Reversal Points: ${technicalAnalysis.reversalPoints.length} detected

Focus on actionable insights and what these indicators suggest about the stock's direction.`;
  
  const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct", {
    messages: [
      {
        role: "system",
        content: "You are a financial analyst. Provide concise, clear summaries of technical analysis.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });
  
  return response.response || JSON.stringify(response);
}

/**
 * Build recommendation prompt for Llama 3.3
 */
function buildRecommendationPrompt(
  symbol: string,
  technicalAnalysis: TechnicalAnalysis,
  portfolio?: UserPortfolio
): string {
  let prompt = `[INST] Analyze ${symbol} stock and provide a Buy/Hold/Sell recommendation.

Technical Analysis:
- Current Price: $${technicalAnalysis.currentPrice.toFixed(2)}
- RSI: ${technicalAnalysis.rsi.toFixed(2)} ${technicalAnalysis.rsi > 70 ? "(Overbought)" : technicalAnalysis.rsi < 30 ? "(Oversold)" : "(Neutral)"}
- 20-day SMA: $${technicalAnalysis.movingAverages.sma20.toFixed(2)}
- 50-day SMA: $${technicalAnalysis.movingAverages.sma50.toFixed(2)}
- Trend Strength (R²): ${technicalAnalysis.regression.linear.rSquared.toFixed(3)}
- Trend Direction: ${technicalAnalysis.regression.linear.slope > 0 ? "Upward" : "Downward"}
- Support/Resistance Levels: ${technicalAnalysis.reversalPoints.length} key levels detected

Fibonacci Retracement Levels:
- 23.6%: $${technicalAnalysis.fibonacci.level23_6.toFixed(2)}
- 38.2%: $${technicalAnalysis.fibonacci.level38_2.toFixed(2)}
- 50%: $${technicalAnalysis.fibonacci.level50.toFixed(2)}
- 61.8%: $${technicalAnalysis.fibonacci.level61_8.toFixed(2)}
- 78.6%: $${technicalAnalysis.fibonacci.level78_6.toFixed(2)}

`;

  if (portfolio) {
    const currentHolding = portfolio.portfolio[symbol] || 0;
    prompt += `User Portfolio Context:
- Current ${symbol} Holdings: ${currentHolding} shares
- Portfolio Balance: $${portfolio.bank_bal.toFixed(2)}
- Total Portfolio Value: $${Object.entries(portfolio.portfolio).reduce((sum, [sym, qty]) => sum + (qty * 100), portfolio.bank_bal).toFixed(2)}

`;
  }

  prompt += `Based on this analysis, provide:
1. Recommendation: BUY, HOLD, or SELL
2. Reasoning: 2-3 sentences explaining your recommendation
3. Confidence: A number between 0-100

Respond in JSON format:
{
  "recommendation": "buy|hold|sell",
  "reasoning": "your reasoning here",
  "confidence": 75
}
[/INST]`;

  return prompt;
}

/**
 * Build voice system prompt
 */
function buildVoiceSystemPrompt(context?: { portfolio?: UserPortfolio; recentAnalysis?: StockAnalysisResult[] }): string {
  let prompt = `You are Trevor, an AI investment banking assistant. You are professional, confident, and precise. 

Guidelines:
- Keep responses extremely concise (1-2 sentences max unless user requests detail)
- Be conversational and human-like
- Don't repeat information from the transcript
- Always clearly state Buy/Hold/Sell recommendations when asked
- Support recommendations with brief reasoning
- If you don't have enough information, ask for clarification

`;

  if (context?.portfolio) {
    prompt += `User Portfolio:
- Balance: $${context.portfolio.bank_bal.toFixed(2)}
- Holdings: ${Object.keys(context.portfolio.portfolio).length} stocks
- Current positions: ${Object.entries(context.portfolio.portfolio).map(([sym, qty]) => `${qty} ${sym}`).join(", ")}

`;
  }

  if (context?.recentAnalysis && context.recentAnalysis.length > 0) {
    prompt += `Recent Analysis Available:\n`;
    context.recentAnalysis.forEach(analysis => {
      prompt += `- ${analysis.symbol}: ${analysis.recommendation.toUpperCase()} (${analysis.confidence}% confidence)\n`;
    });
    prompt += "\n";
  }

  return prompt;
}

/**
 * Parse LLM response to extract recommendation
 */
function parseRecommendationResponse(content: string): {
  recommendation: "buy" | "hold" | "sell";
  reasoning: string;
  confidence: number;
} {
  // Try to extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        recommendation: (parsed.recommendation || "hold").toLowerCase() as "buy" | "hold" | "sell",
        reasoning: parsed.reasoning || "Analysis completed",
        confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
      };
    } catch (e) {
      // Fall through to text parsing
    }
  }
  
  // Fallback: parse from text
  const lowerContent = content.toLowerCase();
  let recommendation: "buy" | "hold" | "sell" = "hold";
  
  if (lowerContent.includes("buy") && !lowerContent.includes("sell")) {
    recommendation = "buy";
  } else if (lowerContent.includes("sell") && !lowerContent.includes("buy")) {
    recommendation = "sell";
  }
  
  // Extract confidence if mentioned
  const confidenceMatch = content.match(/(\d+)%/);
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;
  
  return {
    recommendation,
    reasoning: content.substring(0, 200), // First 200 chars as reasoning
    confidence,
  };
}

