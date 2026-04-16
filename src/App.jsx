import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "./App.css";
import { emojiData as initialEmojiData } from "./emoji-data"; // Assuming this file will be created

// Helper to format duration for voice messages
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const emojiCategoryLabels = {
  smileys: "Smileys",
  animals: "Animals",
  food: "Food",
  activities: "Activities",
  objects: "Objects",
  recent: "Recent",
};

const CHAT_HISTORY_STORAGE_KEY = "chat-histories";

const readChatHistories = () => {
  try {
    return JSON.parse(localStorage.getItem(CHAT_HISTORY_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

const loadChatMessages = (chatName) => {
  const histories = readChatHistories();
  return histories[chatName] || [];
};

const saveChatMessages = (chatName, chatMessages) => {
  const histories = readChatHistories();
  histories[chatName] = chatMessages;
  localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(histories));
};

const buildMessageSearchText = (msg) =>
  [
    msg.text,
    msg.fileName,
    msg.replyTo,
    msg.audio ? "voice message" : "",
    msg.image ? "image" : "",
    msg.file ? "file" : "",
    msg.deleted ? "deleted" : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const UiIcon = ({ name }) => {
  const commonProps = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    focusable: "false",
  };

  switch (name) {
    case "search":
      return (
        <svg {...commonProps}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case "close":
      return (
        <svg {...commonProps}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      );
    case "settings":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-1.4 3.4 2 2 0 0 1-1.4-.6l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3A1.7 1.7 0 0 0 10 3.2V3a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z" />
        </svg>
      );
    case "attach":
      return (
        <svg {...commonProps}>
          <path d="M14.5 7.5 8.7 13.3a3 3 0 1 0 4.2 4.2l6.2-6.2a5 5 0 1 0-7.1-7.1l-7 7a7 7 0 0 0 9.9 9.9l5.6-5.6" />
        </svg>
      );
    case "emoji":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 14a5 5 0 0 0 7 0" />
          <path d="M9 10h0" />
          <path d="M15 10h0" />
        </svg>
      );
    case "mic":
      return (
        <svg {...commonProps}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M6 11a6 6 0 0 0 12 0" />
          <path d="M12 18v3" />
          <path d="M8 21h8" />
        </svg>
      );
    case "stop":
      return (
        <svg {...commonProps}>
          <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" />
        </svg>
      );
    case "send":
      return (
        <svg {...commonProps}>
          <path d="m4 12 16-8-5 16-2-7-9-1Z" />
        </svg>
      );
    case "clear":
      return (
        <svg {...commonProps}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      );
    case "down":
      return (
        <svg {...commonProps}>
          <path d="m6 10 6 6 6-6" />
        </svg>
      );
    case "play":
      return (
        <svg {...commonProps}>
          <path d="m9 6 9 6-9 6Z" />
        </svg>
      );
    case "pause":
      return (
        <svg {...commonProps}>
          <path d="M8 6v12" />
          <path d="M16 6v12" />
        </svg>
      );
    case "menu":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "info":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10.5v5" />
          <path d="M12 7.5h0" />
        </svg>
      );
    case "mute":
      return (
        <svg {...commonProps}>
          <path d="M11 5 6 9H3v6h3l5 4Z" />
          <path d="M16 9a4 4 0 0 1 0 6" />
          <path d="M19 6a8 8 0 0 1 0 12" />
        </svg>
      );
    case "clock":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "heart":
      return (
        <svg {...commonProps}>
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
        </svg>
      );
    case "list":
      return (
        <svg {...commonProps}>
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M4 6h0" />
          <path d="M4 12h0" />
          <path d="M4 18h0" />
        </svg>
      );
    case "x":
      return (
        <svg {...commonProps}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      );
    case "report":
      return (
        <svg {...commonProps}>
          <path d="M12 9v4" />
          <path d="M12 17h0" />
          <path d="M10.3 4h3.4L21 11.3v3.4L13.7 22h-3.4L3 14.7v-3.4Z" />
        </svg>
      );
    case "block":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      );
    case "trash":
      return (
        <svg {...commonProps}>
          <path d="M4 7h16" />
          <path d="M9 7V5h6v2" />
          <path d="M6 7l1 13h10l1-13" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      );
    case "sun":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2.5" />
          <path d="M12 19.5V22" />
          <path d="m4.9 4.9 1.8 1.8" />
          <path d="m17.3 17.3 1.8 1.8" />
          <path d="M2 12h2.5" />
          <path d="M19.5 12H22" />
          <path d="m4.9 19.1 1.8-1.8" />
          <path d="m17.3 6.7 1.8-1.8" />
        </svg>
      );
    case "moon":
      return (
        <svg {...commonProps}>
          <path d="M20 14.5A7.7 7.7 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        </svg>
      );
    default:
      return null;
  }
};

