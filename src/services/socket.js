// src/services/socket.js - Completely disabled for production
class WebSocketService {
  constructor() {
    this.messageHandlers = new Map();
  }

  // No-op: does nothing
  connect() {
    console.log("ℹ️ WebSocket disabled - using REST API only");
    return null;
  }

  // No-op: does nothing
  disconnect() {}

  // No-op: returns false
  sendMessage() {
    return false;
  }

  // No-op: just stores handlers but never calls them
  on(eventType, handler) {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, []);
    }
    this.messageHandlers.get(eventType).push(handler);
  }

  // No-op: removes handler
  off(eventType, handler) {
    if (!this.messageHandlers.has(eventType)) return;
    const handlers = this.messageHandlers.get(eventType);
    const index = handlers.indexOf(handler);
    if (index !== -1) handlers.splice(index, 1);
  }

  // No-op: returns false
  isConnected() {
    return false;
  }
}

const socketService = new WebSocketService();
export default socketService;
