// FriendsList.jsx - Updated with correct API URL
import React, { useState, useEffect } from "react";
import { BsChat, BsPersonAdd } from "react-icons/bs";
import toast from "react-hot-toast";

// ✅ Use environment variable
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function FriendsList({
  onSelectChat,
  selectedChatId,
  currentUser,
  refreshKey,
}) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    fetchFriends();
    fetchSuggestions();
  }, [refreshKey]);

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("Fetching friends from:", `${API_URL}/friends`);

      const response = await fetch(`${API_URL}/friends`, {
        headers: { "x-auth-token": token },
      });
      const data = await response.json();

      console.log("Friends response:", data);
      setFriends(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching friends:", error);
      toast.error("Failed to load friends");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/friends/suggestions`, {
        headers: { "x-auth-token": token },
      });
      const data = await response.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const sendFriendRequest = async (receiverId, message) => {
    try {
      const token = localStorage.getItem("token");
      console.log("Sending request to:", `${API_URL}/friends/request`);

      const response = await fetch(`${API_URL}/friends/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({ receiverId, message }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Friend request sent!");
        fetchSuggestions();
      } else {
        toast.error(data.error || "Failed to send request");
      }
    } catch (error) {
      console.error("Error sending request:", error);
      toast.error("Failed to send friend request");
    }
  };

  const startChat = async (friend) => {
    try {
      const token = localStorage.getItem("token");

      // Create or get chat
      const response = await fetch(`${API_URL}/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({ otherUserId: friend.id || friend.friend_id }),
      });

      const data = await response.json();

      if (response.ok && data) {
        const chatObject = {
          _id: data.id || data.chatId,
          participants: [currentUser, friend],
          otherParticipant: friend,
        };
        onSelectChat(chatObject);
      } else {
        toast.error("Cannot open chat yet");
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      toast.error("Failed to start chat");
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-4">Loading friends...</div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900 text-white">
      <div className="sticky top-0 z-10 bg-zinc-900/90 backdrop-blur border-b border-zinc-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Friends</h2>
            <p className="text-xs text-zinc-500">{friends.length} connected</p>
          </div>

          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="bg-green-500 hover:bg-green-600 transition-all px-3 py-2 rounded-xl text-sm font-medium shadow-lg shadow-green-500/20"
          >
            {showSuggestions ? "Close" : "Find Friends"}
          </button>
        </div>
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="p-3 border-b border-zinc-800 bg-zinc-900/40">
          <h3 className="text-sm font-semibold text-zinc-400 mb-3">
            Suggested Friends
          </h3>

          <div className="space-y-3">
            {suggestions.map((user) => (
              <div
                key={user.id || user._id}
                className="bg-zinc-800/80 border border-zinc-700 rounded-2xl p-3 hover:border-green-500/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      user.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
                    }
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-zinc-700"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{user.username}</h4>
                    <p className="text-xs text-zinc-400 truncate">
                      {user.status || "Available to chat"}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      sendFriendRequest(
                        user.id,
                        `Hi ${user.username}, I'd like to connect!`,
                      )
                    }
                    className="bg-green-500 hover:bg-green-600 active:scale-95 transition-all px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
        {friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-zinc-500 py-20">
            <BsPersonAdd className="text-5xl mb-4 opacity-40" />
            <h3 className="text-lg font-semibold text-zinc-300">
              No friends yet
            </h3>
            <p className="text-sm mt-1">Click "Find Friends" to connect</p>
          </div>
        ) : (
          friends.map((friend) => (
            <div
              key={friend.id || friend.friend_id}
              onClick={() => startChat(friend)}
              className="group relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 border bg-zinc-800/40 border-transparent hover:bg-zinc-800 hover:border-zinc-700"
            >
              <div className="relative">
                <img
                  src={
                    friend.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`
                  }
                  alt={friend.username}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-zinc-700"
                />
                {friend.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-zinc-900" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold truncate">{friend.username}</h3>
                  {friend.isOnline && (
                    <span className="text-[10px] text-green-400 font-medium">
                      ONLINE
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400 truncate">
                  {friend.status || "Hey there 👋"}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startChat(friend);
                }}
                className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-zinc-700 hover:bg-green-500 p-2 rounded-xl"
              >
                <BsChat size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default FriendsList;
