// src/frontend-realtime-client.js
import { io } from "socket.io-client";

class RealtimeClient {
  constructor(config = {}) {
    this.config = {
      url: config.url || "http://localhost:5000",
      ...config,
    };
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.currentUserId = null;
    this.activeChatRooms = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  async connect(token) {
    if (this.socket && this.socket.connected) {
      console.log("Socket already connected");
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log(`🔌 Connecting to Socket.io at ${this.config.url}`);

        this.socket = io(this.config.url, {
          auth: { token },
          transports: ["websocket", "polling"], // Fallback to polling if websocket fails
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          forceNew: true,
        });

        this.socket.on("connect", () => {
          console.log("✅ Socket.io client connected", this.socket.id);
          this.isConnected = true;
          this.reconnectAttempts = 0;

          if (this.currentUserId) {
            this.setupUser(this.currentUserId);
          }

          // Rejoin rooms after reconnect
          this.activeChatRooms.forEach((chatId) => {
            this.socket.emit("join_chat", chatId);
            console.log(`🏠 Re-joined chat room: ${chatId}`);
          });

          resolve();
        });

        this.socket.on("disconnect", (reason) => {
          console.log(`⚠️ Socket.io client disconnected: ${reason}`);
          this.isConnected = false;
        });

        this.socket.on("connect_error", (error) => {
          console.error("🔌 Connection error:", error.message);
          if (!this.isConnected) {
            reject(error);
          }
        });

        // Event handlers
        this.socket.on("connected", (data) => {
          console.log("📡 Server confirmed connection:", data);
          this.emit("connected", data);
        });

        this.socket.on("new_message", (data) => {
          console.log("📨 New message received:", data);
          this.emit("new_message", data);
        });

        this.socket.on("message_sent", (data) => {
          console.log("✅ Message sent confirmation:", data);
          this.emit("message_sent", data);
        });

        this.socket.on("display_typing", (data) => {
          this.emit("display_typing", data);
        });

        this.socket.on("hide_typing", (data) => {
          this.emit("hide_typing", data);
        });

        this.socket.on("message_read", (data) => {
          console.log("👁️ Message read receipt:", data);
          this.emit("message_read", data);
        });

        this.socket.on("error", (error) => {
          console.error("Socket error:", error);
          this.emit("error", error);
        });
      } catch (error) {
        console.error("Failed to connect socket:", error);
        reject(error);
      }
    });
  }

  setupUser(userId) {
    this.currentUserId = userId;
    if (this.socket && this.isConnected) {
      this.socket.emit("setup", userId);
      console.log(`👤 Emitted 'setup' for user: ${userId}`);
    }
  }

  joinChat(chatId) {
    if (this.socket && this.isConnected) {
      if (!this.activeChatRooms.has(chatId)) {
        this.socket.emit("join_chat", chatId);
        this.activeChatRooms.add(chatId);
        console.log(`🏠 Joined chat room: ${chatId}`);
      }
    } else {
      console.warn(`Cannot join chat ${chatId}: socket not connected`);
    }
  }

  leaveChat(chatId) {
    if (this.socket && this.isConnected && this.activeChatRooms.has(chatId)) {
      this.socket.emit("leave_chat", chatId);
      this.activeChatRooms.delete(chatId);
      console.log(`🚪 Left chat room: ${chatId}`);
    }
  }

  markMessagesAsRead(chatId, messageIds) {
    if (
      this.socket &&
      this.isConnected &&
      messageIds &&
      messageIds.length > 0
    ) {
      this.socket.emit("mark_as_read", { chatId, messageIds });
      console.log(
        `👁️ Marked ${messageIds.length} messages as read in chat ${chatId}`,
      );
    }
  }

  sendTypingStatus(chatId, isTyping) {
    if (this.socket && this.isConnected) {
      this.socket.emit(isTyping ? "typing" : "stop_typing", { chatId });
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    }
  }

  emit(event, data) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach((cb) => cb(data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.activeChatRooms.clear();
    console.log("🛑 Realtime client disconnected");
  }
}

export default RealtimeClient;
