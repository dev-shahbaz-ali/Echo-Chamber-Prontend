import React, { useState, useEffect } from "react";
import { BsCheck, BsX, BsClock, BsPersonAdd } from "react-icons/bs";
import toast from "react-hot-toast";

function FriendRequests({ onRequestAction, currentUser }) {
  const [requests, setRequests] = useState({ received: [], sent: [] });
  const [loading, setLoading] = useState(true);

  const API_URL = "/api";

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/friends/requests`, {
        headers: { "x-auth-token": token },
      });
      const data = await response.json();

      const received = Array.isArray(data.received)
        ? data.received.filter(
            (request) => request?.username || request?.senderId?.username,
          )
        : [];
      const sent = Array.isArray(data.sent)
        ? data.sent.filter(
            (request) => request?.username || request?.receiverId?.username,
          )
        : [];

      setRequests({
        received,
        sent,
      });
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/friends/request/${requestId}/accept`,
        {
          method: "PUT",
          headers: { "x-auth-token": token },
        },
      );

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.ok) {
        toast.success("Friend request accepted!");
        fetchRequests();
        onRequestAction?.();
      } else {
        toast.error(data.error || data.message || "Failed to accept request");
        console.error("Accept request failed:", {
          requestId,
          status: response.status,
          statusText: response.statusText,
          data,
        });
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
        let data = {};
        try {
          data = await response.json();
        } catch {
          data = {};
        }
        toast.error(data.error || data.message || "Failed to reject request");
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    }
  };

  // Helper function to get avatar with fallback
  const getAvatar = (user) => {
    if (user?.avatar) {
      return user.avatar;
    }
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
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-900/90 backdrop-blur border-b border-zinc-800 px-4 py-4">
        <h2 className="text-lg font-bold">Friend Requests</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Manage incoming and outgoing requests
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* RECEIVED REQUESTS */}
        {requests.received.length > 0 && (
          <div key="received-section">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-green-500/10 p-2 rounded-xl">
                <BsPersonAdd className="text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Received Requests</h3>
                <p className="text-xs text-zinc-500">
                  {requests.received.length} pending requests
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {requests.received.map((request) => {
                const user = request.senderId || request;
                const avatarUrl = getAvatar(user);
                const requestKey =
                  request.id ||
                  request._id ||
                  `received-${user.id || user._id}`;

                return (
                  <div
                    key={requestKey}
                    className="group bg-zinc-800/70 border border-zinc-700 hover:border-green-500/30 rounded-2xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/5"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <img
                          src={avatarUrl}
                          alt={user.username || "User"}
                          className="w-14 h-14 rounded-full object-cover ring-2 ring-zinc-700"
                          onError={(e) => {
                            e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || "User"}`;
                          }}
                        />
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-zinc-900" />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            acceptRequest(request.id || request._id)
                          }
                          className="bg-green-500 hover:bg-green-600 active:scale-95 transition-all p-3 rounded-xl shadow-lg shadow-green-500/20"
                          title="Accept Request"
                        >
                          <BsCheck size={18} />
                        </button>
                        <button
                          onClick={() =>
                            rejectRequest(request.id || request._id)
                          }
                          className="bg-zinc-700 hover:bg-red-500 active:scale-95 transition-all p-3 rounded-xl"
                          title="Reject Request"
                        >
                          <BsX size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {requests.received.length === 0 && requests.sent.length === 0 && (
          <div
            key="empty-state"
            className="flex flex-col items-center justify-center text-center py-20"
          >
            <div className="bg-zinc-800 p-5 rounded-3xl mb-4">
              <BsPersonAdd className="text-5xl text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300">
              No Friend Requests
            </h3>
            <p className="text-sm text-zinc-500 mt-2 max-w-xs">
              When someone sends you a request, it will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FriendRequests;
