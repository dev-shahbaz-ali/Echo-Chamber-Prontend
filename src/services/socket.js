// src/services/socket.js
import toast from "react-hot-toast";

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

    // Get WebSocket URL (replace http with ws, https with wss)
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const baseUrl = apiUrl
      .replace("/api", "")
      .replace("http://", "ws://")
      .replace("https://", "wss://");
    const wsUrl = `${baseUrl}`;

    console.log("🔌 Connecting to WebSocket:", wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("✅ WebSocket connected");
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Send authentication
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
          console.log("📨 WebSocket message received:", data.type);

          // Handle auth success
          if (data.type === "auth_success") {
            console.log("✅ WebSocket authenticated");
            toast.success("Connected to chat server");
          }

          // Handle auth error
          if (data.type === "auth_error") {
            console.error("❌ WebSocket auth error:", data.message);
            toast.error("Connection error. Please refresh the page.");
          }

          // Call registered handlers
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
        this.attemptReconnect(token);
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      this.isConnecting = false;
      this.attemptReconnect(token);
    }
  }

  attemptReconnect(token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

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
      console.error("WebSocket is not connected");
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

// Singleton instance
const socketService = new WebSocketService();
export default socketService;
    