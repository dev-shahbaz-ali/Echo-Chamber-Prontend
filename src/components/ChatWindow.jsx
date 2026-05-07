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
} from "react-icons/bs";
import { format } from "date-fns";
import VoiceRecorder from "./VoiceRecorder";

function ChatWindow({
  chat,
  currentUser,
  onSendMessage,
  onTyping,
  ws,
  onBack,
  onChatCleared,
}) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
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

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const messageRefs = useRef(new Map());
  const typingTimeoutRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  const API_URL = "/api";
  const currentUserId = currentUser?.id || currentUser?._id;
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

  const getMessageKey = (message) =>
    message?.id || message?._id || message?.clientMessageId || message?.tempId;

  const mergeMessages = (prevMessages, incomingMessages) => {
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
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  };

  const getMessageCreatedAt = (message) =>
    message?.createdAt || message?.created_at || message?.timestamp || null;

  const waitForWebSocketOpen = useCallback(
    (timeoutMs = 3000) =>
      new Promise((resolve) => {
        if (!ws) {
          resolve(false);
          return;
        }

        if (ws.readyState === WebSocket.OPEN) {
          resolve(true);
          return;
        }

        const startedAt = Date.now();
        const timer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            clearInterval(timer);
            resolve(true);
            return;
          }

          if (Date.now() - startedAt >= timeoutMs) {
            clearInterval(timer);
            resolve(false);
          }
        }, 100);
      }),
    [ws],
  );

  const sendRealtimeMessage = useCallback(
    async (payload) => {
      console.log("📤 Attempting to send via WebSocket:", payload.type);
      console.log("  - WebSocket state:", ws?.readyState);

      // Check WebSocket connection
      if (!ws) {
        console.log("❌ No WebSocket connection available");
        return false;
      }

      if (ws.readyState !== WebSocket.OPEN) {
        console.log(
          `❌ WebSocket not open (state: ${ws.readyState}), falling back to REST`,
        );
        return false;
      }

      try {
        const messageToSend = {
          type: payload.type,
          chatId: String(chat?.id || chat?._id),
          message: payload.message,
          messageType: payload.messageType || "text",
          senderId: currentUserId,
          clientMessageId: payload.clientMessageId,
        };

        // Add optional fields
        if (payload.replyTo) messageToSend.replyTo = payload.replyTo;
        if (payload.voiceUrl) messageToSend.voiceUrl = payload.voiceUrl;
        if (payload.voiceDuration)
          messageToSend.voiceDuration = payload.voiceDuration;

        console.log("📤 Sending WebSocket message:", messageToSend);
        ws.send(JSON.stringify(messageToSend));
        console.log("✅ Message sent via WebSocket");
        return true;
      } catch (error) {
        console.error("❌ Error sending via WebSocket:", error);
        return false;
      }
    },
    [ws, chat?.id, chat?._id, currentUserId],
  );
  // Add this right after your useRef declarations
  useEffect(() => {
    console.log("🔍 ChatWindow Debug Info:");
    console.log("  - WebSocket exists:", !!ws);
    console.log("  - WebSocket readyState:", ws?.readyState);
    console.log(
      "  - WebSocket OPEN status:",
      ws?.readyState === WebSocket.OPEN,
    );
    console.log("  - Chat ID:", chat?.id || chat?._id);
    console.log("  - Current User ID:", currentUserId);
    console.log("  - Other User:", otherUser?.username);
  }, [ws, chat, currentUserId]);

  // Add near other useEffects
  useEffect(() => {
    if (!ws) {
      console.log("⚠️ WebSocket not available");
      return;
    }

    console.log(
      "WebSocket status:",
      ws.readyState === WebSocket.CONNECTING
        ? "Connecting"
        : ws.readyState === WebSocket.OPEN
          ? "Open ✅"
          : ws.readyState === WebSocket.CLOSING
            ? "Closing"
            : ws.readyState === WebSocket.CLOSED
              ? "Closed"
              : "Unknown",
    );

    const handleOpen = () => console.log("✅ WebSocket opened for chat");
    const handleClose = () => console.log("❌ WebSocket closed for chat");

    ws.addEventListener("open", handleOpen);
    ws.addEventListener("close", handleClose);

    return () => {
      ws.removeEventListener("open", handleOpen);
      ws.removeEventListener("close", handleClose);
    };
  }, [ws]);

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
  // Add this effect in ChatWindow.jsx right after the existing WebSocket effect

  // Handle WebSocket messages for this specific chat
  useEffect(() => {
    if (!ws) return;

    const handleWebSocketMessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Only process messages for this chat
        if (
          data.chatId &&
          String(data.chatId) !== String(chat?.id || chat?._id)
        ) {
          return;
        }

        switch (data.type) {
          case "new_message":
          case "receive_message":
            console.log("📨 Received message via WS:", data);

            if (data.message) {
              // Add the new message to state
              setMessages((prev) => {
                // Check if message already exists
                const exists = prev.some(
                  (m) =>
                    (m.id || m._id) === (data.message.id || data.message._id),
                );
                if (exists) return prev;

                const newMessages = [...prev, data.message];
                // Sort by timestamp
                return newMessages.sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime(),
                );
              });

              // Auto-scroll if near bottom
              if (shouldAutoScrollRef.current) {
                setTimeout(() => scrollToBottom(), 100);
              }

              // Mark as read if it's from other user
              const senderId =
                data.message.sender_id ||
                data.message.senderId?.id ||
                data.message.senderId;
              if (String(senderId) !== String(currentUserId)) {
                markMessagesAsRead([data.message.id || data.message._id]);
              }
            }
            break;

          case "message_sent":
            console.log("✅ Message sent confirmation:", data);
            // Update the message status
            if (data.message) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.clientMessageId === data.message.clientMessageId ||
                  (msg.id || msg._id) === (data.message.id || data.message._id)
                    ? { ...data.message, status: "sent" }
                    : msg,
                ),
              );
            }
            break;

          case "user_typing":
            if (data.isTyping) {
              setOtherUserTyping(true);
              // Auto-hide typing indicator after 2 seconds of no updates
              const timeoutId = setTimeout(
                () => setOtherUserTyping(false),
                2000,
              );
              return () => clearTimeout(timeoutId);
            } else {
              setOtherUserTyping(false);
            }
            break;

          case "message_edited":
            if (data.message) {
              setMessages((prev) =>
                prev.map((msg) =>
                  (msg.id || msg._id) === (data.message.id || data.message._id)
                    ? { ...data.message, isEdited: true }
                    : msg,
                ),
              );
            }
            break;

          case "message_deleted":
            if (data.messageId) {
              setMessages((prev) =>
                prev.map((msg) =>
                  (msg.id || msg._id) === data.messageId
                    ? {
                        ...msg,
                        isDeleted: true,
                        message: "This message was deleted",
                      }
                    : msg,
                ),
              );
            }
            break;

          default:
            // Ignore other message types
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.addEventListener("message", handleWebSocketMessage);

    return () => {
      ws.removeEventListener("message", handleWebSocketMessage);
    };
  }, [ws, chat?.id, chat?._id, currentUserId, scrollToBottom]);

  const loadMessageContext = useCallback(
    async (messageId) => {
      const chatId = chat.id || chat._id;
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_URL}/chats/${chatId}/messages/${messageId}/context?limit=24`,
          { headers: { "x-auth-token": token } },
        );
        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Unable to open message");
          return;
        }

        setMessages(data.messages || []);
        setHasMore(false);
        setPage(1);
        setTimeout(() => focusMessageById(messageId), 50);
      } catch (error) {
        console.error("Error loading message context:", error);
        toast.error("Unable to open message");
      }
    },
    [API_URL, chat?.id, chat?._id, focusMessageById],
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

  const fetchMessages = useCallback(
    async (pageNum = 1, append = false) => {
      // Safety check
      const chatId = chat?.id || chat?._id;
      if (!chatId) {
        console.error("Cannot fetch messages: chatId is undefined");
        setMessages([]); // Set empty messages array
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
        const response = await fetch(
          `${API_URL}/chats/${chatId}/messages?page=${pageNum}&limit=50`,
          { headers: { "x-auth-token": token } },
        );

        // Handle 404 specially
        if (response.status === 404) {
          console.warn(`Chat ${chatId} not found or has no messages`);
          setMessages([]);
          setHasMore(false);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (append) {
          setMessages((prev) => mergeMessages(prev, data.messages || []));
          setTimeout(() => {
            if (messagesContainerRef.current) {
              const newScrollHeight = messagesContainerRef.current.scrollHeight;
              messagesContainerRef.current.scrollTop =
                newScrollHeight - oldScrollHeight;
            }
          }, 0);
        } else {
          setMessages((prev) =>
            mergeMessages(
              prev.filter((message) => isMessageForChat(message, chatId)),
              data.messages || [],
            ),
          );
          if (initialLoad) {
            setTimeout(() => scrollToBottom("auto"), 100);
            setInitialLoad(false);
          }
        }

        setHasMore(data.currentPage < data.totalPages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        setMessages([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    },
    [chat?.id, chat?._id, initialLoad, scrollToBottom, API_URL],
  );

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
  }, [chat?.id, chat?._id]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event) => {
      const data = JSON.parse(event.data);

      const isIncomingMessage =
        data.type === "receive_message" ||
        data.type === "new_message" ||
        data.type === "message_sent";

      if (
        isIncomingMessage &&
        isSameChatId(data.chatId, chat?.id || chat?._id)
      ) {
        const incomingMessage = data.message || data;

        setMessages((prev) => {
          const newMessages = mergeMessages(prev, [incomingMessage]);
          if (shouldAutoScrollRef.current) {
            setTimeout(() => scrollToBottom(), 50);
          }
          return newMessages;
        });

        markMessagesAsRead([incomingMessage.id || incomingMessage._id]);
      }

      if (
        data.type === "user_typing" &&
        isSameChatId(data.chatId, chat?.id || chat?._id)
      ) {
        setOtherUserTyping(data.isTyping);
        setTimeout(() => setOtherUserTyping(false), 2000);
      }

      if (data.type === "message_sent" || data.type === "message_edited") {
        setMessages((prev) => {
          return mergeMessages(prev, [data.message]);
        });
      }

      if (
        data.type === "message_deleted" &&
        isSameChatId(data.chatId, chat?.id || chat?._id)
      ) {
        if (data.message) {
          setMessages((prev) =>
            prev.map((msg) =>
              (msg.id || msg._id) === data.messageId
                ? { ...data.message, status: "deleted" }
                : msg,
            ),
          );
        }
      }

      if (
        data.type === "delete_message_error" &&
        isSameChatId(data.chatId, chat?.id || chat?._id)
      ) {
        toast.error(data.error || "Failed to delete message");
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws, chat, scrollToBottom]);

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
          `${API_URL}/chats/${chat.id || chat._id}/messages/search?q=${encodeURIComponent(trimmedQuery)}&limit=8`,
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
  }, [API_URL, chat?.id, chat?._id, searchQuery, showSearchBar]);

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

  const handleVoiceSend = async (voiceUrl, voiceDuration) => {
    try {
      const clientMessageId =
        window.crypto && window.crypto.randomUUID
          ? window.crypto.randomUUID()
          : `voice-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const tempMessage = {
        _id: clientMessageId,
        tempId: clientMessageId,
        clientMessageId,
        message: "",
        senderId: currentUserId,
        receiverId: otherUser.id || otherUser._id,
        chatId: chat.id || chat._id,
        createdAt: new Date().toISOString(),
        isRead: false,
        isDelivered: true,
        messageType: "voice",
        voiceUrl,
        voiceDuration,
        status: "sending",
      };

      setMessages((prev) => mergeMessages(prev, [tempMessage]));
      shouldAutoScrollRef.current = true;
      scrollToBottom();

      const sentViaSocket = await sendRealtimeMessage({
        type: "new_message",
        messageType: "voice",
        voiceUrl,
        voiceDuration,
        clientMessageId,
      });

      if (!sentViaSocket) {
        const result = await onSendMessage(chat.id || chat._id, "", {
          messageType: "voice",
          voiceUrl,
          voiceDuration,
          clientMessageId,
        });

        if (result) {
          setMessages((prev) =>
            mergeMessages(prev, [{ ...result, status: "sent" }]),
          );
        } else {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.clientMessageId === clientMessageId
                ? { ...msg, status: "failed" }
                : msg,
            ),
          );
          toast.error("Failed to send voice message");
        }
      }
    } catch (error) {
      console.error("Error sending voice message:", error);
      toast.error("Failed to send voice message");
    }
  };

  const performClearChat = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/chats/${chat.id || chat._id}/clear`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to clear chat");
        return;
      }

      setMessages([]);
      setShowChatMenu(false);
      onChatCleared?.();
      toast.success("Chat cleared");
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error("Failed to clear chat");
    } finally {
      setClearChatModal(false);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async (messageIds = null) => {
    const unreadMessages = messages.filter(
      (m) =>
        (m.receiver_id ||
          m.receiverId?.id ||
          m.receiverId?._id ||
          m.receiverId) == currentUserId && !m.isRead,
    );

    if (unreadMessages.length === 0) return;

    const ids = messageIds || unreadMessages.map((m) => m.id || m._id);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "mark_read",
          messageIds: ids,
          chatId: chat.id || chat._id,
        }),
      );
    }

    setMessages((prev) =>
      prev.map((msg) =>
        ids.includes(msg.id || msg._id) ? { ...msg, isRead: true } : msg,
      ),
    );
  };

  // Keep THIS version (around line 155) - DELETE the other one
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const clientMessageId = crypto.randomUUID();
    const messageText = inputMessage;
    const currentReplyToId = replyingTo?.id || replyingTo?._id;

    setReplyTo(null);
    setInputMessage("");

    // Optimistic update
    const tempMessage = {
      _id: clientMessageId,
      clientMessageId,
      message: messageText,
      senderId: currentUserId,
      receiverId: otherUser.id || otherUser._id,
      chatId: chat.id || chat._id,
      createdAt: new Date().toISOString(),
      isRead: false,
      isDelivered: true,
      messageType: "text",
      status: "sending",
      replyTo: currentReplyToId,
    };

    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    try {
      // ALWAYS use REST API to save to database
      console.log("📤 Sending via REST API...");
      const result = await onSendMessage(chat.id || chat._id, messageText, {
        replyTo: currentReplyToId,
        clientMessageId,
        messageType: "text",
      });

      if (result) {
        console.log("✅ Message saved to database:", result);
        // Update the temp message with real data
        setMessages((prev) =>
          prev.map((msg) =>
            msg.clientMessageId === clientMessageId
              ? { ...result, status: "sent" }
              : msg,
          ),
        );
      } else {
        throw new Error("REST API failed");
      }
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.clientMessageId === clientMessageId
            ? { ...msg, status: "failed" }
            : msg,
        ),
      );
      toast.error("Failed to send message");
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

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "typing",
          chatId: chat.id || chat._id,
          isTyping: value.length > 0,
        }),
      );
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "typing",
            chatId: chat.id || chat._id,
            isTyping: false,
          }),
        );
      }
    }, 1000);
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
                          Voice note
                        </span>
                        {msg.voiceDuration != null && (
                          <span className="text-xs text-gray-500">
                            {formatVoiceDuration(msg.voiceDuration)}
                          </span>
                        )}
                      </div>
                      {msg.voiceUrl ? (
                        <audio
                          controls
                          preload="none"
                          src={msg.voiceUrl}
                          className="w-full max-w-[260px] h-9"
                        >
                          Your browser does not support audio playback.
                        </audio>
                      ) : (
                        <p className="text-xs text-gray-500">
                          Voice message unavailable
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm break-words">{msg.message}</p>
                  )}
                  <div className="flex justify-end items-center space-x-1 mt-1">
                    <span className="text-[10px] text-gray-500">
                      {formatTime(getMessageCreatedAt(msg))}
                    </span>
                    {isOwn && (
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
                Clear chat?
              </h4>
            </div>
            <div className="bg-gray-50 px-6 py-4 space-y-2 flex flex-col">
              <button
                onClick={performClearChat}
                className="w-full rounded-lg bg-red-500 py-2 font-medium text-white transition-colors hover:bg-red-600"
              >
                Clear chat
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
