import { UserPortfolio } from "../types";

export class PortfolioState {
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
      const userId = url.searchParams.get("userId");
      if (!userId) return new Response("userId required", { status: 400 });
      const portfolio = await this.getPortfolio(userId);
      return new Response(JSON.stringify(portfolio), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/update" && request.method === "POST") {
      const { userId, portfolio } = await request.json() as { userId: string; portfolio: UserPortfolio };
      await this.updatePortfolio(userId, portfolio);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/buy" && request.method === "POST") {
      const { userId, stockSymbol, quantity, pricePerShare } = await request.json() as { userId: string; stockSymbol: string; quantity: number; pricePerShare: number };
      const result = await this.buyStock(userId, stockSymbol, quantity, pricePerShare);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/sell" && request.method === "POST") {
      const { userId, stockSymbol, quantity, pricePerShare } = await request.json() as { userId: string; stockSymbol: string; quantity: number; pricePerShare: number };
      const result = await this.sellStock(userId, stockSymbol, quantity, pricePerShare);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/all" && request.method === "GET") {
      const portfolios = await this.getAllPortfolios();
      return new Response(JSON.stringify(portfolios), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  }

  async getPortfolio(userId: string): Promise<UserPortfolio | null> {
    const key = `portfolio:${userId}`;
    const portfolio = await this.state.storage.get<UserPortfolio>(key);
    return portfolio || null;
  }

  async updatePortfolio(userId: string, portfolio: UserPortfolio): Promise<void> {
    const key = `portfolio:${userId}`;
    await this.state.storage.put(key, portfolio);
  }

  async getBalance(userId: string): Promise<number | null> {
    const portfolio = await this.getPortfolio(userId);
    return portfolio?.bank_bal ?? null;
  }

  async buyStock(
    userId: string,
    stockSymbol: string,
    quantity: number,
    pricePerShare: number
  ): Promise<{ success: boolean; error?: string; newBalance?: number }> {
    const portfolio = await this.getPortfolio(userId);
    if (!portfolio) {
      return { success: false, error: "User not found" };
    }

    const totalCost = pricePerShare * quantity;
    if (portfolio.bank_bal < totalCost) {
      return { success: false, error: "Insufficient balance" };
    }

    portfolio.bank_bal -= totalCost;
    portfolio.portfolio[stockSymbol] = (portfolio.portfolio[stockSymbol] || 0) + quantity;

    await this.updatePortfolio(userId, portfolio);
    return { success: true, newBalance: portfolio.bank_bal };
  }

  async sellStock(
    userId: string,
    stockSymbol: string,
    quantity: number,
    pricePerShare: number
  ): Promise<{ success: boolean; error?: string; newBalance?: number }> {
    const portfolio = await this.getPortfolio(userId);
    if (!portfolio) {
      return { success: false, error: "User not found" };
    }

    const currentQuantity = portfolio.portfolio[stockSymbol] || 0;
    if (currentQuantity < quantity) {
      return { success: false, error: "Not enough stock to sell" };
    }

    const totalGain = pricePerShare * quantity;
    portfolio.bank_bal += totalGain;
    portfolio.portfolio[stockSymbol] = currentQuantity - quantity;

    if (portfolio.portfolio[stockSymbol] === 0) {
      delete portfolio.portfolio[stockSymbol];
    }

    await this.updatePortfolio(userId, portfolio);
    return { success: true, newBalance: portfolio.bank_bal };
  }

  async getAllPortfolios(): Promise<UserPortfolio[]> {
    const keys = await this.state.storage.list({ prefix: "portfolio:" });
    const portfolios: UserPortfolio[] = [];
    
    for (const [key, value] of keys.entries()) {
      portfolios.push(value as UserPortfolio);
    }
    
    return portfolios;
  }
}

