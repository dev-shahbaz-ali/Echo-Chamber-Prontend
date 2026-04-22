import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
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
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const pendingPrependRef = useRef(false);
  const previousScrollHeightRef = useRef(0);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const currentUserId = currentUser?._id || currentUser?.id;
  const otherUser =
    chat?.otherParticipant ||
    chat?.participants?.find((p) => (p._id || p.id) !== currentUserId);

  const upsertMessage = useCallback((incomingMessage) => {
    if (!incomingMessage) return;

    setMessages((prev) => {
      const incomingId = incomingMessage._id || incomingMessage.id;
      const incomingSenderId =
        incomingMessage.senderId?._id ||
        incomingMessage.senderId ||
        incomingMessage.sender_id;
      const incomingChatId = incomingMessage.chatId;
      const incomingText = incomingMessage.message || "";
      const incomingType = incomingMessage.messageType || "text";
      const incomingVoiceUrl = incomingMessage.voiceUrl || "";
      const incomingVoiceDuration = incomingMessage.voiceDuration ?? null;
      const incomingCreatedAt = incomingMessage.createdAt
        ? new Date(incomingMessage.createdAt).getTime()
        : null;

      const existingIndex = prev.findIndex((msg) => {
        const msgId = msg._id || msg.id;
        if (msgId === incomingId) return true;

        const msgSenderId = msg.senderId?._id || msg.senderId || msg.sender_id;
        const msgChatId = msg.chatId;
        const msgText = msg.message || "";
        const msgType = msg.messageType || "text";
        const msgVoiceUrl = msg.voiceUrl || "";
        const msgVoiceDuration = msg.voiceDuration ?? null;
        const msgCreatedAt = msg.createdAt
          ? new Date(msg.createdAt).getTime()
          : null;

        const sameCoreData =
          msgSenderId === incomingSenderId &&
          msgChatId === incomingChatId &&
          msgText === incomingText &&
          msgType === incomingType &&
          msgVoiceUrl === incomingVoiceUrl &&
          msgVoiceDuration === incomingVoiceDuration;

        if (!sameCoreData) return false;

        if (!msgCreatedAt || !incomingCreatedAt) return true;

        return Math.abs(msgCreatedAt - incomingCreatedAt) < 5000;
      });

      if (existingIndex !== -1) {
        const next = [...prev];
        next[existingIndex] = incomingMessage;
        return next;
      }

      return [...prev, incomingMessage];
    });
  }, []);

  useEffect(() => {
    if (chat) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [chat, page]);

  useEffect(() => {
    if (ws) {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "receive_message" && data.chatId === chat?._id) {
          upsertMessage(data.message);
          markMessagesAsRead([data.message._id]);
        }

        if (data.type === "user_typing" && data.chatId === chat?._id) {
          setOtherUserTyping(data.isTyping);
          setTimeout(() => setOtherUserTyping(false), 3000);
        }

        if (data.type === "message_sent") {
          upsertMessage(data.message);
        }
      };
    }
  }, [ws, chat, upsertMessage]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  const isNearBottom = (element) => {
    if (!element) return true;

    const distance =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    return distance < 140;
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      if (page > 1 && messagesContainerRef.current) {
        previousScrollHeightRef.current =
          messagesContainerRef.current.scrollHeight;
        pendingPrependRef.current = true;
      }

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
        // For the initial load of messages, always scroll to the bottom.
        // This ensures the user sees the latest messages when opening a chat.
        shouldStickToBottomRef.current = true;
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

  useLayoutEffect(() => {
    if (!messagesContainerRef.current) return;

    if (pendingPrependRef.current) {
      const container = messagesContainerRef.current;
      const newScrollHeight = container.scrollHeight;
      container.scrollTop = newScrollHeight - previousScrollHeightRef.current;
      pendingPrependRef.current = false;
      return;
    }

    if (shouldStickToBottomRef.current) {
      scrollToBottom();
    }
  }, [messages]);

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

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const messageText = inputMessage;
    setInputMessage("");

    // Optimistically add message
    const tempMessage = {
      _id: Date.now(),
      message: messageText,
      senderId: currentUserId,
      receiverId: otherUser._id || otherUser.id,
      chatId: chat._id,
      createdAt: new Date().toISOString(),
      isRead: false,
      isDelivered: true,
      messageType: "text",
    };
    // Optimistically add the message to the UI
    setMessages((prev) => [...prev, tempMessage]);
    shouldStickToBottomRef.current = true;
    shouldStickToBottomRef.current = true; // User sent a message, always scroll to bottom

    const result = await onSendMessage(chat._id, messageText);
    if (result) {
      upsertMessage({
        ...result,
        _id: result._id || tempMessage._id,
      });
    }

    scrollToBottom();
  };

  const handleVoiceSend = async (voiceUrl, duration) => {
    shouldStickToBottomRef.current = true; // User sent a voice message, always scroll to bottom
    const result = await onSendMessage(chat._id, "", {
      messageType: "voice",
      voiceUrl,
      voiceDuration: duration,
    });

    if (result) {
      upsertMessage({
        ...result,
        messageType: "voice",
        voiceUrl,
        voiceDuration: duration,
      });
    }

    shouldStickToBottomRef.current = true;
    scrollToBottom();
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
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900"
        onScroll={(e) => {
          const container = e.currentTarget;
          shouldStickToBottomRef.current = isNearBottom(container);

          if (container.scrollTop <= 40 && hasMore && !loading) {
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
            msg.senderId === currentUserId ||
            msg.senderId?._id === currentUserId ||
            msg.sender_id === currentUserId;

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
