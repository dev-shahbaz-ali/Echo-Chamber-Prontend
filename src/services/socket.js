// src/services/socket.js - Production-safe version
class WebSocketService {
  constructor() {
    this.ws = null;
    this.messageHandlers = new Map();
  }

  connect(token) {
    // Check if we're in production (Vercel)
    const isProduction =
      import.meta.env.PROD || window.location.hostname.includes("vercel.app");

    if (isProduction) {
      console.log(
        "ℹ️ WebSockets disabled on Vercel. Using REST API polling instead.",
      );
      return null;
    }

    // Only try WebSocket connection in development
    if (!window.location.hostname.includes("localhost")) {
      console.log("ℹ️ WebSockets only available in local development");
      return null;
    }

    try {
      const wsUrl = "ws://localhost:5000";
      console.log("🔌 Connecting to WebSocket:", wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("✅ WebSocket connected");
        if (token) {
          this.ws.send(JSON.stringify({ type: "auth", token }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const handlers = this.messageHandlers.get(data.type) || [];
          handlers.forEach((handler) => handler(data));
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
    }
  }

  disconnect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  sendMessage(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  }

  on(eventType, handler) {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, []);
    }
    this.messageHandlers.get(eventType).push(handler);
  }

  off(eventType, handler) {
    if (!this.messageHandlers.has(eventType)) return;
    const handlers = this.messageHandlers.get(eventType);
    const index = handlers.indexOf(handler);
    if (index !== -1) handlers.splice(index, 1);
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

const socketService = new WebSocketService();
export default socketService;
