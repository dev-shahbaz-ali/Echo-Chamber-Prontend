import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("echo_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    // Artificial delay for modern feel
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const signup = (userData) => {
    // In a real app, this would be an API call
    const newUser = { ...userData, id: Date.now() };
    localStorage.setItem("echo_user", JSON.stringify(newUser));
    setUser(newUser);
    return true;
  };

  const login = (email, password) => {
    // Simplified login simulation
    const savedUser = JSON.parse(localStorage.getItem("echo_user"));
    if (
      savedUser &&
      savedUser.email === email &&
      savedUser.password === password
    ) {
      setUser(savedUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem("echo_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signup, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
