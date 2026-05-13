import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BsWhatsapp,
  BsSearch,
  BsThreeDotsVertical,
  BsSend,
  BsEmojiSmile,
  BsPaperclip,
  BsMic,
  BsArrowLeft,
} from "react-icons/bs";
import { formatDistanceToNow } from "date-fns";

function ChatInterface({ user, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // This useEffect is for messagesEndRef, not API_URL
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${user.id}`);
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }, [user.id]);

  const fetchMessages = useCallback(
    async (otherId) => {
      try {
        const response = await fetch(`/api/messages/${user.id}/${otherId}`);
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    },
    [user.id],
  );

  const searchUsers = useCallback(
    async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/search/${encodeURIComponent(query)}/${user.id}`,
        );
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error("Error searching users:", error);
      }
    },
    [user.id],
  );

  useEffect(() => {
    fetchConversations(); // Still fetch conversations on mount
  }, [fetchConversations]);

  const handleNewMessage = (message) => {
    const senderId = message.sender_id || message.senderId;
    if (
      String(senderId) === String(selectedChat?.id || selectedChat?._id) || // Check both id and _id
      String(message.receiver_id || message.receiverId) ===
        String(selectedChat?.id)
    ) {
      setMessages((prev) => [...prev, message]);
    }

    fetchConversations();

    if (
      selectedChat &&
      String(senderId) === String(selectedChat.id || selectedChat._id)
    ) {
      // Check both id and _id
      markAsRead([message.id || message._id]);
    }
  };

  const markAsRead = (messageIds) => {};

  const updateMessageStatus = (messageId, status) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, status } : msg)),
    );
  };

  const markMessagesAsRead = (messageIds) => {
    setMessages((prev) =>
      prev.map((msg) =>
        messageIds.includes(msg.id) ? { ...msg, is_read: true } : msg,
      ),
    );
  };

  const handleTyping = (isTypingNow) => {
    if (isTypingNow !== isTyping) {
      setIsTyping(isTypingNow);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (isTypingNow) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    }
  };

  const handleTypingIndicator = (data) => {
    if (data.senderId === selectedChat?.id) {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        if (data.isTyping) {
          newSet.add(data.senderId);
        } else {
          newSet.delete(data.senderId);
        }
        return newSet;
      });
    }
  };

  const handleUserStatus = (data) => {
    setOnlineUsers((prev) => {
      const newSet = new Set(prev);
      if (data.isOnline) {
        newSet.add(data.userId);
      } else {
        newSet.delete(data.userId);
      }
      return newSet;
    });
  };

  const startNewChat = (otherUser) => {
    setSelectedChat(otherUser);
    fetchMessages(otherUser.id);
    setSearchQuery("");
    setSearchResults([]);
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const selectChat = (conversation) => {
    const otherUser = {
      id: conversation.other_id,
      username: conversation.other_username,
      avatar: conversation.other_avatar,
      unread_count: conversation.unread_count,
    };

    setSelectedChat(otherUser);
    fetchMessages(otherUser.id);
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    }

    return date.toLocaleDateString();
  };

  const addEmoji = (emoji) => {
    setInputMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#efeae2] text-slate-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-55"
        style={{
          backgroundColor: "#efeae2",
          backgroundImage:
            "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "340px",
        }}
      />

      <div
        className={`${showSidebar ? "w-full md:w-96" : "hidden md:block md:w-96"} relative z-10 flex flex-col border-r border-black/5 bg-white/92 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl`}
      >
        <div className="flex items-center justify-between border-b border-black/5 bg-[#f0f2f5]/90 px-4 py-4">
          <div className="flex items-center space-x-3">
            <img
              src={user.avatar}
              alt={user.username}
              className="h-10 w-10 rounded-full"
            />
            <div>
              <h2 className="font-semibold text-slate-900">{user.username}</h2>
              <p className="text-xs text-slate-500">
                {user.status || "Hey there! I am using Echo Chamber."}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-slate-500 transition-colors hover:text-slate-900"
          >
            <BsThreeDotsVertical size={20} />
          </button>
        </div>

        <div className="border-b border-black/5 bg-white/75 px-3 py-3">
          <div className="relative">
            <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              className="w-full rounded-full border border-black/5 bg-[#f0f2f5] py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#25d366] focus:ring-2 focus:ring-[#25d366]/15"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {searchResults.length > 0 ? (
            <div>
              <div className="px-4 py-2 text-xs font-semibold tracking-[0.18em] text-slate-400">
                SEARCH RESULTS
              </div>
              {searchResults.map((searchUser) => (
                <div
                  key={searchUser.id}
                  onClick={() => startNewChat(searchUser)}
                  className="flex cursor-pointer items-center space-x-3 px-4 py-3 transition-colors hover:bg-emerald-50/80"
                >
                  <img
                    src={searchUser.avatar}
                    alt={searchUser.username}
                    className="h-12 w-12 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">
                      {searchUser.username}
                    </div>
                    <div className="text-sm text-slate-500">
                      {searchUser.phone}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectChat(conv)}
                className={`flex cursor-pointer items-center space-x-3 px-4 py-3 transition-colors hover:bg-emerald-50/80 ${
                  selectedChat?.id === conv.other_id ? "bg-emerald-50" : ""
                }`}
              >
                <div className="relative">
                  <img
                    src={conv.other_avatar}
                    alt={conv.other_username}
                    className="h-12 w-12 rounded-full"
                  />
                  {onlineUsers.has(conv.other_id) && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="truncate font-semibold text-slate-900">
                      {conv.other_username}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatTime(conv.last_message_time)}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex-1 truncate text-sm text-slate-500">
                      {conv.last_message || "No messages yet"}
                    </div>
                    {conv.unread_count > 0 && (
                      <div className="ml-2 rounded-full bg-[#25d366] px-2 py-0.5 text-xs text-white">
                        {conv.unread_count}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div
        className={`relative z-10 flex flex-1 flex-col ${!showSidebar ? "block" : ""}`}
      >
        {selectedChat ? (
          <>
            <div className="flex items-center justify-between border-b border-black/5 bg-[#f0f2f5]/92 px-4 py-3 backdrop-blur-xl">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowSidebar(true)}
                  className="mr-2 text-slate-700 md:hidden"
                >
                  <BsArrowLeft size={20} />
                </button>
                <img
                  src={selectedChat.avatar}
                  alt={selectedChat.username}
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {selectedChat.username}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {typingUsers.has(selectedChat.id)
                      ? "typing..."
                      : onlineUsers.has(selectedChat.id)
                        ? "online"
                        : "offline"}
                  </p>
                </div>
              </div>
              <button className="text-slate-500 transition-colors hover:text-slate-900">
                <BsThreeDotsVertical size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto bg-[#efeae2] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-blend-soft-light p-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === user.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      msg.sender_id === user.id
                        ? "rounded-tr-none bg-[#d9fdd3] text-slate-900"
                        : "rounded-tl-none bg-white text-slate-900 shadow-sm"
                    }`}
                  >
                    <p className="min-w-0 break-words text-base">
                      {msg.message}
                    </p>
                    <div className="mt-1 text-right text-xs text-slate-500">
                      {formatTime(msg.created_at)}
                      {msg.sender_id === user.id && (
                        <span className="ml-1 text-[#25d366]">
                          {msg.is_read ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {typingUsers.has(selectedChat.id) && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-none bg-white px-4 py-2 shadow-sm">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                        style={{ animationDelay: "0.4s" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-black/5 bg-[#f0f2f5]/92 p-4 backdrop-blur-xl">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    const emojis = [
                      "😀",
                      "😂",
                      "😍",
                      "🎉",
                      "❤️",
                      "👍",
                      "🔥",
                      "✨",
                    ];
                    const randomEmoji =
                      emojis[Math.floor(Math.random() * emojis.length)];
                    addEmoji(randomEmoji);
                  }}
                  className="text-slate-500 transition-colors hover:text-slate-900"
                >
                  <BsEmojiSmile size={24} />
                </button>
                <button className="text-slate-500 transition-colors hover:text-slate-900">
                  <BsPaperclip size={20} />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    handleTyping(e.target.value.length > 0);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} // Prevent default form submission
                  placeholder="Type a message"
                  className="flex-1 rounded-full border border-black/5 bg-white px-4 py-3 text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#25d366] focus:ring-2 focus:ring-[#25d366]/15"
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim()}
                  className="rounded-full bg-[#25d366] p-3 text-white transition hover:bg-[#1fb85a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <BsSend size={18} />
                </button>
                <button className="text-slate-500 transition-colors hover:text-slate-900 md:hidden">
                  <BsMic size={24} />
                </button>
              </div>

              <div className="mt-2 flex space-x-2 overflow-x-auto">
                {[
                  "😀",
                  "😂",
                  "😍",
                  "🎉",
                  "❤️",
                  "👍",
                  "🔥",
                  "✨",
                  "🌟",
                  "💯",
                  "🤣",
                  "😎",
                ].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => addEmoji(emoji)}
                    className="text-xl transition-transform hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <BsWhatsapp className="mx-auto mb-4 text-6xl text-[#25d366]" />
              <h2 className="mb-2 text-2xl font-semibold text-slate-900">
                Echo Chamber
              </h2>
              <p className="text-slate-500">Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatInterface;
