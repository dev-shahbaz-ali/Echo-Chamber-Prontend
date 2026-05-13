// src/services/socket.js - COMPLETELY EMPTY
// WebSocket is disabled for production on Vercel

const socketService = {
  connect: () => {
    console.log("ℹ️ WebSocket disabled on Vercel");
    return null;
  },
  disconnect: () => {},
  sendMessage: () => false,
  on: () => {},
  off: () => {},
  isConnected: () => false,
};

export default socketService;
