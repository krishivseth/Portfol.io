import { ConversationMessage } from "../types";

export class ConversationMemory {
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
      const { userId, role, content } = await request.json() as { userId: string; role: "agent" | "user" | "system"; content: string };
      await this.addMessage(userId, role, content);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/get" && request.method === "GET") {
      const userId = url.searchParams.get("userId");
      const limit = parseInt(url.searchParams.get("limit") || "50");
      if (!userId) return new Response("userId required", { status: 400 });
      const history = await this.getHistory(userId, limit);
      return new Response(JSON.stringify(history), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/context" && request.method === "GET") {
      const userId = url.searchParams.get("userId");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      if (!userId) return new Response("userId required", { status: 400 });
      const context = await this.getContextForLLM(userId, limit);
      return new Response(JSON.stringify(context), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/clear" && request.method === "POST") {
      const { userId } = await request.json() as { userId: string };
      await this.clearHistory(userId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  }
  async addMessage(
    userId: string,
    role: "agent" | "user" | "system",
    content: string
  ): Promise<void> {
    const key = `conversation:${userId}`;
    const messages = await this.state.storage.get<ConversationMessage[]>(key) || [];
    
    messages.push({
      role,
      content,
      timestamp: Date.now(),
    });
    
    // Keep only last 100 messages to prevent unbounded growth
    const trimmedMessages = messages.slice(-100);
    await this.state.storage.put(key, trimmedMessages);
  }

  async getHistory(
    userId: string,
    limit: number = 50
  ): Promise<ConversationMessage[]> {
    const key = `conversation:${userId}`;
    const messages = await this.state.storage.get<ConversationMessage[]>(key) || [];
    
    return messages.slice(-limit);
  }

  async clearHistory(userId: string): Promise<void> {
    const key = `conversation:${userId}`;
    await this.state.storage.delete(key);
  }

  async getContextForLLM(userId: string, limit: number = 20): Promise<Array<{ role: string; content: string }>> {
    const messages = await this.getHistory(userId, limit);
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }
}

