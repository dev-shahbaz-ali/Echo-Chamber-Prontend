import React, { useState, useEffect, useRef } from "react";
import { BsSend, BsEmojiSmile, BsThreeDotsVertical } from "react-icons/bs";
import { format } from "date-fns";

function ChatWindow({ chat, currentUser, onSendMessage, onTyping }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const otherUser =
    chat?.otherParticipant ||
    chat?.participants?.find((p) => p._id !== currentUser?.id);

  useEffect(() => {
    if (chat) {
      fetchMessages();
    }
  }, [chat, page]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/chats/${chat._id}/messages?page=${page}&limit=50`,
        {
          headers: {
            "x-auth-token": token,
          },
        },
      );
      const data = await response.json();

      if (page === 1) {
        setMessages(data.messages);
      } else {
        setMessages((prev) => [...data.messages, ...prev]);
      }
      setHasMore(data.currentPage < data.totalPages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const messageText = inputMessage;
    setInputMessage("");

    // Optimistically add message
    const tempMessage = {
      _id: Date.now(),
      message: messageText,
      senderId: currentUser.id,
      receiverId: otherUser._id,
      chatId: chat._id,
      createdAt: new Date(),
      isRead: false,
      isDelivered: true,
    };
    setMessages((prev) => [...prev, tempMessage]);

    // Send to server
    const result = await onSendMessage(chat._id, messageText);
    if (result) {
      // Replace temp message with real message
      setMessages((prev) =>
        prev.map((m) => (m._id === tempMessage._id ? result : m)),
      );
    }
  };

  const handleTyping = (e) => {
    const value = e.target.value;
    setInputMessage(value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    onTyping(chat._id, value.length > 0);

    typingTimeoutRef.current = setTimeout(() => {
      onTyping(chat._id, false);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const loadMoreMessages = () => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1);
    }
  };

  if (!chat || !otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-2">
            Select a chat
          </h2>
          <p className="text-gray-400">Choose a user to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <img
            src={otherUser.avatar}
            alt={otherUser.username}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h3 className="font-semibold text-white">{otherUser.username}</h3>
            <p className="text-xs text-green-500">
              {otherUser.isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-white">
          <BsThreeDotsVertical size={20} />
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900"
        onScroll={(e) => {
          if (e.target.scrollTop === 0) {
            loadMoreMessages();
          }
        }}
      >
        {loading && page > 1 && (
          <div className="text-center text-gray-400 py-2">
            Loading older messages...
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn =
            msg.senderId === currentUser.id ||
            msg.senderId?._id === currentUser.id;
          const senderName = isOwn
            ? "You"
            : msg.senderId?.username || otherUser.username;

          return (
            <div
              key={msg._id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                  isOwn
                    ? "bg-green-500 text-white rounded-tr-none"
                    : "bg-gray-700 text-white rounded-tl-none"
                }`}
              >
                <p className="text-sm break-words">{msg.message}</p>
                <div className="flex justify-between items-center mt-1 space-x-2">
                  <span className="text-xs opacity-70">
                    {format(new Date(msg.createdAt), "hh:mm a")}
                  </span>
                  {isOwn && (
                    <span className="text-xs opacity-70">
                      {msg.isRead ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 p-4 border-t border-gray-700">
        <div className="flex space-x-3">
          <button className="text-gray-400 hover:text-white">
            <BsEmojiSmile size={24} />
          </button>
          <input
            type="text"
            value={inputMessage}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BsSend size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;
