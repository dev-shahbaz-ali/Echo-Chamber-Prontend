import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BsSend,
  BsEmojiSmile,
  BsThreeDotsVertical,
  BsMic,
} from "react-icons/bs";
import { format } from "date-fns";
import VoiceRecorder from "./VoiceRecorder";

function ChatWindow({ chat, currentUser, onSendMessage, onTyping, ws }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [playingVoice, setPlayingVoice] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const otherUser =
    chat?.otherParticipant ||
    chat?.participants?.find((p) => p._id !== currentUser?.id);

  useEffect(() => {
    if (chat) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [chat, page]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (ws) {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "receive_message" && data.chatId === chat?._id) {
          setMessages((prev) => [...prev, data.message]);
          markMessagesAsRead([data.message._id]);
        }

        if (data.type === "user_typing" && data.chatId === chat?._id) {
          setOtherUserTyping(data.isTyping);
          setTimeout(() => setOtherUserTyping(false), 3000);
        }

        if (data.type === "message_sent") {
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === data.message._id ? data.message : msg,
            ),
          );
        }
      };
    }
  }, [ws, chat]);

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
          headers: { "x-auth-token": token },
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

  const markMessagesAsRead = async (messageIds = null) => {
    const unreadMessages = messages.filter(
      (m) => m.receiverId === currentUser?.id && !m.isRead,
    );
    if (unreadMessages.length === 0) return;

    const ids = messageIds || unreadMessages.map((m) => m._id);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "mark_read",
          messageIds: ids,
          chatId: chat._id,
        }),
      );
    }

    setMessages((prev) =>
      prev.map((msg) =>
        ids.includes(msg._id) ? { ...msg, isRead: true } : msg,
      ),
    );
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
      messageType: "text",
    };
    setMessages((prev) => [...prev, tempMessage]);

    // Send via WebSocket for real-time
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "new_message",
          chatId: chat._id,
          message: messageText,
          messageType: "text",
        }),
      );
    }

    // Also save to database via REST API
    const result = await onSendMessage(chat._id, messageText);
    if (result) {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempMessage._id ? result : m)),
      );
    }
  };

  const handleVoiceSend = async (voiceUrl, duration) => {
    // Optimistically add voice message
    const tempMessage = {
      _id: Date.now(),
      message: "🎤 Voice message",
      senderId: currentUser.id,
      receiverId: otherUser._id,
      chatId: chat._id,
      createdAt: new Date(),
      isRead: false,
      isDelivered: true,
      messageType: "voice",
      voiceUrl: voiceUrl,
      voiceDuration: duration,
    };
    setMessages((prev) => [...prev, tempMessage]);

    // Send via WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "new_message",
          chatId: chat._id,
          message: "",
          messageType: "voice",
          voiceUrl: voiceUrl,
          voiceDuration: duration,
        }),
      );
    }
  };

  const handleTyping = (e) => {
    const value = e.target.value;
    setInputMessage(value);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "typing",
          chatId: chat._id,
          isTyping: value.length > 0,
        }),
      );
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "typing",
            chatId: chat._id,
            isTyping: false,
          }),
        );
      }
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const playVoiceMessage = (voiceUrl) => {
    if (playingVoice === voiceUrl) {
      audioRef.current?.pause();
      setPlayingVoice(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = voiceUrl;
        audioRef.current.play();
        setPlayingVoice(voiceUrl);
        audioRef.current.onended = () => setPlayingVoice(null);
      }
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
          <p className="text-gray-400">Choose a friend to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <audio ref={audioRef} className="hidden" />

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
                {msg.messageType === "voice" ? (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => playVoiceMessage(msg.voiceUrl)}
                      className="hover:opacity-80"
                    >
                      {playingVoice === msg.voiceUrl ? "⏸️" : "▶️"}
                    </button>
                    <div className="flex-1">
                      <div className="w-32 h-1 bg-gray-600 rounded-full">
                        <div className="w-full h-full bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <span className="text-xs">
                      {Math.floor(msg.voiceDuration / 60)}:
                      {(msg.voiceDuration % 60).toString().padStart(2, "0")}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm break-words">{msg.message}</p>
                )}

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

        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-700 px-4 py-2 rounded-2xl">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 p-4 border-t border-gray-700">
        <div className="flex space-x-3 items-center">
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

          <VoiceRecorder onVoiceSend={handleVoiceSend} disabled={!chat} />

          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BsSend size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;
