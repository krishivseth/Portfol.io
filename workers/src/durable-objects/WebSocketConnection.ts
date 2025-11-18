import { ResponseResponse, ConfigResponse, PingPongResponse, ResponseRequiredRequest } from "../types";

interface BroadcastMessage {
  eventType: string;
  payload: any;
  channels?: string[];
}

export class WebSocketConnection {
  private state: DurableObjectState;
  private env: any;
  private connections: Set<WebSocket>;
  private channelSubscriptions: Map<WebSocket, Set<string>>;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    this.connections = new Set();
    this.channelSubscriptions = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/broadcast" && request.method === "POST") {
      const message = await request.json() as BroadcastMessage;
      const deliveries = this.broadcastStructuredEvent(message);
      return new Response(JSON.stringify({ success: true, deliveries }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.acceptWebSocket(server);
      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response("Not a WebSocket request", { status: 400 });
  }

  private acceptWebSocket(ws: WebSocket): void {
    ws.accept();
    this.connections.add(ws);
    this.channelSubscriptions.set(ws, new Set());
    
    ws.addEventListener("message", async (event) => {
      try {
        const raw = typeof event.data === "string" ? event.data : "";
        const data = raw ? JSON.parse(raw) : null;
        await this.handleMessage(ws, data);
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
        ws.close(1011, "Error processing message");
      }
    });

    ws.addEventListener("close", () => {
      this.connections.delete(ws);
      this.channelSubscriptions.delete(ws);
    });

    // Send initial config
    const config: ConfigResponse = {
      response_type: "config",
      config: {
        auto_reconnect: true,
        call_details: true,
      },
      response_id: 1,
    };
    this.safeSend(ws, JSON.stringify(config));
  }

  private async handleMessage(ws: WebSocket, data: any): Promise<void> {
    if (!data) {
      return;
    }

    if (data.type === "subscribe") {
      const channels = Array.isArray(data.channels)
        ? data.channels.map((channel: string) => channel.toLowerCase())
        : [];
      this.channelSubscriptions.set(ws, new Set(channels));
      this.safeSend(ws, JSON.stringify({
        type: "subscribed",
        channels: Array.from(this.channelSubscriptions.get(ws) ?? []),
        timestamp: Date.now(),
      }));
      return;
    }

    if (data.type === "ping") {
      this.safeSend(ws, JSON.stringify({
        type: "pong",
        timestamp: Date.now(),
      }));
      return;
    }

    if (data.interaction_type === "ping_pong") {
      const response: PingPongResponse = {
        response_type: "ping_pong",
        timestamp: data.timestamp,
      };
      this.broadcastRaw(JSON.stringify(response));
      return;
    }

    if (data.interaction_type === "call_details") {
      return;
    }

    if (data.interaction_type === "update_only") {
      return;
    }

    if (
      data.interaction_type === "response_required" ||
      data.interaction_type === "reminder_required"
    ) {
      const request: ResponseRequiredRequest = {
        interaction_type: data.interaction_type,
        response_id: data.response_id,
        transcript: data.transcript || [],
      };
      
      await this.processResponseRequest(request);
    }
  }

  private async processResponseRequest(request: ResponseRequiredRequest): Promise<void> {
    const response: ResponseResponse = {
      response_type: "response",
      response_id: request.response_id,
      content: "Processing your request...",
      content_complete: true,
      end_call: false,
    };
    this.sendResponse(response);
  }

  sendResponse(response: ResponseResponse): void {
    this.broadcastRaw(JSON.stringify(response));
  }

  private broadcastStructuredEvent(message: BroadcastMessage): number {
    const normalizedChannels = message.channels?.map((channel) => channel.toLowerCase());
    const payload = JSON.stringify({
      type: message.eventType,
      timestamp: Date.now(),
      channels: normalizedChannels,
      payload: message.payload,
    });

    let deliveries = 0;
    for (const socket of this.connections) {
      if (socket.readyState !== WebSocket.OPEN) {
        continue;
      }
      if (this.shouldDeliver(socket, normalizedChannels)) {
        socket.send(payload);
        deliveries++;
      }
    }
    return deliveries;
  }

  private shouldDeliver(ws: WebSocket, channels?: string[]): boolean {
    if (!channels || channels.length === 0) {
      return true;
    }
    const subscriptions = this.channelSubscriptions.get(ws);
    if (!subscriptions || subscriptions.size === 0) {
      return false;
    }
    return channels.some((channel) => subscriptions.has(channel));
  }

  private broadcastRaw(payload: string): void {
    for (const socket of this.connections) {
      this.safeSend(socket, payload);
    }
  }

  private safeSend(ws: WebSocket, payload: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }

  close(): void {
    for (const socket of this.connections) {
      socket.close();
    }
    this.connections.clear();
    this.channelSubscriptions.clear();
  }
}
