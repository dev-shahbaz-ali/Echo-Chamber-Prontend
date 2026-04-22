import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  BsWhatsapp,
  BsEnvelope,
  BsLock,
  BsEye,
  BsEyeSlash,
} from "react-icons/bs";

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.email, formData.password);
    if (result.success) {
      navigate("/dashboard");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] p-4 text-white">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/10 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="text-center p-6 border-b border-white/10">
          <BsWhatsapp className="text-5xl mx-auto mb-2 text-[#25D366]" />
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-sm text-gray-300">Sign in to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm mb-2 text-gray-300">
              Email Address
            </label>
            <div className="relative">
              <BsEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                className="w-full pl-10 pr-4 py-3 bg-white/10 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366] transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm mb-2 text-gray-300">Password</label>
            <div className="relative">
              <BsLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                className="w-full pl-10 pr-10 py-3 bg-white/10 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <BsEyeSlash /> : <BsEye />}
              </button>
            </div>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#25D366] text-black font-semibold py-3 rounded-lg hover:scale-[1.02] active:scale-95 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {/* Link */}
          <div className="text-center text-sm text-gray-400">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#25D366] hover:underline">
              Create one
            </Link>
          </div>

          {/* Demo Box */}
          <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 text-center">
            Demo Accounts:
            <br />
            📧 alice@example.com / password123
            <br />
            📧 bob@example.com / password123
            <br />
            📧 charlie@example.com / password123
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
