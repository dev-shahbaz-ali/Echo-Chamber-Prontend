import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

function ChatList({ chats, onSelectChat, selectedChatId, currentUser }) {
  const getOtherParticipant = (chat) => {
    return (
      chat.otherParticipant ||
      chat.participants?.find((p) => p._id !== currentUser?.id)
    );
  };

  const formatLastMessageTime = (date) => {
    if (!date) return "";
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {chats.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <p>No chats yet</p>
          <p className="text-sm">Search for users to start chatting</p>
        </div>
      ) : (
        chats.map((chat) => {
          const otherUser = getOtherParticipant(chat);
          if (!otherUser) return null;

          return (
            <div
              key={chat._id}
              onClick={() => onSelectChat(chat)}
              className={`flex items-center space-x-3 p-3 hover:bg-gray-700 cursor-pointer transition-colors ${
                selectedChatId === chat._id ? "bg-gray-700" : ""
              }`}
            >
              <img
                src={otherUser.avatar}
                alt={otherUser.username}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-white truncate">
                    {otherUser.username}
                  </h3>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                    {formatLastMessageTime(chat.lastMessageTime)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-sm text-gray-400 truncate flex-1">
                    {chat.lastMessage || "No messages yet"}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default ChatList;
