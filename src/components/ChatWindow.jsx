// ChatWindow.jsx - Fixed version
import React, { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import {
  BsSearch,
  BsSend,
  BsEmojiSmile,
  BsThreeDotsVertical,
  BsArrowLeft,
  BsReply,
  BsPencil,
  BsTrash,
  BsCopy,
  BsX,
  BsWhatsapp,
} from "react-icons/bs";
import { format } from "date-fns";
import VoiceRecorder from "./VoiceRecorder";
// Add this with other imports at the top of ChatWindow.jsx

function ChatWindow({
  chat,
  currentUser,
  onSendMessage,
  onBack,
  onChatCleared,
  realtimeClient,
}) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [clearChatModal, setClearChatModal] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSearchMessageId, setActiveSearchMessageId] = useState(null);
  const [replyingTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [localIsTyping, setLocalIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const messageRefs = useRef(new Map());
  const typingTimeoutRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  // Use relative path to match Dashboard.jsx and leverage Vite proxy
  const API_URL = "/api";
  const currentUserId = currentUser?.id || currentUser?._id;

  // Normalize Chat ID to ensure we always use the database ID for the conversation
  const activeChatId = chat?.chatId || chat?.id || chat?._id;

  const otherUser =
    chat?.otherParticipant ||
    chat?.participants?.find(
      (p) => String(p.id || p._id) !== String(currentUserId),
    );
  const isSameChatId = useCallback(
    (a, b) => a && b && String(a) === String(b),
    [],
  );

  const isMessageForChat = useCallback((message, chatId) => {
    const mChatId =
      message?.chatId || message?.chat_id || message?.conversation_id;
    if (!mChatId) return false;
    return String(mChatId) === String(chatId);
  }, []);

  // --- BASE UTILITIES (Moved up to prevent initialization errors) ---

  const getMessageKey = useCallback(
    (message) =>
      message?.id ||
      message?._id ||
      message?.clientMessageId ||
      message?.tempId,
    [],
  );

  const mergeMessages = useCallback(
    (prevMessages, incomingMessages) => {
      const next = [...prevMessages];

      incomingMessages.forEach((incoming) => {
        if (!incoming) return;

        const incomingClientId = incoming.clientMessageId || null;
        const incomingId = incoming.id || incoming._id || null;

        const existingIndex = next.findIndex((msg) => {
          if (!msg) return false;

          if (incomingClientId && msg.clientMessageId === incomingClientId) {
            return true;
          }

          if (incomingId && (msg.id === incomingId || msg._id === incomingId)) {
            return true;
          }

          return false;
        });

        if (existingIndex !== -1) {
          next[existingIndex] = {
            ...next[existingIndex],
            ...incoming,
          };
          return;
        }

        const key = getMessageKey(incoming);
        if (key && next.some((msg) => getMessageKey(msg) === key)) {
          return;
        }

        next.push(incoming);
      });

      return next.sort(
        (a, b) =>
          new Date(a.createdAt || a.created_at).getTime() -
          new Date(b.createdAt || b.created_at).getTime(),
      );
    },
    [getMessageKey],
  );

  const isNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 100;
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold
    );
  }, []);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (!shouldAutoScrollRef.current) return;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  }, []);

  const markMessagesAsRead = useCallback(() => {
    if (!realtimeClient || !activeChatId || messages.length === 0) return;

    // Find messages from the other participant that haven't been read yet
    const unreadIds = messages
      .filter((msg) => {
        const senderId =
          msg.sender_id ||
          msg.senderId?.id ||
          msg.senderId?._id ||
          msg.senderId;
        return (
          String(senderId) !== String(currentUserId) &&
          !msg.isRead &&
          !msg.isDeleted
        );
      })
      .map((msg) => msg.id || msg._id);

    if (unreadIds.length > 0) {
      console.log(`👁️ Marking ${unreadIds.length} messages as read`);
      realtimeClient.markMessagesAsRead(activeChatId, unreadIds);

      // Optimistic update of local state
      setMessages((prev) =>
        prev.map((msg) =>
          unreadIds.includes(msg.id || msg._id)
            ? { ...msg, isRead: true }
            : msg,
        ),
      );
    }
  }, [realtimeClient, activeChatId, messages, currentUserId]);

  // New handler for edited messages
  const handleMessageEdited = useCallback(
    (editedMessage) => {
      if (isMessageForChat(editedMessage, activeChatId)) {
        console.log("📝 Message edited via WS:", editedMessage);
        setMessages((prev) => mergeMessages(prev, [editedMessage]));

        // Only auto-scroll if user is already near the bottom
        if (isNearBottom()) {
          scrollToBottom("smooth"); // Scroll to bottom if it's a new edit arriving
        }
      }
    },
    [activeChatId, isMessageForChat, mergeMessages, scrollToBottom],
  );

  // New handler for deleted messages
  const handleMessageDeleted = useCallback(
    (deletedMessage) => {
      if (isMessageForChat(deletedMessage, activeChatId)) {
        console.log("🗑️ Message deleted via WS:", deletedMessage);
        // The incoming deletedMessage should contain `isDeleted: true` and possibly `deletedStatus`
        setMessages((prev) => mergeMessages(prev, [deletedMessage]));

        if (isNearBottom()) {
          scrollToBottom("smooth"); // Scroll to bottom if it's a new delete arriving
        }
      }
    },
    [activeChatId, isMessageForChat, mergeMessages, scrollToBottom],
  );

  // New handler for message read events
  const handleMessageRead = useCallback(
    (readEvent) => {
      const { chatId, messageIds } = readEvent;
      if (isSameChatId(chatId, activeChatId)) {
        console.log("✅ Messages marked as read via WS:", messageIds);
        setMessages((prev) =>
          mergeMessages(
            prev,
            messageIds.map((id) => ({ id, isRead: true })),
          ),
        );
      }
    },
    [activeChatId, isSameChatId, mergeMessages],
  );

  // In ChatWindow.jsx - Replace the fetchMessages function
  const fetchMessages = useCallback(
    async (pageNum = 1, append = false) => {
      if (!activeChatId) {
        console.error("Cannot fetch messages: chatId is undefined");
        setMessages([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        let oldScrollHeight = 0;
        if (append && messagesContainerRef.current) {
          oldScrollHeight = messagesContainerRef.current.scrollHeight;
        }

        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No authentication token found");
          setMessages([]);
          setLoading(false);
          return;
        }

        const url = `${API_URL}/chats/${activeChatId}/messages?page=${pageNum}&limit=50`;
        console.log("📥 Fetching messages from:", url);

        const response = await fetch(url, {
          headers: {
            "x-auth-token": token,
            "Content-Type": "application/json",
          },
        });

        // Handle 404 - chat exists but no messages yet (this is fine)
        if (response.status === 404) {
          console.log("No messages found for this chat yet");
          setMessages([]);
          setHasMore(false);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`HTTP ${response.status}:`, errorText);
          if (response.status === 403) {
            toast.error(
              "Access Denied: You are not a participant of this chat.",
            );
          }
          throw new Error(`Failed to load messages: ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ Loaded ${data.messages?.length || 0} messages`);

        const newMessages = data.messages || [];
        // Always use mergeMessages for initial load and pagination to ensure no duplicates
        setMessages((prev) => mergeMessages(prev, newMessages));

        // Mark newly loaded messages from other user as read
        markMessagesAsRead();

        if (append) {
          setTimeout(() => {
            if (messagesContainerRef.current) {
              const newScrollHeight = messagesContainerRef.current.scrollHeight;
              messagesContainerRef.current.scrollTop =
                newScrollHeight - oldScrollHeight;
            }
          }, 0);
        } else {
          if (initialLoad) {
            setTimeout(() => scrollToBottom("auto"), 100);
            setInitialLoad(false);
          }
        }

        setHasMore(data.currentPage < data.totalPages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        // DO NOT set empty array on error if we already have messages
        if (initialLoad) setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [
      activeChatId,
      initialLoad,
      scrollToBottom,
      API_URL,
      mergeMessages,
      markMessagesAsRead,
    ],
  );

  // In ChatWindow.jsx - Update this useEffect
  useEffect(() => {
    if (!realtimeClient || !activeChatId) return;

    // Only join if socket is connected
    if (realtimeClient.isConnected) {
      console.log("🎧 Setting up realtime listeners for chat:", activeChatId);

      const handleNewMessage = (msg) => {
        if (isMessageForChat(msg, activeChatId)) {
          setMessages((prev) => mergeMessages(prev, [msg]));
          if (isNearBottom()) {
            scrollToBottom("smooth");
          }
        }
      };

      realtimeClient.on("new_message", handleNewMessage);
      realtimeClient.joinChat(activeChatId);

      return () => {
        realtimeClient.off("new_message", handleNewMessage);
      };
    } else {
      console.log("Waiting for socket connection...");
      // Try again after a delay
      const timer = setTimeout(() => {
        if (realtimeClient && realtimeClient.isConnected) {
          realtimeClient.joinChat(activeChatId);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [
    realtimeClient,
    activeChatId,
    isMessageForChat,
    scrollToBottom,
    mergeMessages,
    isNearBottom,
  ]);

  // Simplified effect: Only trigger initial fetch and setup trigger ref
  useEffect(() => {
    if (!activeChatId) return;

    // On chat change, we only fetch once to load history.
    // Real-time updates now rely 100% on WebSocket.
    fetchMessages(1, false);
  }, [activeChatId, fetchMessages]);

  // Mark messages as read effect (separate from polling to avoid loops)
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead();
    }
  }, [messages.length, markMessagesAsRead]);

  const getMessageCreatedAt = (message) =>
    message?.createdAt || message?.created_at || message?.timestamp || null;

  const scrollToMessage = useCallback((messageId) => {
    requestAnimationFrame(() => {
      const node = messageRefs.current.get(messageId);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const focusMessageById = useCallback(
    (messageId) => {
      setActiveSearchMessageId(messageId);
      scrollToMessage(messageId);
    },
    [scrollToMessage],
  );

  const handleSearchResultClick = (result) => {
    const resId = result.id || result._id;
    setSearchQuery(result.message || "");
    setShowSearchBar(false);
    setSearchResults([]);
    if (messages.some((message) => (message.id || message._id) === resId)) {
      focusMessageById(resId);
      return;
    }
    loadMessageContext(resId);
  };

  // Load older messages when scrolling up
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    shouldAutoScrollRef.current = isNearBottom();

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
      setContextMenu(null);
      setShowChatMenu(false);
      setClearChatModal(false);
      setShowSearchBar(false);
      setSearchQuery("");
      setSearchResults([]);
      setActiveSearchMessageId(null);
      shouldAutoScrollRef.current = true;
      fetchMessages(1, false);
    }
  }, [activeChatId]);

  // Effect to handle sending typing status to backend
  useEffect(() => {
    if (!activeChatId) return;

    const sendTypingStatus = async (status) => {
      try {
        const token = localStorage.getItem("token");
        await fetch(`${API_URL}/chats/${activeChatId}/typing`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token,
          },
          body: JSON.stringify({ isTyping: status }),
        });
      } catch (err) {
        console.error("Error sending typing status:", err);
      }
    };

    sendTypingStatus(localIsTyping);
  }, [localIsTyping, activeChatId, API_URL]);

  useEffect(() => {
    if (!showSearchBar || !searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const trimmedQuery = searchQuery.trim();

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_URL}/chats/${activeChatId}/messages/search?q=${encodeURIComponent(trimmedQuery)}&limit=8`,
          {
            headers: { "x-auth-token": token },
            signal: controller.signal,
          },
        );
        const data = await response.json();

        if (!response.ok) {
          setSearchResults([]);
          return;
        }

        setSearchResults(Array.isArray(data.results) ? data.results : []);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error searching messages:", error);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [API_URL, activeChatId, searchQuery, showSearchBar]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !e.target.closest(".context-menu") &&
        !e.target.closest(".chat-header-menu") &&
        !e.target.closest(".message-search-panel")
      ) {
        setContextMenu(null);
        setShowChatMenu(false);
        setShowSearchBar(false);
      }
    };

    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const handleRightClick = (e, msg) => {
    e.preventDefault();

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const clickX = e.clientX;
    const clickY = e.clientY;

    // Estimated dimensions of the context menu (width 180px, max height ~220px)
    const menuWidth = 180;
    const menuHeight = 220;

    let x = clickX;
    let y = clickY;

    // If the menu would go off the right edge, move it to the left of the cursor
    if (clickX + menuWidth > screenWidth) x = clickX - menuWidth;
    // If the menu would go off the bottom edge, move it above the cursor
    if (clickY + menuHeight > screenHeight) y = clickY - menuHeight;

    // Final safety check to keep it within the top/left bounds
    x = Math.max(10, x);
    y = Math.max(10, y);

    setContextMenu({
      x,
      y,
      message: msg,
    });
  };

  // Copy message to clipboard
  const handleCopyMessage = (message) => {
    navigator.clipboard.writeText(message.message);
    toast.success("Message copied!");
    setContextMenu(null);
  };

  // Edit message
  const handleEditMessage = (message) => {
    setEditingMessage(message);
    setInputMessage(message.message);
    setContextMenu(null);
    // Focus input
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]');
      input?.focus();
    }, 100);
  };

  // Reply to message
  const handleReplyMessage = (message) => {
    setReplyTo(message);
    setContextMenu(null);
    // Focus input
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]');
      input?.focus();
    }, 100);
  };

  // Delete message
  const handleDeleteMessage = (message) => {
    setDeleteModal(message);
    setContextMenu(null);
  };

  // In ChatWindow.jsx - Fixed version without duplicate
  const handleVoiceSend = async (voiceUrl, voiceDuration) => {
    console.log("🎤 Sending voice message:", { voiceUrl, voiceDuration });

    if (!voiceUrl) {
      console.error("❌ No voice URL provided");
      toast.error("Voice recording failed");
      return;
    }

    try {
      const clientMessageId = crypto.randomUUID();
      const chatId = chat.id || chat._id;

      // Create optimistic message with a unique temporary ID
      const tempMessage = {
        _id: `temp-${clientMessageId}`, // Mark as temporary
        clientMessageId,
        message: "",
        senderId: currentUserId,
        receiverId: otherUser.id || otherUser._id,
        chatId: chatId,
        createdAt: new Date().toISOString(),
        isRead: false,
        isDelivered: true,
        messageType: "voice",
        fileUrl: voiceUrl,
        voiceUrl: voiceUrl,
        voiceDuration: voiceDuration,
        status: "sending",
      };

      // Add optimistic message
      setMessages((prev) => [...prev, tempMessage]);
      scrollToBottom();

      // Send via REST API
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({
          message: "",
          messageType: "voice",
          fileUrl: voiceUrl,
          voiceDuration: voiceDuration,
          clientMessageId: clientMessageId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send voice message: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Voice message saved:", result);

      // Replace the temporary message with the real one, not add a duplicate
      setMessages((prev) =>
        prev.map((msg) =>
          msg.clientMessageId === clientMessageId ||
          msg._id === `temp-${clientMessageId}`
            ? { ...result, status: "sent", _id: result.id || result._id }
            : msg,
        ),
      );

      toast.success("Voice message sent");
    } catch (error) {
      console.error("❌ Failed to send voice message:", error);
      // Remove the temporary message on error
      setMessages((prev) =>
        prev.filter(
          (msg) =>
            !msg._id?.startsWith("temp-") &&
            msg.clientMessageId !== clientMessageId,
        ),
      );
      toast.error("Failed to send voice message");
    }
  };

  // In ChatWindow.jsx - Update the performClearChat function
  const performClearChat = async () => {
    try {
      const token = localStorage.getItem("token");
      const chatId = chat.id || chat._id;

      console.log("🗑️ Clearing chat:", chatId);

      const response = await fetch(`${API_URL}/chats/${chatId}/clear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to clear chat");
        return;
      }

      // Clear messages from state
      setMessages([]);
      setShowChatMenu(false);

      // Call parent callback to refresh friends list
      if (onChatCleared) {
        onChatCleared();
      }

      toast.success("Chat cleared successfully");
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error("Failed to clear chat");
    } finally {
      setClearChatModal(false);
    }
  };

  // In ChatWindow.jsx - REPLACE the handleSendMessage function
  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !editingMessage) return;

    const clientMessageId = crypto.randomUUID();
    const messageText = inputMessage;
    const currentReplyToId = replyingTo?.id || replyingTo?._id;
    const chatId = chat.id || chat._id;

    setReplyTo(null);

    // Handle editing
    if (editingMessage) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_URL}/chats/${chatId}/messages/${editingMessage.id || editingMessage._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-auth-token": token,
            },
            body: JSON.stringify({ message: messageText }),
          },
        );

        if (response.ok) {
          toast.success("Message edited");
          setEditingMessage(null);
          setInputMessage("");
          fetchMessages(1, false);
        } else {
          toast.error("Failed to edit message");
        }
      } catch (error) {
        console.error("Error editing message:", error);
        toast.error("Failed to edit message");
      }
      return;
    }

    // Clear input immediately for better UX
    setInputMessage("");

    // Create optimistic message
    const tempMessage = {
      _id: `temp-${clientMessageId}`,
      clientMessageId,
      message: messageText,
      senderId: currentUserId,
      receiverId: otherUser.id || otherUser._id,
      chatId: chatId,
      createdAt: new Date().toISOString(),
      isRead: false,
      isDelivered: true,
      messageType: "text",
      status: "sending",
      replyTo: currentReplyToId,
    };

    // Add optimistic message to UI
    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    // ONLY USE REST API - WebSocket is optional for production
    try {
      const token = localStorage.getItem("token");
      console.log(
        "📤 Sending message via REST API to:",
        `${API_URL}/chats/${chatId}/messages`,
      );

      const response = await fetch(`${API_URL}/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({
          message: messageText,
          messageType: "text",
          replyTo: currentReplyToId,
          clientMessageId: clientMessageId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Message saved:", result);

      // Replace temp message with real message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.clientMessageId === clientMessageId
            ? { ...result, status: "sent", _id: result.id || result._id }
            : msg,
        ),
      );

      // Mark as delivered/read
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.clientMessageId === clientMessageId
              ? { ...msg, isDelivered: true }
              : msg,
          ),
        );
      }, 1000);
    } catch (error) {
      console.error("❌ Failed to send message:", error);

      // Mark message as failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.clientMessageId === clientMessageId
            ? { ...msg, status: "failed" }
            : msg,
        ),
      );
      toast.error("Failed to send message. Check console for details.");
    }
  };

  // Delete message
  const performDelete = async (forEveryone) => {
    if (!deleteModal) return;

    if (!forEveryone) {
      setMessages((prev) =>
        prev.filter(
          (m) => (m.id || m._id) !== (deleteModal.id || deleteModal._id),
        ),
      );
      toast.success("Message deleted for you");
      setDeleteModal(null);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/chats/${chat.id || chat._id}/messages/${deleteModal.id || deleteModal._id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token,
          },
          body: JSON.stringify({ forEveryone }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        if (data.message) {
          setMessages((prev) =>
            prev.map((msg) =>
              (msg.id || msg._id) === (deleteModal.id || deleteModal._id)
                ? { ...data.message, status: "deleted" }
                : msg,
            ),
          );
        }
        toast.success("Message deleted for everyone");
      } else {
        toast.error(data.error || "Failed to delete message");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    } finally {
      setDeleteModal(null);
    }
  };

  // Handle typing indicator
  const handleTyping = (e) => {
    const value = e.target.value;
    setInputMessage(value);

    if (!localIsTyping && value.length > 0) {
      setLocalIsTyping(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setLocalIsTyping(false);
    }, 3000);
  };

  // Format time
  const formatTime = (date) => {
    const value = date || "";
    const parsed = new Date(value);
    if (!value || Number.isNaN(parsed.getTime())) return "";
    return format(parsed, "hh:mm a");
  };

  const formatVoiceDuration = (seconds) => {
    if (seconds == null || Number.isNaN(Number(seconds))) return "";
    const total = Number(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!chat || !otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#efeae2]">
        <div className="text-center">
          <BsWhatsapp className="text-6xl text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Echo Chamber
          </h2>
          <p className="text-gray-500">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#efeae2]">
      {/* Chat Header */}
      <div className="chat-header-menu relative bg-[#f0f2f5] px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex min-w-0 items-center space-x-3">
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
              {isOtherUserTyping ? (
                <span className="text-green-500 animate-pulse italic">
                  typing...
                </span>
              ) : otherUser.isOnline ? (
                <span className="text-green-500">online</span>
              ) : (
                "offline"
              )}
            </p>
          </div>
        </div>
        <div className="message-search-panel relative mx-2 hidden min-w-0 flex-1 max-w-md md:block">
          <div className="relative">
            <BsSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchBar(true);
              }}
              onFocus={() => setShowSearchBar(true)}
              placeholder="Search messages"
              className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-700 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>
          {showSearchBar && searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-2xl">
              {searchLoading ? (
                <div className="px-4 py-3 text-sm text-gray-500">
                  Searching messages...
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={result.id || result._id}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-green-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800">
                          {result.message}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {result.senderName || "Message"} ·{" "}
                          {format(new Date(result.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <span className="text-xs text-green-600">Open</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No messages found
                </div>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowChatMenu((prev) => !prev)}
          className="text-gray-600 hover:text-gray-800"
        >
          <BsThreeDotsVertical size={20} />
        </button>
        {showChatMenu && (
          <div className="absolute right-4 top-14 z-50 w-52 rounded-xl border border-gray-100 bg-white py-2 shadow-xl">
            <button
              onClick={() => {
                setShowChatMenu(false);
                setClearChatModal(true);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Clear Chat
            </button>
          </div>
        )}
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
          const senderId =
            msg.sender_id ||
            msg.senderId?.id ||
            msg.senderId?._id ||
            msg.senderId;
          const isOwn = String(senderId) === String(currentUserId);

          const showAvatar =
            !isOwn &&
            (idx === 0 ||
              String(
                messages[idx - 1]?.sender_id || messages[idx - 1]?.senderId,
              ) !== String(senderId));

          // Find replied message
          const replyId = msg.reply_to || msg.replyTo;
          const repliedMessage = replyId
            ? messages.find((m) => (m.id || m._id) === replyId)
            : null;

          return (
            <div
              key={msg.id || msg._id || msg.tempId}
              onContextMenu={(e) => handleRightClick(e, msg)}
              className={`flex ${isOwn ? "justify-end" : "justify-start"} message-enter`}
              ref={(node) => {
                const mId = msg.id || msg._id;
                if (!mId) return;
                if (node) messageRefs.current.set(mId, node);
                else messageRefs.current.delete(mId);
              }}
            >
              <div
                className={`flex items-end space-x-2 max-w-[70%] ${isOwn ? "flex-row-reverse space-x-reverse" : ""}`}
              >
                {!isOwn && showAvatar && (
                  <img
                    src={otherUser.avatar}
                    alt={otherUser.username}
                    className="w-8 h-8 rounded-full mb-1 shadow-sm"
                  />
                )}
                {!isOwn && !showAvatar && <div className="w-8" />}

                <div
                  className={`relative px-3 py-2 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                    isOwn
                      ? "bg-[#d9fdd3] text-gray-800 rounded-tr-none"
                      : "bg-white text-gray-800 rounded-tl-none"
                  } ${
                    activeSearchMessageId === (msg.id || msg._id)
                      ? "ring-2 ring-green-500 ring-offset-2 ring-offset-[#efeae2]"
                      : ""
                  }`}
                >
                  {repliedMessage && (
                    <div className="bg-black/5 border-l-4 border-green-500 rounded p-1.5 mb-1.5 text-[11px] text-gray-600">
                      <p className="font-medium text-green-600 mb-0.5">
                        Replying to:
                      </p>
                      <p className="truncate">{repliedMessage.message}</p>
                    </div>
                  )}
                  {msg.isEdited && (
                    <span className="text-[10px] text-gray-400 italic mr-1">
                      (edited)
                    </span>
                  )}
                  {msg.isDeleted ? (
                    <div className="flex items-center space-x-2 text-sm italic text-gray-500">
                      <BsTrash size={14} className="shrink-0" />
                      <span>
                        {/* Handle both field styles */}
                        {msg.deletedStatus ||
                          (String(msg.deleted_by || msg.deletedBy) ===
                          String(currentUserId)
                            ? "You deleted this message"
                            : "This message was deleted")}
                      </span>
                    </div>
                  ) : msg.messageType === "voice" ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-700">
                        <span className="text-green-600 font-medium">
                          🎤 Voice note
                        </span>
                        {msg.voiceDuration != null && (
                          <span className="text-xs text-gray-500">
                            {formatVoiceDuration(msg.voiceDuration)}
                          </span>
                        )}
                      </div>
                      {/* Check both possible field names */}
                      {(() => {
                        const audioUrl = msg.fileUrl || msg.voiceUrl;
                        console.log("🎤 Voice message URL check:", {
                          audioUrl,
                          fileUrl: msg.fileUrl,
                          voiceUrl: msg.voiceUrl,
                        });

                        if (audioUrl) {
                          return (
                            <audio
                              controls
                              preload="metadata"
                              src={audioUrl}
                              className="w-full max-w-[260px] h-9"
                              onError={(e) => {
                                console.error("❌ Audio playback error:", e);
                                e.target.style.display = "none";
                              }}
                            >
                              Your browser does not support audio playback.
                            </audio>
                          );
                        } else {
                          return (
                            <div className="text-xs text-red-500">
                              Voice message unavailable
                              <span className="text-gray-400 ml-1">
                                (No URL)
                              </span>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  ) : (
                    <p className="text-sm break-words">{msg.message}</p>
                  )}
                  <div className="flex justify-end items-center space-x-1 mt-1">
                    <span className="text-[10px] text-gray-500">
                      {formatTime(getMessageCreatedAt(msg))}
                    </span>
                    {isOwn &&
                      !msg.isDeleted && ( // Only show read status for own, non-deleted messages
                        <span className="text-[10px]">
                          {msg.isRead ? (
                            <span className="text-blue-500">✓✓</span>
                          ) : msg.status === "sent" ? (
                            <span className="text-gray-500">✓✓</span>
                          ) : msg.status === "failed" ? (
                            <span className="text-red-500">!</span>
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

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f2f5] border-t border-gray-200 p-2">
        {(replyingTo || editingMessage) && (
          <div className="mx-2 mb-2 bg-white/80 backdrop-blur rounded-lg p-2 flex items-center justify-between border-l-4 border-green-500 shadow-sm">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-tight">
                {editingMessage ? "Editing Message" : "Replying to"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {(editingMessage || replyingTo).message}
              </p>
            </div>
            <button
              onClick={() => {
                setReplyTo(null);
                setEditingMessage(null);
                if (editingMessage) setInputMessage("");
              }}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <BsX size={18} className="text-gray-400" />
            </button>
          </div>
        )}
        <div className="flex items-center space-x-2 px-2 pb-1">
          <button className="text-gray-600 hover:text-gray-800">
            <BsEmojiSmile size={24} />
          </button>

          <VoiceRecorder
            onVoiceSend={handleVoiceSend}
            disabled={!(chat.id || chat._id)}
          />

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

          {inputMessage.trim() || editingMessage ? (
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() && !editingMessage}
              className="text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BsSend size={22} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu fixed z-50 bg-white border border-gray-100 shadow-xl rounded-xl py-1 min-w-[180px] backdrop-blur-lg"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReplyMessage(contextMenu.message);
            }}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors"
          >
            <BsReply className="mr-3 text-gray-400" size={16} /> Reply
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyMessage(contextMenu.message);
            }}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors"
          >
            <BsCopy className="mr-3 text-gray-400" size={16} /> Copy
          </button>
          {String(
            contextMenu.message.sender_id ||
              contextMenu.message.senderId?.id ||
              contextMenu.message.senderId?._id ||
              contextMenu.message.senderId,
          ) === String(currentUserId) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditMessage(contextMenu.message);
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors"
            >
              <BsPencil className="mr-3 text-gray-400" size={16} /> Edit
            </button>
          )}
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteMessage(contextMenu.message);
            }}
            className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <BsTrash className="mr-3" size={16} /> Delete
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-2">
                Delete message?
              </h4>
              <p className="text-sm text-gray-500">
                This action cannot be undone.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 space-y-2 flex flex-col">
              <button
                onClick={() => performDelete(false)}
                className="w-full py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Delete for me
              </button>
              {String(
                deleteModal.sender_id ||
                  deleteModal.senderId?.id ||
                  deleteModal.senderId?._id ||
                  deleteModal.senderId,
              ) === String(currentUserId) && (
                <button
                  onClick={() => performDelete(true)}
                  className="w-full py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors cursor-pointer"
                >
                  Delete for everyone
                </button>
              )}
              <button
                onClick={() => setDeleteModal(null)}
                className="w-full py-2 text-gray-500 text-sm hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {clearChatModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="p-6">
              <h4 className="mb-2 text-lg font-semibold text-gray-800">
                Delete chat history?
              </h4>
              <p className="text-sm text-gray-500">
                This will remove the conversation from the server if the API
                supports chat deletion.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 space-y-2 flex flex-col">
              <button
                onClick={performClearChat}
                className="w-full rounded-lg bg-red-500 py-2 font-medium text-white transition-colors hover:bg-red-600"
              >
                Delete chat
              </button>
              <button
                onClick={() => setClearChatModal(false)}
                className="w-full py-2 text-sm text-gray-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWindow;
