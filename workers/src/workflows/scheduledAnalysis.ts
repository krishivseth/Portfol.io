import { WorkflowEntrypoint, WorkflowStep } from "cloudflare:workers";
import { StockAnalysisPipeline } from "./stockAnalysisPipeline";
import { StockAnalysisResult } from "../types";

interface ScheduledAnalysisInput {
  symbols: string[];
  finnhubKey: string;
  alphaVantageKey: string;
  aiBinding: any;
  analysisCacheBinding: any; // Durable Object stub
}

interface ScheduledAnalysisOutput {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}

/**
 * Scheduled workflow that pre-calculates analysis for popular stocks
 * Runs every 15 minutes via cron trigger
 */
export class ScheduledAnalysis extends WorkflowEntrypoint {
  async run(event: WorkflowStep, env: any, ctx: ExecutionContext): Promise<ScheduledAnalysisOutput> {
    const input: ScheduledAnalysisInput = event.payload;
    
    const results: ScheduledAnalysisOutput = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
    };
    
    // Process each symbol in parallel (with reasonable concurrency)
    const batchSize = 5;
    for (let i = 0; i < input.symbols.length; i += batchSize) {
      const batch = input.symbols.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (symbol) => {
        try {
          // Trigger the stock analysis pipeline
          const pipeline = new StockAnalysisPipeline();
          const pipelineResult = await pipeline.run(
            {
              payload: {
                symbol,
                finnhubKey: input.finnhubKey,
                alphaVantageKey: input.alphaVantageKey,
                aiBinding: input.aiBinding,
              },
            } as WorkflowStep,
            env,
            ctx
          );
          
          if (pipelineResult.success && pipelineResult.result) {
            // Store in AnalysisCache Durable Object
            const id = input.analysisCacheBinding.idFromName("global");
            const stub = input.analysisCacheBinding.get(id);
            
            await stub.fetch("http://internal/cache", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                symbol,
                result: pipelineResult.result,
              }),
            });
            
            results.processed++;
          } else {
            results.failed++;
            results.errors?.push(`${symbol}: ${pipelineResult.error || "Unknown error"}`);
          }
        } catch (error: any) {
          results.failed++;
          results.errors?.push(`${symbol}: ${error.message || "Unknown error"}`);
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    return results;
  }
}

/**
 * Default list of popular stocks to pre-calculate
 */
export const POPULAR_STOCKS = [
  "SPY", "QQQ", "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA",
  "NFLX", "AMD", "INTC", "CRM", "ORCL", "ADBE", "PYPL", "UBER", "LYFT",
  "SHOP", "SQ", "COIN",
];

