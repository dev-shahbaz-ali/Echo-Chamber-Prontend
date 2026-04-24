import React, { useState, useEffect } from "react";
import { BsCheck, BsX, BsClock, BsPersonAdd } from "react-icons/bs";
import toast from "react-hot-toast";

function FriendRequests({ onRequestAction, currentUser }) {
  const [requests, setRequests] = useState({ received: [], sent: [] });
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
        ? data.received.filter((request) => request?.senderId?.username)
        : [];
      const sent = Array.isArray(data.sent)
        ? data.sent.filter((request) => request?.receiverId?.username)
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

      const data = await response.json();

      if (response.ok) {
        toast.success("Friend request accepted!");
        fetchRequests();
        onRequestAction?.();
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
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-4">Loading requests...</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Received Requests */}
      {requests.received.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
            <BsPersonAdd className="mr-2" /> Received Requests (
            {requests.received.length})
          </h3>
          <div className="space-y-2">
            {requests.received.map((request) => (
              <div key={request._id} className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={request.senderId.avatar}
                    alt={request.senderId.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">
                      {request.senderId.username}
                    </h4>
                    <p className="text-xs text-gray-400">{request.message}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => acceptRequest(request._id)}
                      className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors"
                      title="Accept"
                    >
                      <BsCheck size={16} />
                    </button>
                    <button
                      onClick={() => rejectRequest(request._id)}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                      title="Reject"
                    >
                      <BsX size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent Requests */}
      {requests.sent.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
            <BsClock className="mr-2" /> Sent Requests ({requests.sent.length})
          </h3>
          <div className="space-y-2">
            {requests.sent.map((request) => (
              <div
                key={request._id}
                className="bg-gray-700 rounded-lg p-3 opacity-75"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={request.receiverId.avatar}
                    alt={request.receiverId.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">
                      {request.receiverId.username}
                    </h4>
                    <p className="text-xs text-gray-400">Request pending...</p>
                  </div>
                  <span className="text-yellow-500 text-xs">Pending</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {requests.received.length === 0 && requests.sent.length === 0 && (
        <div className="text-center text-gray-400 py-4">No friend requests</div>
      )}
    </div>
  );
}

export default FriendRequests;
