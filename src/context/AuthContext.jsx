import React, { createContext, useState, useContext, useEffect } from "react";
import toast from "react-hot-toast";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// API URL
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Helper function for fetch requests
  const fetchWithConfig = async (url, options = {}) => {
    const token = localStorage.getItem("token");
    const defaultHeaders = {
      "Content-Type": "application/json",
      ...(token && { "x-auth-token": token }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: defaultHeaders,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Request failed");
    }

    return response.json();
  };

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          "x-auth-token": token,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("token");
      }
    } catch (error) {
      console.error("Error loading user:", error);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("token", data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      toast.success("Login successful!");
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.message);
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      localStorage.setItem("token", data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      toast.success("Registration successful!");
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error.message);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "x-auth-token": token,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      setIsAuthenticated(false);
      toast.success("Logged out successfully");
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        updateUser,
        fetchWithConfig,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
