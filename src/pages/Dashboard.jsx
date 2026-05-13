// Dashboard.jsx - Fixed WebSocket implementation
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import FriendsList from "../components/FriendsList";
import FriendRequests from "../components/FriendRequests";
import ChatWindow from "../components/ChatWindow";
import {
  BsWhatsapp,
  BsPeople,
  BsPersonAdd,
  BsThreeDotsVertical,
} from "react-icons/bs";
import toast from "react-hot-toast";

function Dashboard() {
  const { user, logout } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [activeTab, setActiveTab] = useState("friends");
  const [showSidebar, setShowSidebar] = useState(true);
  const [ws, setWs] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [friendsRefreshKey, setFriendsRefreshKey] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // ✅ ADD THIS INSTEAD
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // Initialize WebSocket with better handling
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let isClosedByCleanup = false;

    const connectWebSocket = () => {
      if (isClosedByCleanup) return;

      const websocket = new WebSocket("ws://localhost:5000");
      wsRef.current = websocket;

      websocket.onopen = () => {
        console.log("✅ WebSocket connected");
        // Authenticate
        websocket.send(
          JSON.stringify({
            type: "auth",
            token,
          }),
        );
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 WebSocket message:", data.type, data);

          switch (data.type) {
            case "auth_success":
              console.log("✅ WebSocket authenticated");
              break;

            case "friend_request_received":
              setNotificationCount((prev) => prev + 1);
              toast.info("New friend request received!");
              break;

            case "friend_request_accepted":
              toast.success("Friend request accepted!");
              setFriendsRefreshKey((prev) => prev + 1);
              setActiveTab("friends");
              break;

            case "new_message":
            case "receive_message":
              // Handle incoming messages
              if (data.chatId && data.message) {
                // Update the selected chat if it's the current one
                if (
                  selectedChat &&
                  String(selectedChat.id || selectedChat._id) ===
                    String(data.chatId)
                ) {
                  // The ChatWindow component will handle this via its own WebSocket listener
                  // We just need to trigger a refresh of friends list to update last message
                  setFriendsRefreshKey((prev) => prev + 1);
                } else {
                  // Notify about new message in another chat
                  toast.success(
                    `New message from ${data.message.senderName || "Someone"}`,
                  );
                  setFriendsRefreshKey((prev) => prev + 1);
                }
              }
              break;

            case "message_sent":
              console.log("✅ Message sent confirmation:", data);
              break;

            case "user_typing":
              // Typing indicator handled by ChatWindow
              break;

            case "friend_status_change":
              setOnlineUsers((prev) => {
                const newSet = new Set(prev);
                if (data.isOnline) {
                  newSet.add(data.userId);
                } else {
                  newSet.delete(data.userId);
                }
                return newSet;
              });
              break;

            // In Dashboard.jsx WebSocket message handler, add this case:
            case "chat_cleared":
              console.log("Chat cleared by other user:", data);
              // Refresh friends list to update last message
              setFriendsRefreshKey((prev) => prev + 1);
              break;

            default:
              console.log("Unhandled message type:", data.type);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      websocket.onclose = () => {
        console.log("WebSocket disconnected");
        if (!isClosedByCleanup && reconnectTimeoutRef.current === null) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, 3000);
        }
      };

      setWs(websocket);
    };

    connectWebSocket();

    return () => {
      isClosedByCleanup = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowSidebar(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sendMessage = async (chatId, message, extraData = {}) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({ message, ...extraData }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send message");
      }

      return await response.json();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      return null;
    }
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    setShowSidebar(true);
  };

  return (
    <div className="h-screen flex bg-[#efeae2]">
      {/* Sidebar */}
      <div
        className={`${showSidebar ? "w-full md:w-96" : "hidden md:block md:w-96"} bg-[#f0f2f5] border-r border-gray-200 flex flex-col`}
      >
        {/* User Info Header */}
        <div className="bg-[#f0f2f5] p-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <img
              src={user?.avatar || "https://via.placeholder.com/40"}
              alt={user?.username}
              className="w-10 h-10 rounded-full object-cover"
            />
            <h2 className="font-semibold text-gray-800">{user?.username}</h2>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="text-gray-600 hover:text-gray-800"
            >
              <BsThreeDotsVertical size={20} />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex-1 py-3 text-center transition-colors ${
              activeTab === "friends"
                ? "text-green-600 border-b-2 border-green-600 font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <BsPeople className="inline mr-2" />
            Chats
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 py-3 text-center transition-colors relative ${
              activeTab === "requests"
                ? "text-green-600 border-b-2 border-green-600 font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <BsPersonAdd className="inline mr-2" />
            Requests
            {notificationCount > 0 && (
              <span className="absolute top-1 right-8 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px]">
                {notificationCount}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "friends" ? (
            <FriendsList
              onSelectChat={handleSelectChat}
              selectedChatId={selectedChat?._id || selectedChat?.id}
              currentUser={user}
              refreshKey={friendsRefreshKey}
            />
          ) : (
            <FriendRequests
              onRequestAction={() => {
                setNotificationCount(0);
                setActiveTab("friends");
                setFriendsRefreshKey((prev) => prev + 1);
              }}
              currentUser={user}
            />
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedChat ? (
        // In Dashboard.jsx - This is already there
        <ChatWindow
          chat={selectedChat}
          currentUser={user}
          onSendMessage={sendMessage}
          ws={ws}
          onBack={handleBackToList}
          onChatCleared={() => setFriendsRefreshKey((prev) => prev + 1)} // ✅ Already there
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#efeae2]">
          <div className="text-center">
            <BsWhatsapp className="text-6xl text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Echo Chamber
            </h2>
            <p className="text-gray-500">
              {activeTab === "friends"
                ? "Select a chat to start messaging"
                : "Accept friend requests to start chatting"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
