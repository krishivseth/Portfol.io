/**
 * Fetch stock price data from Finnhub API
 */
export async function fetchStockQuote(symbol: string, apiKey: string): Promise<number | null> {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.c || null; // c = current price
  } catch (error) {
    console.error(`Error fetching stock quote for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch historical stock data from AlphaVantage API
 */
export async function fetchStockHistory(
  symbol: string,
  apiKey: string,
  period: number = 100
): Promise<number[]> {
  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=compact&apikey=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`AlphaVantage API error: ${response.status}`);
    }
    
    const data = await response.json();
    const timeSeries = data["Time Series (Daily)"];
    
    if (!timeSeries) {
      throw new Error("No time series data in response");
    }
    
    // Extract closing prices, sorted by date (oldest first)
    const prices: number[] = [];
    const dates = Object.keys(timeSeries).sort();
    
    for (const date of dates.slice(-period)) {
      const closePrice = parseFloat(timeSeries[date]["4. close"]);
      if (!isNaN(closePrice)) {
        prices.push(closePrice);
      }
    }
    
    return prices;
  } catch (error) {
    console.error(`Error fetching stock history for ${symbol}:`, error);
    return [];
  }
}

/**
 * Fetch both current price and historical data
 */
export async function fetchStockData(
  symbol: string,
  finnhubKey: string,
  alphaVantageKey: string,
  period: number = 100
): Promise<{ currentPrice: number; historicalPrices: number[] } | null> {
  const [currentPrice, historicalPrices] = await Promise.all([
    fetchStockQuote(symbol, finnhubKey),
    fetchStockHistory(symbol, alphaVantageKey, period),
  ]);
  
  if (currentPrice === null || historicalPrices.length === 0) {
    return null;
  }
  
  return {
    currentPrice,
    historicalPrices,
  };
}

