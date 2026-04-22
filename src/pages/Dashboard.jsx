import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import FriendsList from "../components/FriendsList";
import FriendRequests from "../components/FriendRequests";
import ChatWindow from "../components/ChatWindow";
import { BsWhatsapp, BsPeople, BsPersonAdd, BsBell } from "react-icons/bs";

function Dashboard() {
  const { user, logout } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [activeTab, setActiveTab] = useState("friends");
  const [showSidebar, setShowSidebar] = useState(true);
  const [ws, setWs] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // Initialize WebSocket
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const websocket = new WebSocket("ws://localhost:5000");

    websocket.onopen = () => {
      websocket.send(
        JSON.stringify({
          type: "auth",
          token: token,
        }),
      );
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "friend_request_received") {
        setNotificationCount((prev) => prev + 1);
      }

      if (data.type === "friend_request_accepted") {
        window.location.reload();
      }

      if (data.type === "friend_status_change") {
        // Update friend status in UI
        console.log("Friend status changed:", data);
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const handleRequestAction = () => {
    setNotificationCount(0);
    setActiveTab("friends");
  };

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

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
    return null;
  };

  const handleTyping = (chatId, isTyping) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "typing",
          chatId,
          isTyping,
        }),
      );
    }
  };

  return (
    <div className="h-screen flex bg-gray-900">
      {/* Sidebar */}
      <div
        className={`${showSidebar ? "w-full md:w-96" : "hidden md:block md:w-96"} bg-gray-800 border-r border-gray-700 flex flex-col`}
      >
        {/* User Info */}
        <div className="bg-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={user?.avatar}
              alt={user?.username}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h2 className="font-semibold text-white">{user?.username}</h2>
              <p className="text-xs text-gray-400">{user?.status}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex-1 py-3 text-center transition-colors ${
              activeTab === "friends"
                ? "text-green-500 border-b-2 border-green-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <BsPeople className="inline mr-2" />
            Friends
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 py-3 text-center transition-colors relative ${
              activeTab === "requests"
                ? "text-green-500 border-b-2 border-green-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <BsPersonAdd className="inline mr-2" />
            Requests
            {notificationCount > 0 && (
              <span className="absolute top-1 right-4 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {notificationCount}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "friends" ? (
            <FriendsList
              onSelectChat={(chat) => {
                setSelectedChat(chat);
                if (window.innerWidth < 768) {
                  setShowSidebar(false);
                }
              }}
              selectedChatId={selectedChat?._id}
              currentUser={user}
            />
          ) : (
            <FriendRequests
              onRequestAction={handleRequestAction}
              currentUser={user}
            />
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <button
              onClick={() => setShowSidebar(true)}
              className="md:hidden absolute top-4 left-4 z-10 bg-gray-800 p-2 rounded-lg text-white"
            >
              ←
            </button>
            <ChatWindow
              chat={selectedChat}
              currentUser={user}
              onSendMessage={sendMessage}
              onTyping={handleTyping}
              ws={ws}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <BsWhatsapp className="text-6xl text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">
                WhatsApp Clone
              </h2>
              <p className="text-gray-400">
                {activeTab === "friends"
                  ? "Select a friend to start chatting"
                  : "Accept friend requests to start chatting"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
