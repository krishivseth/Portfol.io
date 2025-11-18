import { TechnicalAnalysis } from "../types";

/**
 * Calculate Fibonacci retracement levels
 */
export function calculateFibonacciRetracement(
  high: number,
  low: number,
  prices: number[]
): { level23_6: number; level38_2: number; level50: number; level61_8: number; level78_6: number } {
  const diff = high - low;
  
  return {
    level23_6: high - diff * 0.236,
    level38_2: high - diff * 0.382,
    level50: high - diff * 0.5,
    level61_8: high - diff * 0.618,
    level78_6: high - diff * 0.786,
  };
}

/**
 * Calculate linear regression
 */
export function linearRegression(
  prices: number[],
  period: number = prices.length
): { slope: number; intercept: number; rSquared: number } {
  const data = prices.slice(-period);
  const n = data.length;
  
  if (n < 2) {
    return { slope: 0, intercept: data[0] || 0, rSquared: 0 };
  }
  
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumXX += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared
  const yMean = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssRes += Math.pow(data[i] - predicted, 2);
    ssTot += Math.pow(data[i] - yMean, 2);
  }
  
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  
  return { slope, intercept, rSquared };
}

/**
 * Calculate polynomial regression
 */
export function polynomialRegression(
  prices: number[],
  degree: number = 2,
  period: number = prices.length
): { coefficients: number[]; rSquared: number } {
  const data = prices.slice(-period);
  const n = data.length;
  
  if (n < degree + 1) {
    return { coefficients: [data[0] || 0], rSquared: 0 };
  }
  
  // Simple implementation for degree 2 (quadratic)
  // For higher degrees, would need matrix operations
  if (degree === 2) {
    let sumX = 0, sumY = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0, sumXY = 0, sumX2Y = 0;
    
    for (let i = 0; i < n; i++) {
      const x = i;
      const y = data[i];
      const x2 = x * x;
      const x3 = x2 * x;
      const x4 = x3 * x;
      
      sumX += x;
      sumY += y;
      sumX2 += x2;
      sumX3 += x3;
      sumX4 += x4;
      sumXY += x * y;
      sumX2Y += x2 * y;
    }
    
    // Solve system of equations for quadratic: y = ax^2 + bx + c
    // Using simplified approach (for production, use proper matrix solver)
    const a = (n * sumX2Y - sumX2 * sumY - sumX * sumXY + sumX * sumX2 * sumY / n) / 
              (n * sumX4 - sumX2 * sumX2 - sumX * sumX3 + sumX * sumX * sumX2 / n);
    const b = (sumXY - a * sumX3 - sumX * sumY / n + a * sumX * sumX2 / n) / 
              (sumX2 - sumX * sumX / n);
    const c = (sumY - a * sumX2 - b * sumX) / n;
    
    const coefficients = [c, b, a]; // [constant, linear, quadratic]
    
    // Calculate R-squared
    const yMean = sumY / n;
    let ssRes = 0;
    let ssTot = 0;
    
    for (let i = 0; i < n; i++) {
      const predicted = a * i * i + b * i + c;
      ssRes += Math.pow(data[i] - predicted, 2);
      ssTot += Math.pow(data[i] - yMean, 2);
    }
    
    const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    
    return { coefficients, rSquared };
  }
  
  // Fallback to linear for other degrees
  const linear = linearRegression(data, n);
  return { coefficients: [linear.intercept, linear.slope], rSquared: linear.rSquared };
}

/**
 * Detect potential reversal points
 */
export function detectReversalPoints(
  prices: number[],
  threshold: number = 0.02
): Array<{ index: number; price: number; type: "support" | "resistance"; strength: number }> {
  const reversals: Array<{ index: number; price: number; type: "support" | "resistance"; strength: number }> = [];
  
  if (prices.length < 5) return reversals;
  
  for (let i = 2; i < prices.length - 2; i++) {
    const current = prices[i];
    const prev1 = prices[i - 1];
    const prev2 = prices[i - 2];
    const next1 = prices[i + 1];
    const next2 = prices[i + 2];
    
    // Support: local minimum
    if (current < prev1 && current < prev2 && current < next1 && current < next2) {
      const avgSurrounding = (prev1 + prev2 + next1 + next2) / 4;
      const strength = Math.abs((avgSurrounding - current) / current);
      
      if (strength >= threshold) {
        reversals.push({
          index: i,
          price: current,
          type: "support",
          strength: Math.min(strength, 1),
        });
      }
    }
    
    // Resistance: local maximum
    if (current > prev1 && current > prev2 && current > next1 && current > next2) {
      const avgSurrounding = (prev1 + prev2 + next1 + next2) / 4;
      const strength = Math.abs((current - avgSurrounding) / current);
      
      if (strength >= threshold) {
        reversals.push({
          index: i,
          price: current,
          type: "resistance",
          strength: Math.min(strength, 1),
        });
      }
    }
  }
  
  return reversals;
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50; // Neutral RSI if not enough data
  }
  
  const data = prices.slice(-period - 1);
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  return rsi;
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) {
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }
  
  const data = prices.slice(-period);
  return data.reduce((a, b) => a + b, 0) / period;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length < period) {
    return calculateSMA(prices, prices.length);
  }
  
  const multiplier = 2 / (period + 1);
  const data = prices.slice(-period);
  
  let ema = calculateSMA(data.slice(0, period), period);
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

/**
 * Calculate multiple moving averages
 */
export function calculateMovingAverages(prices: number[]): {
  sma20: number;
  sma50: number;
  ema20: number;
  ema50: number;
} {
  return {
    sma20: calculateSMA(prices, 20),
    sma50: calculateSMA(prices, 50),
    ema20: calculateEMA(prices, 20),
    ema50: calculateEMA(prices, 50),
  };
}

/**
 * Perform complete technical analysis on price data
 */
export function performTechnicalAnalysis(
  symbol: string,
  prices: number[],
  currentPrice: number
): TechnicalAnalysis {
  if (prices.length === 0) {
    throw new Error("No price data provided");
  }
  
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  
  const fibonacci = calculateFibonacciRetracement(high, low, prices);
  const linearReg = linearRegression(prices);
  const polyReg = polynomialRegression(prices, 2);
  const reversalPoints = detectReversalPoints(prices);
  const rsi = calculateRSI(prices);
  const movingAverages = calculateMovingAverages(prices);
  
  return {
    symbol,
    timestamp: Date.now(),
    currentPrice,
    fibonacci,
    regression: {
      linear: linearReg,
      polynomial: polyReg,
    },
    reversalPoints,
    rsi,
    movingAverages,
  };
}

