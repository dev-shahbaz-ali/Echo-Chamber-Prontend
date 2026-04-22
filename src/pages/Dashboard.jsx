import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  BsWhatsapp,
  BsSearch,
  BsChat,
  BsArrowLeft,
  BsSend,
  BsThreeDotsVertical,
} from "react-icons/bs";

function Dashboard() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // Fetch all users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          "x-auth-token": token,
        },
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

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

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const startChat = (selectedUser) => {
    setSelectedUser(selectedUser);
    fetchMessages(selectedUser._id);
  };

  const fetchMessages = async (otherUserId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/messages/${user.id}/${otherUserId}`,
        {
          headers: {
            "x-auth-token": token,
          },
        },
      );
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedUser) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({
          receiverId: selectedUser._id,
          message: inputMessage,
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages([...messages, newMessage]);
        setInputMessage("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen flex bg-gray-900">
      {/* Sidebar */}
      <div className="w-96 bg-gray-800 border-r border-gray-700 flex flex-col">
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
            <BsThreeDotsVertical size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3">
          <div className="relative">
            <BsSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : searchResults.length > 0 ? (
            searchResults.map((user) => (
              <div
                key={user._id}
                onClick={() => startChat(user)}
                className={`flex items-center space-x-3 p-3 hover:bg-gray-700 cursor-pointer transition-colors ${
                  selectedUser?._id === user._id ? "bg-gray-700" : ""
                }`}
              >
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{user.username}</h3>
                  <p className="text-sm text-gray-400 truncate">
                    {user.status}
                  </p>
                </div>
              </div>
            ))
          ) : (
            users.map((user) => (
              <div
                key={user._id}
                onClick={() => startChat(user)}
                className={`flex items-center space-x-3 p-3 hover:bg-gray-700 cursor-pointer transition-colors ${
                  selectedUser?._id === user._id ? "bg-gray-700" : ""
                }`}
              >
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{user.username}</h3>
                  <p className="text-sm text-gray-400 truncate">
                    {user.status}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="bg-gray-800 p-4 flex items-center space-x-3 border-b border-gray-700">
              <button
                onClick={() => setSelectedUser(null)}
                className="md:hidden text-white"
              >
                <BsArrowLeft size={20} />
              </button>
              <img
                src={selectedUser.avatar}
                alt={selectedUser.username}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h3 className="font-semibold text-white">
                  {selectedUser.username}
                </h3>
                <p className="text-xs text-green-500">Online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-20">
                  <BsChat className="text-4xl mx-auto mb-2" />
                  <p>
                    No messages yet. Start chatting with {selectedUser.username}
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${
                      msg.sender_id === user?.id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                        msg.sender_id === user?.id
                          ? "bg-green-500 text-white rounded-tr-none"
                          : "bg-gray-700 text-white rounded-tl-none"
                      }`}
                    >
                      <p className="text-sm break-words">{msg.message}</p>
                      <div className="text-xs opacity-70 mt-1 text-right">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="bg-gray-800 p-4 border-t border-gray-700">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim()}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <BsSend size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <BsWhatsapp className="text-6xl text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">
                WhatsApp Clone
              </h2>
              <p className="text-gray-400">Select a user to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
