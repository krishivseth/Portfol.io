import { Transaction } from "../types";

export class TransactionLog {
  private state: DurableObjectState;
  private env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/add" && request.method === "POST") {
      const transaction = await request.json();
      await this.addTransaction(transaction);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/get" && request.method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) return new Response("userId required", { status: 400 });
      const transactions = await this.getTransactions(userId);
      return new Response(JSON.stringify(transactions), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/generate-id" && request.method === "GET") {
      const id = await this.generateTransactionId();
      return new Response(JSON.stringify({ id }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  }
  async addTransaction(transaction: Transaction): Promise<void> {
    const key = `transaction:${transaction.id}`;
    await this.state.storage.put(key, transaction);
    
    // Also maintain a list of transaction IDs per user
    const userKey = `user_transactions:${transaction.userid}`;
    const existingIds = await this.state.storage.get<string[]>(userKey) || [];
    if (!existingIds.includes(transaction.id)) {
      existingIds.push(transaction.id);
      await this.state.storage.put(userKey, existingIds);
    }
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    const userKey = `user_transactions:${userId}`;
    const transactionIds = await this.state.storage.get<string[]>(userKey) || [];
    
    const transactions: Transaction[] = [];
    for (const id of transactionIds) {
      const key = `transaction:${id}`;
      const transaction = await this.state.storage.get<Transaction>(key);
      if (transaction) {
        transactions.push(transaction);
      }
    }
    
    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return transactions;
  }

  async getTransactionsByType(
    userId: string,
    type: "buy" | "sell"
  ): Promise<Transaction[]> {
    const allTransactions = await this.getTransactions(userId);
    return allTransactions.filter(tx => tx.type === type);
  }

  async getTransactionsByInitiator(
    userId: string,
    initiator: "agent" | "user"
  ): Promise<Transaction[]> {
    const allTransactions = await this.getTransactions(userId);
    return allTransactions.filter(tx => tx.initiator === initiator);
  }

  async generateTransactionId(): Promise<string> {
    const counterKey = "transaction_counter";
    let counter = await this.state.storage.get<number>(counterKey) || 0;
    counter++;
    await this.state.storage.put(counterKey, counter);
    return counter.toString();
  }
}

