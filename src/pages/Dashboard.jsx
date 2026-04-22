import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import { BsWhatsapp, BsSearch, BsArrowLeft } from "react-icons/bs";

function Dashboard() {
  const { user, logout } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [ws, setWs] = useState(null);

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

      if (data.type === "new_message") {
        // Refresh chats to update last message
        fetchChats();

        // If the message is for current chat, add it to messages
        if (selectedChat && data.message.chatId === selectedChat._id) {
          // ChatWindow will handle this via props
        }
      }

      if (data.type === "typing") {
        // Handle typing indicator
        console.log("User typing:", data);
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  // Fetch all chats
  const fetchChats = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/chats`, {
        headers: {
          "x-auth-token": token,
        },
      });
      const data = await response.json();
      setChats(data);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Search users
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/users/search?q=${query}`, {
        headers: {
          "x-auth-token": token,
        },
      });
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  // Create or get chat with a user
  const createOrGetChat = async (otherUserId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({ otherUserId }),
      });

      const chat = await response.json();

      if (response.ok) {
        setSelectedChat(chat);
        fetchChats(); // Refresh chat list
        setSearchQuery("");
        setSearchResults([]);
        if (window.innerWidth < 768) {
          setShowSidebar(false);
        }
      }
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  // Send message
  const sendMessage = async (chatId, message) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({ message }),
      });

      const newMessage = await response.json();

      if (response.ok) {
        // Update chat list to show last message
        fetchChats();
        return newMessage;
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
    return null;
  };

  // Handle typing indicator
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

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
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

        {/* Search Bar */}
        <div className="p-3">
          <div className="relative">
            <BsSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users to start chat..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Search Results or Chat List */}
        {searchResults.length > 0 ? (
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-2 text-xs text-gray-400">
              SEARCH RESULTS
            </div>
            {searchResults.map((searchUser) => (
              <div
                key={searchUser._id}
                onClick={() => createOrGetChat(searchUser._id)}
                className="flex items-center space-x-3 p-3 hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <img
                  src={searchUser.avatar}
                  alt={searchUser.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-white">
                    {searchUser.username}
                  </h3>
                  <p className="text-sm text-gray-400 truncate">
                    {searchUser.status}
                  </p>
                </div>
                <button className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600">
                  Message
                </button>
              </div>
            ))}
          </div>
        ) : (
          <ChatList
            chats={chats}
            onSelectChat={(chat) => {
              setSelectedChat(chat);
              if (window.innerWidth < 768) {
                setShowSidebar(false);
              }
            }}
            selectedChatId={selectedChat?._id}
            currentUser={user}
          />
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <button
              onClick={() => setShowSidebar(true)}
              className="md:hidden absolute top-4 left-4 z-10 bg-gray-800 p-2 rounded-lg text-white"
            >
              <BsArrowLeft size={20} />
            </button>
            <ChatWindow
              chat={selectedChat}
              currentUser={user}
              onSendMessage={sendMessage}
              onTyping={handleTyping}
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
                Select a chat or search for users to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
