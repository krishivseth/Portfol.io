/**
 * Migration script to migrate JSON data to Durable Objects
 * Run this script to seed initial data from user_data.json and user_transaction.json
 */

import { UserPortfolio, Transaction } from "../src/types";

// This would typically be run via a Worker endpoint or CLI tool
// For now, it's a reference implementation

export async function migratePortfolioData(
  portfolios: UserPortfolio[],
  portfolioStateDO: DurableObjectNamespace
): Promise<void> {
  for (const portfolio of portfolios) {
    const id = portfolioStateDO.idFromName(portfolio.userid);
    const stub = portfolioStateDO.get(id);
    
    await stub.fetch("http://internal/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: portfolio.userid,
        portfolio,
      }),
    });
    
    console.log(`Migrated portfolio for user ${portfolio.userid}`);
  }
}

export async function migrateTransactionData(
  transactions: Transaction[],
  transactionLogDO: DurableObjectNamespace
): Promise<void> {
  const id = transactionLogDO.idFromName("global");
  const stub = transactionLogDO.get(id);
  
  for (const transaction of transactions) {
    await stub.fetch("http://internal/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });
    
    console.log(`Migrated transaction ${transaction.id}`);
  }
}

