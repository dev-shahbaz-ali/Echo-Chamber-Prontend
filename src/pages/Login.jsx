import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const Login = ({ onSwitch }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = login(formData.email, formData.password);
    if (!success) {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="auth-container">
      <div
        className="modal-content"
        style={{
          animation:
            "messageSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.15)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h2
            style={{ margin: "0 0 8px", fontSize: "26px", fontWeight: "800" }}
          >
            Welcome Back
          </h2>
          <p style={{ color: "var(--text-dim)", fontSize: "14px" }}>
            Log in to your account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          {error && (
            <p
              style={{
                color: "var(--danger)",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}
          <div>
            <label className="input-label">Email</label>
            <div className="input-container">
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div>
            <label className="input-label">Password</label>
            <div className="input-container">
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="pill-btn send-btn"
            style={{
              width: "100%",
              height: "48px",
              marginTop: "12px",
              fontSize: "15px",
            }}
          >
            Log In
          </button>
        </form>

        <p
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "14px",
            color: "var(--text-dim)",
          }}
        >
          Don't have an account?{" "}
          <span
            className="text-link"
            onClick={onSwitch}
            style={{ cursor: "pointer" }}
          >
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
