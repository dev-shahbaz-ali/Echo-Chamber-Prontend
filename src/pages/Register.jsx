import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  BsWhatsapp,
  BsPerson,
  BsEnvelope,
  BsPhone,
  BsLock,
  BsEye,
  BsEyeSlash,
} from "react-icons/bs";

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    const err = {};

    if (formData.username.length < 3)
      err.username = "Min 3 characters required";

    if (!formData.email.includes("@")) err.email = "Invalid email address";

    if (!formData.phone) err.phone = "Phone required";

    if (formData.password.length < 6)
      err.password = "Min 6 characters required";

    if (formData.password !== formData.confirmPassword)
      err.confirmPassword = "Passwords do not match";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const result = await register({
      username: formData.username,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
    });

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
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-sm text-gray-300">Sign up to get started</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Username */}
          <div>
            <div className="relative">
              <BsPerson className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Username"
                className="w-full pl-10 pr-4 py-3 bg-white/10 rounded-lg focus:ring-2 focus:ring-[#25D366] outline-none"
              />
            </div>
            {errors.username && (
              <p className="text-red-400 text-xs mt-1">{errors.username}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <div className="relative">
              <BsEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className="w-full pl-10 pr-4 py-3 bg-white/10 rounded-lg focus:ring-2 focus:ring-[#25D366] outline-none"
              />
            </div>
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <div className="relative">
              <BsPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone Number"
                className="w-full pl-10 pr-4 py-3 bg-white/10 rounded-lg focus:ring-2 focus:ring-[#25D366] outline-none"
              />
            </div>
            {errors.phone && (
              <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="relative">
              <BsLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full pl-10 pr-10 py-3 bg-white/10 rounded-lg focus:ring-2 focus:ring-[#25D366] outline-none"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <BsEyeSlash /> : <BsEye />}
              </button>
            </div>

            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <div className="relative">
              <BsLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
                className="w-full pl-10 pr-4 py-3 bg-white/10 rounded-lg focus:ring-2 focus:ring-[#25D366] outline-none"
              />
            </div>

            {errors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#25D366] text-black font-semibold py-3 rounded-lg hover:scale-[1.02] active:scale-95 transition disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          {/* Login link */}
          <div className="text-center text-sm text-gray-300">
            Already have an account?{" "}
            <Link to="/login" className="text-[#25D366] hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;
