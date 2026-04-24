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

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const getServerChatId = (friend) =>
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
          body: JSON.stringify({ otherUserId: friend._id || friend.id }),
        });

        const data = await response.json();
        chatId = data?._id;

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
      participants: [currentUser, friend],
      otherParticipant: {
        id: friend._id || friend.id,
        _id: friend._id || friend.id,
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
    <div>
      {/* Friends List Header */}
      <div className="flex justify-between items-center mb-3 px-3">
        <h3 className="text-sm font-semibold text-gray-400">
          Friends ({friends.length})
        </h3>
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-green-500 hover:text-green-400 text-sm"
        >
          {showSuggestions ? "Hide Suggestions" : "Find Friends"}
        </button>
      </div>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-gray-400 mb-2 px-3">Suggested Friends</h4>
          <div className="space-y-2">
            {suggestions.map((user) => (
              <div key={user._id} className="bg-gray-700 rounded-lg p-3 mx-2">
                <div className="flex items-center space-x-3">
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">
                      {user.username}
                    </h4>
                    <p className="text-xs text-gray-400 truncate">
                      {user.status}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      sendFriendRequest(
                        user._id,
                        `Hi ${user.username}, I'd like to connect!`,
                      )
                    }
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                  >
                    Add Friend
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      {friends.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <BsPersonAdd className="text-4xl mx-auto mb-2" />
          <p>No friends yet</p>
          <p className="text-sm">Click "Find Friends" to connect with others</p>
        </div>
      ) : (
        <div className="space-y-1">
          {friends.map((friend) => (
              <div
                key={friend._id}
                className={`flex items-center space-x-3 p-3 hover:bg-gray-700 cursor-pointer transition-colors ${
                selectedChatId === getServerChatId(friend)
                  ? "bg-gray-700"
                  : ""
              }`}
              onClick={() => startChat(friend)}
            >
              <div className="relative">
                <img
                  src={friend.avatar}
                  alt={friend.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {friend.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-white truncate">
                    {friend.username}
                  </h3>
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {friend.isOnline ? "Online" : "Offline"}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startChat(friend);
                }}
                className="text-green-500 hover:text-green-400"
              >
                <BsChat size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FriendsList;
