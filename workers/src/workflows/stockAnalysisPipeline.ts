import { WorkflowEntrypoint, WorkflowStep } from "cloudflare:workers";
import { fetchStockData } from "../utils/stockData";
import { performTechnicalAnalysis } from "../utils/technicalAnalysis";
import { generateRecommendation } from "../utils/llmClient";
import { StockAnalysisResult, TechnicalAnalysis, UserPortfolio } from "../types";

interface WorkflowInput {
  symbol: string;
  userId?: string;
  portfolio?: UserPortfolio;
  finnhubKey: string;
  alphaVantageKey: string;
  aiBinding: any;
}

interface WorkflowOutput {
  success: boolean;
  result?: StockAnalysisResult;
  error?: string;
}

export class StockAnalysisPipeline extends WorkflowEntrypoint {
  async run(event: WorkflowStep, env: any, ctx: ExecutionContext): Promise<WorkflowOutput> {
    const input: WorkflowInput = event.payload;
    
    try {
      // Step 1: Fetch stock data
      const stockData = await this.fetchStockDataStep(
        input.symbol,
        input.finnhubKey,
        input.alphaVantageKey
      );
      
      if (!stockData) {
        return {
          success: false,
          error: "Failed to fetch stock data",
        };
      }
      
      // Step 2: Calculate technical indicators
      const technicalAnalysis = await this.calculateTechnicalIndicatorsStep(
        input.symbol,
        stockData.currentPrice,
        stockData.historicalPrices
      );
      
      // Step 3: Generate AI recommendation
      const recommendation = await this.generateRecommendationStep(
        input.aiBinding,
        input.symbol,
        technicalAnalysis,
        input.portfolio
      );
      
      // Step 4: Compile result
      const result: StockAnalysisResult = {
        symbol: input.symbol.toUpperCase(),
        technicalAnalysis,
        recommendation: recommendation.recommendation,
        reasoning: recommendation.reasoning,
        confidence: recommendation.confidence,
        timestamp: Date.now(),
      };
      
      return {
        success: true,
        result,
      };
    } catch (error: any) {
      console.error("StockAnalysisPipeline error:", error);
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  }
  
  private async fetchStockDataStep(
    symbol: string,
    finnhubKey: string,
    alphaVantageKey: string
  ): Promise<{ currentPrice: number; historicalPrices: number[] } | null> {
    return await fetchStockData(symbol, finnhubKey, alphaVantageKey, 100);
  }
  
  private async calculateTechnicalIndicatorsStep(
    symbol: string,
    currentPrice: number,
    historicalPrices: number[]
  ): Promise<TechnicalAnalysis> {
    return performTechnicalAnalysis(symbol, historicalPrices, currentPrice);
  }
  
  private async generateRecommendationStep(
    aiBinding: any,
    symbol: string,
    technicalAnalysis: TechnicalAnalysis,
    portfolio?: UserPortfolio
  ): Promise<{ recommendation: "buy" | "hold" | "sell"; reasoning: string; confidence: number }> {
    return await generateRecommendation(
      { AI: aiBinding },
      symbol,
      technicalAnalysis,
      portfolio
    );
  }
}

