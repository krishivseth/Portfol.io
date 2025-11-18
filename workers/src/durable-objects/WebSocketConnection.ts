import { ResponseResponse, ConfigResponse, PingPongResponse, ResponseRequiredRequest } from "../types";

export class WebSocketConnection {
  private state: DurableObjectState;
  private env: any;
  private ws: WebSocket | null = null;
  private callId: string | null = null;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    // Handle WebSocket upgrade
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ws = server;
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
    
    ws.addEventListener("message", async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        await this.handleMessage(data);
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
        ws.close(1011, "Error processing message");
      }
    });

    ws.addEventListener("close", () => {
      this.ws = null;
      this.callId = null;
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
    this.send(JSON.stringify(config));
  }

  private async handleMessage(data: any): Promise<void> {
    if (data.interaction_type === "ping_pong") {
      const response: PingPongResponse = {
        response_type: "ping_pong",
        timestamp: data.timestamp,
      };
      this.send(JSON.stringify(response));
      return;
    }

    if (data.interaction_type === "call_details") {
      // Store call details if needed
      return;
    }

    if (data.interaction_type === "update_only") {
      // Just update transcript, no response needed
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
      
      // Process with LLM (this would be handled by the main worker)
      // For now, send a placeholder response
      await this.processResponseRequest(request);
    }
  }

  private async processResponseRequest(request: ResponseRequiredRequest): Promise<void> {
    // This method will be called by the main worker after processing with LLM
    // The actual LLM processing happens in the main worker
    // Placeholder response for now
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
    if (this.ws && this.ws.readyState === WebSocket.READY_STATE_OPEN) {
      this.send(JSON.stringify(response));
    }
  }

  private send(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.READY_STATE_OPEN) {
      this.ws.send(data);
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
