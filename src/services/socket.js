// src/services/socket.js
class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.messageHandlers = new Map();
    this.isConnecting = false;
  }

  connect(token) {
    if (this.isConnecting) {
      console.log("WebSocket already connecting...");
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }

    this.isConnecting = true;

    // Get WebSocket URL - FIXED for production
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

    // Parse the URL correctly
    let wsUrl;
    if (apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1")) {
      // Local development
      wsUrl = "ws://localhost:5000";
    } else {
      // Production - Vercel doesn't support WebSockets, so we'll use polling instead
      console.warn(
        "⚠️ WebSockets not supported on Vercel. Using REST API polling.",
      );
      this.isConnecting = false;
      return null;
    }

    console.log("🔌 Connecting to WebSocket:", wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("✅ WebSocket connected");
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        this.ws.send(
          JSON.stringify({
            type: "auth",
            token: token,
          }),
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 WebSocket message:", data.type);

          if (data.type === "auth_success") {
            console.log("✅ WebSocket authenticated");
          }

          if (data.type === "auth_error") {
            console.error("❌ WebSocket auth error:", data.message);
          }

          const handlers = this.messageHandlers.get(data.type) || [];
          handlers.forEach((handler) => handler(data));
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log("🔌 WebSocket disconnected");
        this.isConnecting = false;
        if (!this.isLocalDevelopment()) {
          this.attemptReconnect(token);
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      this.isConnecting = false;
    }
  }

  isLocalDevelopment() {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    return apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1");
  }

  attemptReconnect(token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting in ${this.reconnectDelay}ms...`);

    setTimeout(() => {
      this.connect(token);
    }, this.reconnectDelay);
  }

  disconnect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this.messageHandlers.clear();
  }

  sendMessage(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, message not sent via WS");
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