function App() {
  const [messages, setMessages] = useState(() =>
    loadChatMessages("Shahbaz Ali"),
  );
  const [messageInput, setMessageInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState("0:00");
  const [activeChatName, setActiveChatName] = useState("Shahbaz Ali");
  const [activeChatInitials, setActiveChatInitials] = useState("SA");
  const statusText = "last seen today at 11:45 AM";
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearchQuery, setEmojiSearchQuery] = useState("");
  const [currentEmojiCategory, setCurrentEmojiCategory] = useState("smileys");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAvatarOverlay, setShowAvatarOverlay] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingTo, setReplyingTo] = useState(null); // { id: 'msgId', text: 'original message text' }
  const [showClearChatConfirmModal, setShowClearChatConfirmModal] =
    useState(false);
  const [showDeleteChatConfirmModal, setShowDeleteChatConfirmModal] =
    useState(false);
  const [messageMenuMode, setMessageMenuMode] = useState("actions");
  const [selectedMessageForContext, setSelectedMessageForContext] =
    useState(null); // For context menu actions
  const [contextMenuPosition, setContextMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [theme, setTheme] = useState(
    localStorage.getItem("chat-theme") || "light",
  );
  const hasTypedText = messageInput.trim().length > 0;
  const activeChatNameRef = useRef(activeChatName);
  const [deletedChatNames, setDeletedChatNames] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("deleted-chat-names")) || [];
    } catch {
      return [];
    }
  });
  const chatList = useMemo(
    () => [
      {
        name: "Shahbaz Ali",
        initials: "SA",
        preview: "Let's catch up later!",
        time: "11:45 AM",
        avatarStyle: {
          background: "linear-gradient(135deg, #25d366, #128c7e)",
        },
      },
      {
        name: "John Doe",
        initials: "JD",
        preview: "Project report is ready.",
        time: "Yesterday",
        avatarStyle: {
          background: "linear-gradient(135deg, #25d366, #075e54)",
        },
      },
    ],
    [],
  );
  const filteredChatList = useMemo(() => {
    const query = chatSearchQuery.trim().toLowerCase();
    const availableChats = chatList.filter(
      (chat) => !deletedChatNames.includes(chat.name),
    );
    if (!query) return availableChats;
    return availableChats.filter((chat) =>
      [chat.name, chat.preview, chat.time, chat.initials]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [chatSearchQuery, chatList, deletedChatNames]);

  const socket = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const recordInterval = useRef(null);
  const typingTimeout = useRef(null);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiBtnRef = useRef(null);
  const contextMenuRef = useRef(null);
  const chatMenuRef = useRef(null);

  // --- WebSocket Connection and Message Handling ---
  useEffect(() => {
    socket.current = new WebSocket("ws://localhost:8080");

    socket.current.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "chat":
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: data.id,
              text: data.text,
              side: "friend",
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              replyTo: data.replyTo,
              replyId: data.replyId,
            },
          ]);
          break;
        case "delete":
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === data.messageId
                ? { ...msg, deleted: true, text: "This message was deleted" }
                : msg,
            ),
          );
          break;
        case "voice":
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: data.id,
              audio: data.audio,
              side: "friend",
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              replyTo: data.replyTo,
              replyId: data.replyId,
            },
          ]);
          break;
        case "image":
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: data.id,
              image: data.data,
              side: "friend",
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);
          break;
        case "file":
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: data.id,
              file: data.data,
              fileName: data.name,
              side: "friend",
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);
          break;
        case "typing":
          setIsTyping(data.isTyping);
          break;
        default:
          console.warn("Unknown message type:", data.type);
      }
    };

    socket.current.onclose = () => {
      console.log("WebSocket disconnected");
    };

    socket.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      socket.current.close();
    };
  }, []);

  // --- Scroll to bottom on new messages ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    activeChatNameRef.current = activeChatName;
  }, [activeChatName]);

  // --- Theme Application ---
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("chat-theme", theme);
  }, [theme]);

  useEffect(() => {
    saveChatMessages(activeChatNameRef.current, messages);
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(
      "deleted-chat-names",
      JSON.stringify(deletedChatNames),
    );
  }, [deletedChatNames]);

  const normalizedMessageSearch = searchQuery.trim().toLowerCase();
  const filteredMessages = useMemo(() => {
    if (!normalizedMessageSearch) return messages;
    return messages.filter((msg) =>
      buildMessageSearchText(msg).includes(normalizedMessageSearch),
    );
  }, [messages, normalizedMessageSearch]);
  const hasMessageSearchResults =
    normalizedMessageSearch.length === 0 || filteredMessages.length > 0;

  const toggleSettingsModal = useCallback(() => {
    setShowSettingsModal((prev) => {
      if (!prev) {
        setUserName(localStorage.getItem("chat-name") || "Echo User");
        setUserInitials(localStorage.getItem("chat-initials") || "GC");
      }
      return !prev;
    });
  }, []);

  const [userName, setUserName] = useState(
    localStorage.getItem("chat-name") || "Echo User",
  );
  const [userInitials, setUserInitials] = useState(
    localStorage.getItem("chat-initials") || "GC",
  );

  const saveSettings = useCallback(() => {
    if (userName) localStorage.setItem("chat-name", userName);
    if (userInitials) {
      localStorage.setItem("chat-initials", userInitials);
    }
    toggleSettingsModal();
  }, [userName, userInitials, toggleSettingsModal]);

  useEffect(() => {
    const savedInitials = localStorage.getItem("chat-initials");
    if (savedInitials) setUserInitials(savedInitials);
  }, []);

  // --- File Upload Handling ---
  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const payload = e.target.result;
      const isImage = file.type.startsWith("image/");
      const messageId =
        "m" + Date.now() + Math.random().toString(36).substr(2, 5);

      if (isImage) {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: messageId,
            image: payload,
            side: "you",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
        socket.current.send(
          JSON.stringify({ type: "image", data: payload, id: messageId }),
        );
      } else {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: messageId,
            file: payload,
            fileName: file.name,
            side: "you",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
        socket.current.send(
          JSON.stringify({
            type: "file",
            data: payload,
            name: file.name,
            id: messageId,
          }),
        );
      }
    };
    reader.readAsDataURL(file);
    event.target.value = ""; // Reset input
  }, []);

  // --- Voice Recording Logic ---
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      let seconds = 0;

      mediaRecorder.current.ondataavailable = (e) =>
        audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const messageId =
            "m" + Date.now() + Math.random().toString(36).substr(2, 5);
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: messageId,
              audio: reader.result,
              side: "you",
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              replyTo: replyingTo?.text,
              replyId: replyingTo?.id,
            },
          ]);
          socket.current.send(
            JSON.stringify({
              type: "voice",
              audio: reader.result,
              id: messageId,
              replyTo: replyingTo?.text,
              replyId: replyingTo?.id,
            }),
          );
          setReplyingTo(null); // Clear reply after sending
        };
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setMessageInput(""); // Clear input when recording starts
      setRecordTimer("0:00");
      recordInterval.current = setInterval(() => {
        seconds++;
        setRecordTimer(formatDuration(seconds));
      }, 1000);
    } catch {
      alert("Mic access denied"); // Consider a more user-friendly notification
    }
  }, [replyingTo]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      clearInterval(recordInterval.current);
      setRecordTimer("0:00");
    }
  }, [isRecording]);

  const handleVoiceAction = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // --- Text Message Logic ---
  const handleTextSend = useCallback(
    (event) => {
      event.preventDefault(); // Prevent form submission default
      const text = messageInput.trim();
      if (!text) return;

      const messageId =
        "m" + Date.now() + Math.random().toString(36).substr(2, 5);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: messageId,
          text: text,
          side: "you",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          replyTo: replyingTo?.text,
          replyId: replyingTo?.id,
        },
      ]);
      socket.current.send(
        JSON.stringify({
          type: "chat",
          text: text,
          id: messageId,
          replyTo: replyingTo?.text,
          replyId: replyingTo?.id,
        }),
      );

      setMessageInput("");
      setReplyingTo(null);
      setShowEmojiPicker(false);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      socket.current.send(JSON.stringify({ type: "typing", isTyping: false }));
    },
    [messageInput, replyingTo],
  );

  const handleMessageInputChange = useCallback((e) => {
    const text = e.target.value;
    setMessageInput(text);

    // Typing Indicator with Debounce
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (text.length > 0) {
      socket.current.send(JSON.stringify({ type: "typing", isTyping: true }));
      typingTimeout.current = setTimeout(() => {
        socket.current.send(
          JSON.stringify({ type: "typing", isTyping: false }),
        );
      }, 1500);
    } else {
      socket.current.send(JSON.stringify({ type: "typing", isTyping: false }));
    }
  }, []);

  // --- Interaction UI ---
  const toggleSearch = useCallback(() => {
    setShowSearchBar((prev) => {
      if (prev) setSearchQuery(""); // Clear search when closing
      setShowChatMenu(false);
      return !prev;
    });
  }, []);

  const toggleAvatarOverlay = useCallback(() => {
    setShowAvatarOverlay((prev) => !prev);
  }, []);

  // --- Emoji Picker Logic ---
  const addToRecent = useCallback((emoji) => {
    let recent = JSON.parse(localStorage.getItem("recentEmojis")) || [];
    const index = recent.indexOf(emoji);
    if (index > -1) recent.splice(index, 1);
    recent.unshift(emoji);
    if (recent.length > 36) recent.pop();
    localStorage.setItem("recentEmojis", JSON.stringify(recent));
    // No need to update state here, as initialEmojiData.recent is not directly used for rendering after initial load
  }, []);

  const renderEmojis = useCallback(
    (list) => {
      return list.map((emoji) => (
        <span
          key={emoji}
          className="emoji-item"
          onClick={() => {
            setMessageInput((prev) => prev + emoji);
            addToRecent(emoji);
            // Trigger input change to update send/mic button and typing status
            const event = new Event("input", { bubbles: true });
            const inputElement = document.getElementById("messageInput");
            if (inputElement) {
              inputElement.value = messageInput + emoji;
              inputElement.dispatchEvent(event);
            }
            // messageInputRef.current.focus(); // Focus back to input
          }}
        >
          {emoji}
        </span>
      ));
    },
    [messageInput, addToRecent],
  );

  const filterCategory = useCallback((category) => {
    setCurrentEmojiCategory(category);
    setEmojiSearchQuery("");
  }, []);

  const searchEmojis = useCallback((query) => {
    setEmojiSearchQuery(query);
  }, []);

  const getFilteredEmojis = useCallback(() => {
    const dataToFilter =
      initialEmojiData[currentEmojiCategory] || initialEmojiData.smileys;
    if (!emojiSearchQuery.trim()) {
      return dataToFilter;
    }
    const all = Object.values(initialEmojiData).flat(); // Search across all categories
    const filtered = [...new Set(all)]
      .filter((emoji) => emoji.includes(emojiSearchQuery))
      .slice(0, 50);
    return filtered;
  }, [currentEmojiCategory, emojiSearchQuery]);

  const toggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker((prev) => !prev);
  }, []);

  const closeContextMenu = useCallback(() => {
    setSelectedMessageForContext(null);
    setMessageMenuMode("actions");
  }, []);

  const toggleChatMenu = useCallback(() => {
    setShowChatMenu((prev) => !prev);
    setShowEmojiPicker(false);
    setShowSearchBar(false);
    closeContextMenu();
  }, [closeContextMenu]);

  const closeChatMenu = useCallback(() => {
    setShowChatMenu(false);
  }, []);

  const handleContactInfo = useCallback(() => {
    setShowAvatarOverlay(true);
    closeChatMenu();
  }, [closeChatMenu]);

  const handleSelectMessages = useCallback(() => {
    closeChatMenu();
  }, [closeChatMenu]);

  const handleMuteNotifications = useCallback(() => {
    closeChatMenu();
  }, [closeChatMenu]);

  const handleDisappearingMessages = useCallback(() => {
    closeChatMenu();
  }, [closeChatMenu]);

  const handleAddToFavorites = useCallback(() => {
    closeChatMenu();
  }, [closeChatMenu]);

  const handleAddToList = useCallback(() => {
    closeChatMenu();
  }, [closeChatMenu]);

  const handleCloseChat = useCallback(() => {
    closeChatMenu();
    const nextChat = chatList.find(
      (chat) =>
        !deletedChatNames.includes(chat.name) && chat.name !== activeChatName,
    );
    if (nextChat) {
      setActiveChatName(nextChat.name);
      setActiveChatInitials(nextChat.initials);
      activeChatNameRef.current = nextChat.name;
      setMessages(loadChatMessages(nextChat.name));
    }
  }, [activeChatName, chatList, deletedChatNames, closeChatMenu]);

  const handleReport = useCallback(() => {
    closeChatMenu();
  }, [closeChatMenu]);

  const handleBlock = useCallback(() => {
    closeChatMenu();
  }, [closeChatMenu]);

  const handleClearChatFromMenu = useCallback(() => {
    setShowClearChatConfirmModal(true);
    closeChatMenu();
  }, [closeChatMenu]);

  const handleDeleteChatFromMenu = useCallback(() => {
    setShowDeleteChatConfirmModal(true);
    closeChatMenu();
  }, [closeChatMenu]);

  // --- Context Menu Logic ---
  const handleContextMenu = useCallback((e, msg) => {
    e.preventDefault();
    if (msg.deleted) return;
    setSelectedMessageForContext(msg);
    setMessageMenuMode("actions");
    const estimatedWidth = 220;
    const estimatedHeight = 180;
    const top = Math.min(e.clientY, window.innerHeight - estimatedHeight - 12);
    const left = Math.min(e.clientX, window.innerWidth - estimatedWidth - 12);
    setContextMenuPosition({
      top: Math.max(top, 12),
      left: Math.max(left, 12),
    });
  }, []);

  const handleMessageMenuButton = useCallback((event, msg) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedMessageForContext(msg);

    const menuWidth = 220;
    const menuHeight = 140;
    const rect = event.currentTarget.getBoundingClientRect();
    const top = Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 12);
    const left = Math.min(
      rect.right - menuWidth,
      window.innerWidth - menuWidth - 12,
    );

    setContextMenuPosition({
      top: Math.max(top, 12),
      left: Math.max(left, 12),
    });
  }, []);

  const handleReply = useCallback(() => {
    if (!selectedMessageForContext) return;
    setReplyingTo({
      id: selectedMessageForContext.id,
      text: selectedMessageForContext.text || "Voice Message", // Fallback for non-text messages
    });
    closeContextMenu();
  }, [selectedMessageForContext, closeContextMenu]);

  const openDeleteOptions = useCallback(() => {
    setMessageMenuMode("delete-options");
  }, []);

  const handleDeleteForMe = useCallback(() => {
    if (!selectedMessageForContext) return;
    const messageId = selectedMessageForContext.id;
    setMessages((prevMessages) => {
      const nextMessages = prevMessages.filter((msg) => msg.id !== messageId);
      saveChatMessages(activeChatNameRef.current, nextMessages);
      return nextMessages;
    });
    closeContextMenu();
  }, [selectedMessageForContext, closeContextMenu]);

  const handleDeleteForEveryone = useCallback(() => {
    if (!selectedMessageForContext) return;
    const messageId = selectedMessageForContext.id;

    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === messageId
          ? { ...msg, deleted: true, text: "This message was deleted" }
          : msg,
      ),
    );
    socket.current.send(
      JSON.stringify({
        type: "delete",
        messageId,
      }),
    );
    closeContextMenu();
  }, [selectedMessageForContext, closeContextMenu]);

  const handleCopyMessage = useCallback(async () => {
    if (!selectedMessageForContext) return;
    const copyText =
      selectedMessageForContext.text ||
      selectedMessageForContext.fileName ||
      "Voice message";

    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      const temp = document.createElement("textarea");
      temp.value = copyText;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
    }
    closeContextMenu();
  }, [selectedMessageForContext, closeContextMenu]);

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const closeClearChatModal = useCallback(() => {
    setShowClearChatConfirmModal(false);
  }, []);

  const closeDeleteChatModal = useCallback(() => {
    setShowDeleteChatConfirmModal(false);
  }, []);

  const confirmClearChat = useCallback(() => {
    setMessages([]);
    saveChatMessages(activeChatNameRef.current, []);
    setShowClearChatConfirmModal(false);
    setSelectedMessageForContext(null);
  }, []);

  const confirmDeleteChat = useCallback(() => {
    const currentChatName = activeChatNameRef.current;
    setDeletedChatNames((prev) => {
      const next = prev.includes(currentChatName)
        ? prev
        : [...prev, currentChatName];
      localStorage.setItem("deleted-chat-names", JSON.stringify(next));
      return next;
    });
    saveChatMessages(currentChatName, []);
    setMessages([]);
    setShowDeleteChatConfirmModal(false);
    setSelectedMessageForContext(null);

    const remainingChats = chatList.filter(
      (chat) =>
        chat.name !== currentChatName && !deletedChatNames.includes(chat.name),
    );
    if (remainingChats.length > 0) {
      const nextChat = remainingChats[0];
      setActiveChatName(nextChat.name);
      setActiveChatInitials(nextChat.initials);
      activeChatNameRef.current = nextChat.name;
      setMessages(loadChatMessages(nextChat.name));
    }
  }, [chatList, deletedChatNames]);

  // --- Click outside handlers for modals/pickers ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        emojiBtnRef.current &&
        !emojiBtnRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target)
      ) {
        closeContextMenu();
      }
      if (chatMenuRef.current && !chatMenuRef.current.contains(event.target)) {
        closeChatMenu();
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeContextMenu();
        closeChatMenu();
      }
    };
    const handleContextMenuDismiss = () => {
      closeContextMenu();
      closeChatMenu();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleContextMenuDismiss, true);
    window.addEventListener("resize", handleContextMenuDismiss);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleContextMenuDismiss, true);
      window.removeEventListener("resize", handleContextMenuDismiss);
    };
  }, [closeContextMenu, closeChatMenu]);

  // --- Scroll to bottom button logic ---
  const [showScrollToBottomBtn, setShowScrollToBottomBtn] = useState(false);
  const messagesContainerRef = useRef(null);

  const handleMessagesScroll = useCallback(() => {
    const threshold = 200;
    const { scrollHeight, scrollTop, clientHeight } =
      messagesContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > threshold;
    setShowScrollToBottomBtn(isScrolledUp);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesContainerRef.current.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  // --- Chat List Functionality (Simplified for now) ---
  const switchChat = useCallback(
    (name, initials) => {
      saveChatMessages(activeChatNameRef.current, messages);
      setActiveChatName(name);
      setActiveChatInitials(initials);
      activeChatNameRef.current = name;
      setMessages(loadChatMessages(name));
      setChatSearchQuery("");
      setShowSearchBar(false);
    },
    [messages],
  );

  const filterChatList = useCallback((event) => {
    const query = event.target.value.toLowerCase();
    // This would typically filter a state-managed list of chats
    // For now, it's a placeholder.
    console.log("Filtering chat list with:", query);
  }, []);

  return (
    <div className="app-container">
      <aside className="sidebar">
        <header className="sidebar-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              className="avatar"
              id="myAvatar"
              style={{
                width: "40px",
                height: "40px",
                background: "linear-gradient(135deg, #25d366, #128c7e)",
              }}
            >
              {userInitials}
            </div>
            <span
              style={{
                color: "var(--text-main)",
                fontWeight: "700",
                fontSize: "14px",
                letterSpacing: "0.5px",
              }}
            >
              ECHO CHAMBER
            </span>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="pill-btn pill-btn-icon"
              onClick={toggleSettingsModal}
              aria-label="Settings"
              title="Settings"
            >
              <UiIcon name="settings" />
            </button>
          </div>
        </header>

        <div className="sidebar-search">
          <div className="search-container-sidebar">
            <input
              type="text"
              id="chatSearch"
              placeholder="Search chats"
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="chat-list" id="chatList">
          {filteredChatList.map((chat) => (
            <div
              key={chat.name}
              className={`chat-item ${activeChatName === chat.name ? "active" : ""}`}
              onClick={() => switchChat(chat.name, chat.initials)}
            >
              <div className="chat-avatar" style={chat.avatarStyle}>
                {chat.initials}
              </div>
              <div className="chat-info">
                <div className="chat-top">
                  <span className="chat-name">{chat.name}</span>
                  <span className="chat-time">{chat.time}</span>
                </div>
                <div className="chat-bottom">
                  <span className="chat-msg">{chat.preview}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredChatList.length === 0 && (
            <div className="empty-search-state">No chats found</div>
          )}
        </div>
      </aside>

      <main className="chat-window">
        <header className="header">
          <div
            className="avatar"
            style={{ cursor: "pointer" }}
            onClick={toggleAvatarOverlay}
          >
            {activeChatInitials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "var(--text-main)" }}>
              <span id="activeChatName">{activeChatName}</span>
            </div>
            <div
              id="status"
              style={{
                fontSize: "12.5px",
                color: "var(--text-dim)",
                marginTop: "2px",
              }}
            >
              {statusText}
            </div>
          </div>
          <button
            className="pill-btn pill-btn-icon"
            type="button"
            onClick={toggleSearch}
            aria-label="Search"
            title="Search"
          >
            <UiIcon name="search" />
          </button>
          <button
            className="pill-btn pill-btn-icon"
            type="button"
            onClick={toggleChatMenu}
            aria-label="More options"
            title="More options"
          >
            <UiIcon name="menu" />
          </button>
        </header>

        {showChatMenu && (
          <div className="chat-menu" ref={chatMenuRef}>
            <button
              type="button"
              className="chat-menu-item"
              onClick={handleContactInfo}
            >
              <UiIcon name="info" />
              <span>Contact info</span>
            </button>
            <button
              type="button"
              className="chat-menu-item"
              onClick={toggleSearch}
            >
              <UiIcon name="search" />
              <span>Search</span>
            </button>
            <button
              type="button"
              className="chat-menu-item"
              onClick={handleSelectMessages}
            >
              <UiIcon name="list" />
              <span>Select messages</span>
            </button>
            <button
              type="button"
              className="chat-menu-item"
              onClick={handleMuteNotifications}
            >
              <UiIcon name="mute" />
              <span>Mute notifications</span>
            </button>
            <button
              type="button"
              className="chat-menu-item"
              onClick={handleDisappearingMessages}
            >
              <UiIcon name="clock" />
              <span>Disappearing messages</span>
            </button>
            <button
              type="button"
              className="chat-menu-item"
              onClick={handleAddToFavorites}
            >
              <UiIcon name="heart" />
              <span>Add to favourites</span>
            </button>
            <button
              type="button"
              className="chat-menu-item"
              onClick={handleAddToList}
            >
              <UiIcon name="list" />
              <span>Add to list</span>
            </button>
            <button
              type="button"
              className="chat-menu-item"
              onClick={handleCloseChat}
            >
              <UiIcon name="x" />
              <span>Close chat</span>
            </button>
            <div className="chat-menu-divider" />
            <button
              type="button"
              className="chat-menu-item"
              onClick={handleReport}
            >
              <UiIcon name="report" />
              <span>Report</span>
            </button>
            <button
              type="button"
              className="chat-menu-item"
              onClick={handleBlock}
            >
              <UiIcon name="block" />
              <span>Block</span>
            </button>
            <button
              type="button"
              className="chat-menu-item danger"
              onClick={handleClearChatFromMenu}
            >
              <UiIcon name="clear" />
              <span>Clear chat</span>
            </button>
            <button
              type="button"
              className="chat-menu-item danger"
              onClick={handleDeleteChatFromMenu}
            >
              <UiIcon name="trash" />
              <span>Delete chat</span>
            </button>
          </div>
        )}

        {showSearchBar && (
          <div id="searchBar" className="search-bar">
            <input
              type="text"
              id="searchInput"
              placeholder="Search messages in this chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="pill-btn pill-btn-icon"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                title="Clear search"
              >
                <UiIcon name="clear" />
              </button>
            )}
            <button
              className="pill-btn pill-btn-icon"
              type="button"
              onClick={toggleSearch}
              aria-label="Close search"
              title="Close search"
            >
              <UiIcon name="close" />
            </button>
          </div>
        )}

        <div
          className="messages"
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
        >
          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              id={msg.id}
              className={`msg ${msg.side} ${msg.deleted ? "deleted" : ""} ${msg.audio ? "voice-msg" : ""}`}
              onContextMenu={(e) => handleContextMenu(e, msg)}
            >
              {msg.replyTo && (
                <div
                  className="msg-reply"
                  onClick={(e) => {
                    e.stopPropagation();
                    const target = document.getElementById(msg.replyId);
                    if (target) {
                      target.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                      target.style.filter = "brightness(1.2)";
                      setTimeout(() => (target.style.filter = ""), 800);
                    }
                  }}
                >
                  {msg.replyTo}
                </div>
              )}

              {msg.deleted ? (
                <span>{msg.text}</span>
              ) : msg.image ? (
                <img
                  src={msg.image}
                  className="img-msg"
                  alt=""
                  onClick={() => window.open(msg.image, "_blank")}
                />
              ) : msg.file ? (
                <a href={msg.file} download={msg.fileName} className="file-msg">
                  <div className="file-info">
                    <span className="file-name">{msg.fileName}</span>
                    <span style={{ fontSize: "10px", opacity: 0.6 }}>
                      Click to download
                    </span>
                  </div>
                </a>
              ) : msg.audio ? (
                <VoiceMessagePlayer
                  src={msg.audio}
                  side={msg.side}
                  timestamp={msg.timestamp}
                />
              ) : (
                <span>{msg.text}</span>
              )}

              {!msg.deleted && (
                <div className="msg-meta">
                  <span className="timestamp">{msg.timestamp}</span>
                  <button
                    type="button"
                    className="msg-menu-btn"
                    onClick={(e) => handleMessageMenuButton(e, msg)}
                    aria-label="Message menu"
                    title="Message menu"
                  >
                    <UiIcon name="menu" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {!hasMessageSearchResults && searchQuery.trim() && (
            <div className="empty-search-state">
              No messages match "{searchQuery.trim()}"
            </div>
          )}
          {isTyping && (
            <div className="typing-bubble friend" aria-live="polite">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
              <span className="typing-label">typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {showScrollToBottomBtn && (
          <div
            id="scrollBottomBtn"
            className="scroll-bottom-btn"
            onClick={scrollToBottom}
          >
            <UiIcon name="down" />
          </div>
        )}

        <div className="input-wrapper">
          {showEmojiPicker && (
            <div id="emojiPicker" className="emoji-picker" ref={emojiPickerRef}>
              <div className="emoji-search-container">
                <input
                  type="text"
                  id="emojiSearch"
                  placeholder="Search emojis..."
                  value={emojiSearchQuery}
                  onChange={(e) => searchEmojis(e.target.value)}
                />
              </div>
              <div className="emoji-tabs">
                {Object.keys(initialEmojiData).map((category) => (
                  <button
                    type="button"
                    key={category}
                    className={`tab-btn ${currentEmojiCategory === category ? "active" : ""}`}
                    data-category={category}
                    onClick={() => filterCategory(category)}
                  >
                    {emojiCategoryLabels[category] || category}
                  </button>
                ))}
              </div>
              <div id="emojiList" className="emoji-list">
                {renderEmojis(getFilteredEmojis())}
              </div>
            </div>
          )}

          {replyingTo && (
            <div id="replyPreview" className="reply-preview">
              <div className="content">Replying to: {replyingTo.text}</div>
              <button
                type="button"
                className="pill-btn pill-btn-icon"
                onClick={cancelReply}
                aria-label="Clear reply"
                title="Clear reply"
              >
                <UiIcon name="clear" />
              </button>
            </div>
          )}
          <form className="input-container" onSubmit={handleTextSend}>
            <input
              type="file"
              id="fileInput"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              className="pill-btn pill-btn-subtle pill-btn-icon"
              onClick={() => document.getElementById("fileInput").click()}
              aria-label="Attach file"
              title="Attach file"
            >
              <UiIcon name="attach" />
            </button>
            <button
              type="button"
              id="emojiBtn"
              ref={emojiBtnRef}
              className="pill-btn pill-btn-subtle pill-btn-icon"
              onClick={toggleEmojiPicker}
              aria-label="Emoji"
              title="Emoji"
            >
              <UiIcon name="emoji" />
            </button>

            {isRecording ? (
              <div id="recordingStatus">
                <div className="dot"></div>
                <span>Recording</span>
                <span id="recordTimer">{recordTimer}</span>
              </div>
            ) : (
              <input
                type="text"
                id="messageInput"
                placeholder="Type a message..."
                autoComplete="off"
                value={messageInput}
                onChange={handleMessageInputChange}
              />
            )}

            <button
              type={hasTypedText ? "submit" : "button"}
              className={`pill-btn pill-btn-icon ${isRecording ? "recording-active" : hasTypedText ? "send-btn" : "pill-btn-subtle"}`}
              id="primaryActionBtn"
              onClick={
                isRecording || !hasTypedText ? handleVoiceAction : undefined
              }
              aria-label={
                isRecording
                  ? "Stop recording"
                  : hasTypedText
                    ? "Send message"
                    : "Start recording"
              }
              title={
                isRecording
                  ? "Stop recording"
                  : hasTypedText
                    ? "Send message"
                    : "Start recording"
              }
            >
              <UiIcon
                name={isRecording ? "stop" : hasTypedText ? "send" : "mic"}
              />
            </button>
          </form>
        </div>
      </main>

      {showAvatarOverlay && (
        <div
          id="avatarOverlay"
          className="avatar-overlay"
          onClick={toggleAvatarOverlay}
        >
          <div className="avatar-large">{activeChatInitials}</div>
        </div>
      )}

      {showSettingsModal && (
        <div id="settingsModal" className="settings-modal">
          <div className="modal-content">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "25px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "20px" }}>Profile Settings</h2>
              <button
                type="button"
                className="pill-btn pill-btn-icon"
                onClick={toggleSettingsModal}
                aria-label="Close settings"
                title="Close settings"
              >
                <UiIcon name="close" />
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  color: "var(--text-dim)",
                  fontSize: "13px",
                  marginBottom: "8px",
                }}
              >
                Display Name
              </label>
              <input
                type="text"
                id="setUserName"
                placeholder="Your Name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg-main)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "12px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  color: "var(--text-dim)",
                  fontSize: "13px",
                  marginBottom: "8px",
                }}
              >
                Initials (e.g. JD)
              </label>
              <input
                type="text"
                id="setUserInitials"
                maxLength="2"
                placeholder="GC"
                value={userInitials}
                onChange={(e) => setUserInitials(e.target.value.toUpperCase())}
                style={{
                  width: "100%",
                  background: "var(--bg-main)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "12px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  color: "var(--text-dim)",
                  fontSize: "13px",
                  marginBottom: "8px",
                }}
              >
                Theme
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="pill-btn pill-btn-theme"
                  onClick={() =>
                    setTheme((current) =>
                      current === "light" ? "dark" : "light",
                    )
                  }
                  title={
                    theme === "light"
                      ? "Switch to dark theme"
                      : "Switch to light theme"
                  }
                >
                  <UiIcon name={theme === "light" ? "moon" : "sun"} />
                  <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
                </button>
              </div>
            </div>

            <button
              onClick={saveSettings}
              style={{
                width: "100%",
                background: "var(--accent)",
                color: "white",
                border: "none",
                padding: "14px",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {selectedMessageForContext && ( // Only render if a message is selected
        <div
          id="contextMenu"
          className="context-menu"
          ref={contextMenuRef}
          style={{
            top: `${contextMenuPosition.top}px`,
            left: `${contextMenuPosition.left}px`,
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {messageMenuMode === "actions" ? (
            <>
              <button type="button" className="menu-item" onClick={handleReply}>
                Reply
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={handleCopyMessage}
              >
                Copy message
              </button>
              <button
                type="button"
                className="menu-item danger"
                onClick={openDeleteOptions}
              >
                Delete
              </button>
              <button
                type="button"
                className="menu-item cancel"
                onClick={closeContextMenu}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="menu-item danger"
                onClick={handleDeleteForMe}
              >
                Delete for me
              </button>
              <button
                type="button"
                className="menu-item danger"
                onClick={handleDeleteForEveryone}
              >
                Delete for everyone
              </button>
              <button
                type="button"
                className="menu-item cancel"
                onClick={closeContextMenu}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {showClearChatConfirmModal && (
        <div className="settings-modal" onClick={closeClearChatModal}>
          <div
            className="modal-content"
            style={{ width: "320px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, fontSize: "18px" }}>Clear chat?</h2>
            <p
              style={{
                color: "var(--text-dim)",
                fontSize: "14px",
                marginBottom: "24px",
                lineHeight: 1.5,
              }}
            >
              This will remove all messages in the current conversation.
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={closeClearChatModal}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
                  fontWeight: "600",
                  cursor: "pointer",
                  padding: "8px",
                }}
              >
                CANCEL
              </button>
              <button
                onClick={confirmClearChat}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--danger)",
                  fontWeight: "600",
                  cursor: "pointer",
                  padding: "8px",
                }}
              >
                CLEAR CHAT
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteChatConfirmModal && (
        <div className="settings-modal" onClick={closeDeleteChatModal}>
          <div
            className="modal-content"
            style={{ width: "320px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, fontSize: "18px" }}>Delete chat?</h2>
            <p
              style={{
                color: "var(--text-dim)",
                fontSize: "14px",
                marginBottom: "24px",
                lineHeight: 1.5,
              }}
            >
              This will remove the chat from your list and clear its saved
              messages.
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={closeDeleteChatModal}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
                  fontWeight: "600",
                  cursor: "pointer",
                  padding: "8px",
                }}
              >
                CANCEL
              </button>
              <button
                onClick={confirmDeleteChat}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--danger)",
                  fontWeight: "600",
                  cursor: "pointer",
                  padding: "8px",
                }}
              >
                DELETE CHAT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Separate component for Voice Message Player for better organization
const VoiceMessagePlayer = ({ src, side = "friend" }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState("0:00");

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const setAudioData = () => {
      setDuration(formatDuration(audio.duration));
    };
    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", setAudioData);
    audio.addEventListener("ended", handleEnded);
    audio.load();

    return () => {
      audio.removeEventListener("loadedmetadata", setAudioData);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, [src]);

  const togglePlay = useCallback(
    (e) => {
      e.stopPropagation(); // Prevent triggering parent message's context menu
      const audio = audioRef.current;
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    },
    [isPlaying],
  );

  return (
    <div className={`voice-message ${side}`}>
      <button
        className="play-btn"
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
      >
        <UiIcon name={isPlaying ? "pause" : "play"} />
      </button>
      <div className="voice-meta">
        <span className="voice-label">Voice message</span>
        <span className="voice-duration">{duration}</span>
      </div>
      <div className="voice-waveform">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="wave-bar"
            style={{ height: `${8 + ((i * 5) % 14)}px` }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default App;
