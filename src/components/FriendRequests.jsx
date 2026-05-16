import React, { useState, useEffect } from "react";
import { BsCheck, BsX, BsClock, BsPersonAdd } from "react-icons/bs";
import toast from "react-hot-toast";

// ✅ ADD THIS INSTEAD
const API_URL = "/api";

function FriendRequests({ onRequestAction, currentUser }) {
  const [requests, setRequests] = useState({ received: [], sent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log(
        "Fetching friend requests from:",
        `${API_URL}/friends/requests`,
      );

      const response = await fetch(`${API_URL}/friends/requests`, {
        headers: { "x-auth-token": token },
      });
      const data = await response.json();

      console.log("Friend requests response:", data);

      // Handle both possible response formats
      const received = Array.isArray(data.received)
        ? data.received.map((req) => ({
            id: req.id,
            senderId: req.senderId || req.sender_id,
            username:
              req.senderId?.username || req.sender_username || req.username,
            avatar: req.senderId?.avatar || req.sender_avatar || req.avatar,
            message: req.message,
            status: req.status,
            created_at: req.created_at,
          }))
        : [];

      const sent = Array.isArray(data.sent)
        ? data.sent.map((req) => ({
            id: req.id,
            receiverId: req.receiverId || req.receiver_id,
            username:
              req.receiverId?.username || req.receiver_username || req.username,
            avatar: req.receiverId?.avatar || req.receiver_avatar || req.avatar,
            message: req.message,
            status: req.status,
            created_at: req.created_at,
          }))
        : [];

      setRequests({ received, sent });
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load friend requests");
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      console.log(
        "Accepting request:",
        `${API_URL}/friends/request/${requestId}/accept`,
      );

      const response = await fetch(
        `${API_URL}/friends/request/${requestId}/accept`,
        {
          method: "PUT",
          headers: { "x-auth-token": token },
        },
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Friend request accepted!");
        fetchRequests();
        onRequestAction?.();
      } else {
        toast.error(data.error || data.message || "Failed to accept request");
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error("Failed to accept request");
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/friends/request/${requestId}/reject`,
        {
          method: "PUT",
          headers: { "x-auth-token": token },
        },
      );

      if (response.ok) {
        toast.success("Friend request rejected");
        fetchRequests();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to reject request");
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    }
  };

  const getAvatar = (user) => {
    if (user?.avatar) return user.avatar;
    const username = user?.username || "User";
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
  };

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-4">Loading requests...</div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900 text-white rounded-2xl overflow-hidden">
      <div className="sticky top-0 z-10 bg-zinc-900/90 backdrop-blur border-b border-zinc-800 px-4 py-4">
        <h2 className="text-lg font-bold">Friend Requests</h2>
        <p className="text-xs text-zinc-500 mt-1">
          {requests.received.length} incoming, {requests.sent.length} pending
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* RECEIVED REQUESTS */}
        {requests.received.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-green-500/10 p-2 rounded-xl">
                <BsPersonAdd className="text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Received Requests</h3>
                <p className="text-xs text-zinc-500">
                  {requests.received.length} pending
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {requests.received.map((request) => (
                <div
                  key={request.id}
                  className="group bg-zinc-800/70 border border-zinc-700 hover:border-green-500/30 rounded-2xl p-4 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <img
                        src={getAvatar(request)}
                        alt={request.username || "User"}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-zinc-700"
                      />
                      <div>
                        <h4 className="font-semibold">
                          {request.username || "User"}
                        </h4>
                        <p className="text-sm text-zinc-400 line-clamp-1">
                          {request.message || "Wants to connect with you"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => acceptRequest(request.id)}
                        className="bg-green-500 hover:bg-green-600 active:scale-95 transition-all p-3 rounded-xl shadow-lg shadow-green-500/20"
                        title="Accept"
                      >
                        <BsCheck size={18} />
                      </button>
                      <button
                        onClick={() => rejectRequest(request.id)}
                        className="bg-zinc-700 hover:bg-red-500 active:scale-95 transition-all p-3 rounded-xl"
                        title="Reject"
                      >
                        <BsX size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SENT REQUESTS */}
        {requests.sent.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-blue-500/10 p-2 rounded-xl">
                <BsClock className="text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Sent Requests</h3>
                <p className="text-xs text-zinc-500">Waiting for response</p>
              </div>
            </div>

            <div className="space-y-3">
              {requests.sent.map((request) => (
                <div
                  key={request.id}
                  className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-4 opacity-75"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={getAvatar(request)}
                      alt={request.username || "User"}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-zinc-700"
                    />
                    <div>
                      <h4 className="font-semibold">
                        {request.username || "User"}
                      </h4>
                      <p className="text-sm text-yellow-400">Pending...</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {requests.received.length === 0 && requests.sent.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="bg-zinc-800 p-5 rounded-3xl mb-4">
              <BsPersonAdd className="text-5xl text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300">
              No Friend Requests
            </h3>
            <p className="text-sm text-zinc-500 mt-2">
              Send requests to connect with others
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FriendRequests;
