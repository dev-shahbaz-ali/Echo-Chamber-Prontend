// FriendsList.jsx - Fixed version
import React, { useState, useEffect } from "react";
import { BsChat, BsThreeDotsVertical, BsPersonAdd } from "react-icons/bs";
import toast from "react-hot-toast";

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

  const API_URL = "/api";

  const getServerChatId = (friend) =>
    friend.chat_id ||
    friend.chatId?._id ||
    friend.chatId ||
    friend.conversationId?._id ||
    friend.conversationId ||
    friend.chat?._id ||
    friend.chat ||
    null;

  useEffect(() => {
    fetchFriends();
    fetchSuggestions();
  }, [refreshKey]);

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/friends`, {
        headers: { "x-auth-token": token },
      });
      const data = await response.json();
      setFriends(data);
    } catch (error) {
      console.error("Error fetching friends:", error);
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
      setSuggestions(data);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const sendFriendRequest = async (receiverId, message) => {
    try {
      const token = localStorage.getItem("token");
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
    let chatId = getServerChatId(friend);

    if (!chatId) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/chats`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token,
          },
          body: JSON.stringify({ otherUserId: friend.id }), // Use friend.id for consistency
        });

        const data = await response.json();
        chatId = data?.chatId || data?.id || data?._id;

        if (!response.ok || !chatId) {
          toast.error(data.error || data.message || "Cannot open chat yet.");
          console.error("Failed to create or load chat:", {
            friend,
            status: response.status,
            data,
          });
          return;
        }
      } catch (error) {
        console.error("Error creating chat:", error);
        toast.error("Cannot open chat yet. Please try again.");
        return;
      }
    }

    const chatObject = {
      _id: chatId,
      participants: [
        {
          id: currentUser.id,
          username: currentUser.username,
          avatar: currentUser.avatar,
        },
        friend,
      ], // Ensure currentUser.id is used
      otherParticipant: {
        id: friend.id, // Use friend.id for consistency
        _id: friend.id, // Keep _id for potential legacy compatibility if needed, but id is primary
        username: friend.username,
        avatar: friend.avatar,
        isOnline: friend.isOnline || false,
        status: friend.status || "Hey there! I am using WhatsApp",
      },
    };

    console.log("Starting chat with:", chatObject);
    onSelectChat(chatObject);
  };

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-4">Loading friends...</div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900 text-white">
      {/* Header */}
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
                    src={user.avatar}
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
                        user.id || user._id,
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

            <p className="text-sm mt-1">Start connecting with people</p>
          </div>
        ) : (
          friends.map((friend) => {
            const isSelected = selectedChatId === getServerChatId(friend);

            return (
              <div
                key={friend.id || friend._id}
                onClick={() => startChat(friend)}
                className={`
                group relative flex items-center gap-3 p-3 rounded-2xl
                cursor-pointer transition-all duration-200
                border
                ${
                  isSelected
                    ? "bg-green-500/10 border-green-500/40 shadow-lg shadow-green-500/10"
                    : "bg-zinc-800/40 border-transparent hover:bg-zinc-800 hover:border-zinc-700"
                }
              `}
              >
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={friend.avatar}
                    alt={friend.username}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-zinc-700"
                  />

                  {friend.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-zinc-900" />
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold truncate">
                      {friend.username}
                    </h3>

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

                {/* Chat Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startChat(friend);
                  }}
                  className="
                  opacity-0 group-hover:opacity-100
                  transition-all duration-200
                  bg-zinc-700 hover:bg-green-500
                  p-2 rounded-xl
                "
                >
                  <BsChat size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default FriendsList;
