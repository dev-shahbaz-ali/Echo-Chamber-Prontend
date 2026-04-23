// ChatWindow.jsx - Complete rewrite
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BsSend,
  BsEmojiSmile,
  BsThreeDotsVertical,
  BsArrowLeft,
} from "react-icons/bs";
import { format } from "date-fns";

function ChatWindow({
  chat,
  currentUser,
  onSendMessage,
  onTyping,
  ws,
  onBack,
}) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const scrollPositionRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const currentUserId = currentUser?._id || currentUser?.id;
  const otherUser =
    chat?.otherParticipant ||
    chat?.participants?.find((p) => (p._id || p.id) !== currentUserId);

  // Check if user is near bottom
  const isNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 100;
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold
    );
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (!shouldAutoScrollRef.current) return;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        setLoading(true);

        // Store scroll position for older messages
        let oldScrollHeight = 0;
        if (append && messagesContainerRef.current) {
          oldScrollHeight = messagesContainerRef.current.scrollHeight;
        }

        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_URL}/chats/${chat._id}/messages?page=${pageNum}&limit=50`,
          { headers: { "x-auth-token": token } },
        );
        const data = await response.json();

        if (append) {
          setMessages((prev) => [...data.messages, ...prev]);

          // Restore scroll position after loading older messages
          setTimeout(() => {
            if (messagesContainerRef.current) {
              const newScrollHeight = messagesContainerRef.current.scrollHeight;
              messagesContainerRef.current.scrollTop =
                newScrollHeight - oldScrollHeight;
            }
          }, 0);
        } else {
          setMessages(data.messages);
          if (initialLoad) {
            setTimeout(() => scrollToBottom("auto"), 100);
            setInitialLoad(false);
          }
        }

        setHasMore(data.currentPage < data.totalPages);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    },
    [chat, initialLoad, scrollToBottom],
  );

  // Load older messages when scrolling up
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if user manually scrolled up
    shouldAutoScrollRef.current = isNearBottom();

    // Load more messages when scrolling to top
    if (container.scrollTop <= 50 && hasMore && !loading) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, loading, isNearBottom]);

  // Load more messages when page changes
  useEffect(() => {
    if (page > 1) {
      fetchMessages(page, true);
    }
  }, [page, fetchMessages]);

  // Initial load
  useEffect(() => {
    if (chat) {
      setInitialLoad(true);
      setMessages([]);
      setPage(1);
      setHasMore(true);
      shouldAutoScrollRef.current = true;
      fetchMessages(1, false);
      markMessagesAsRead();
    }
  }, [chat?._id]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "receive_message" && data.chatId === chat?._id) {
        // Check if message already exists
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === data.message._id);
          if (exists) return prev;

          const newMessages = [...prev, data.message];
          // Auto-scroll only if already at bottom
          if (shouldAutoScrollRef.current) {
            setTimeout(() => scrollToBottom(), 50);
          }
          return newMessages;
        });

        markMessagesAsRead([data.message._id]);
      }

      if (data.type === "user_typing" && data.chatId === chat?._id) {
        setOtherUserTyping(data.isTyping);
        setTimeout(() => setOtherUserTyping(false), 2000);
      }

      if (data.type === "message_sent") {
        setMessages((prev) => {
          const index = prev.findIndex(
            (m) =>
              m._id === data.message._id || m.tempId === data.message.tempId,
          );
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = data.message;
            return updated;
          }
          return [...prev, data.message];
        });
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws, chat, scrollToBottom]);

  // Mark messages as read
  const markMessagesAsRead = async (messageIds = null) => {
    const unreadMessages = messages.filter(
      (m) =>
        (m.receiverId?._id || m.receiverId || m.receiver_id) ===
          currentUserId && !m.isRead,
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

  // Send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const tempId = Date.now();
    const messageText = inputMessage;
    setInputMessage("");

    const tempMessage = {
      _id: tempId,
      tempId,
      message: messageText,
      senderId: currentUserId,
      receiverId: otherUser._id || otherUser.id,
      chatId: chat._id,
      createdAt: new Date().toISOString(),
      isRead: false,
      isDelivered: true,
      messageType: "text",
      status: "sending",
    };

    setMessages((prev) => [...prev, tempMessage]);
    shouldAutoScrollRef.current = true;
    scrollToBottom();

    const result = await onSendMessage(chat._id, messageText);

    if (result) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === tempId ? { ...result, status: "sent" } : msg,
        ),
      );
    }
  };

  // Handle typing indicator
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

  // Format time
  const formatTime = (date) => {
    return format(new Date(date), "hh:mm a");
  };

  if (!chat || !otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#efeae2]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            WhatsApp Web
          </h2>
          <p className="text-gray-500">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#efeae2]">
      {/* Chat Header */}
      <div className="bg-[#f0f2f5] px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="md:hidden text-gray-600">
            <BsArrowLeft size={20} />
          </button>
          <img
            src={otherUser.avatar}
            alt={otherUser.username}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h3 className="font-semibold text-gray-800">
              {otherUser.username}
            </h3>
            <p className="text-xs text-gray-500">
              {otherUserTyping ? (
                <span className="text-green-500">typing...</span>
              ) : otherUser.isOnline ? (
                <span className="text-green-500">online</span>
              ) : (
                "offline"
              )}
            </p>
          </div>
        </div>
        <button className="text-gray-600 hover:text-gray-800">
          <BsThreeDotsVertical size={20} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{
          backgroundImage:
            "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "340px",
        }}
      >
        {loading && page > 1 && (
          <div className="text-center py-2">
            <div className="inline-flex items-center space-x-2 text-gray-500 text-sm">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.4s" }}
              />
              <span>Loading older messages...</span>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn =
            msg.senderId === currentUserId ||
            msg.senderId?._id === currentUserId;
          const showAvatar =
            !isOwn &&
            (idx === 0 || messages[idx - 1]?.senderId !== msg.senderId);

          return (
            <div
              key={msg._id || msg.tempId}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div className="flex items-end space-x-2 max-w-[70%]">
                {!isOwn && showAvatar && (
                  <img
                    src={otherUser.avatar}
                    alt={otherUser.username}
                    className="w-8 h-8 rounded-full mb-1"
                  />
                )}
                {!isOwn && !showAvatar && <div className="w-8" />}

                <div
                  className={`relative px-3 py-2 rounded-lg ${
                    isOwn
                      ? "bg-[#dcf8c5] text-gray-800 rounded-tr-none"
                      : "bg-white text-gray-800 rounded-tl-none shadow-sm"
                  }`}
                >
                  <p className="text-sm break-words">{msg.message}</p>
                  <div className="flex justify-end items-center space-x-1 mt-1">
                    <span className="text-[10px] text-gray-500">
                      {formatTime(msg.createdAt)}
                    </span>
                    {isOwn && (
                      <span className="text-[10px]">
                        {msg.isRead ? (
                          <span className="text-blue-500">✓✓</span>
                        ) : msg.status === "sent" ? (
                          <span className="text-gray-500">✓✓</span>
                        ) : (
                          <span className="text-gray-400">✓</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg rounded-tl-none px-4 py-2 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f2f5] p-3 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <button className="text-gray-600 hover:text-gray-800">
            <BsEmojiSmile size={24} />
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={handleTyping}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && handleSendMessage()
            }
            placeholder="Type a message"
            className="flex-1 px-4 py-2 bg-white rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500"
          />

          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            className="text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BsSend size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;
