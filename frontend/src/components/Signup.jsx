import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Signup.css";

const API_URL = "https://blogingapp-production.up.railway.app";


export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    contact: "",
    role: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", form.fullName);
      formData.append("email", form.email);
      formData.append("password", form.password);
      formData.append("role", form.role);
      formData.append("contact", form.contact || "");

      const res = await axios.post(`${API_URL}/signup`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      localStorage.setItem("token", res.data.access_token || "");
      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("userId", res.data.user.id);

      setLoading(false);
      alert(res.data.message);

      if (res.data.user.role === "admin") {
        navigate("/admin-dashboard");
      } else {
        navigate("/posts");
      }
    } catch (err) {
      setLoading(false);
      alert(err.response?.data?.detail || "Signup failed");
    }
  };

  return (
    <div className="register-page">
      <div className="register-wrapper">
        <div className="register-card">
          <div className="card-inner">
            <h1 className="title-main">Create Account</h1>
            <p className="subtitle-main">Join us today and start your journey</p>

            <div className="form-block">
              {/* Full Name */}
              <div className="field-group">
                <label className="field-label">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="John Doe"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                  className="field-input"
                />
              </div>

              {/* Contact */}
              <div className="field-group">
                <label className="field-label">Contact</label>
                <input
                  type="text"
                  name="contact"
                  placeholder="+1 234 567 8900"
                  value={form.contact}
                  onChange={handleChange}
                  className="field-input"
                />
              </div>

              {/* Email */}
              <div className="field-group">
                <label className="field-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="field-input"
                />
              </div>

              {/* Password */}
              <div className="field-group">
                <label className="field-label">Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="field-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="toggle-password"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div className="field-group">
                <label className="field-label">Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  required
                  className="field-select"
                >
                  <option value="">Select Role</option>
                  <option value="user">User</option>
                  {/* <option value="admin">Admin</option> */}
                </select>
              </div>

              {/* Submit */}
              <div className="btn-wrapper">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-submit"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </div>

              {/* Sign in */}
              <p className="signin-note">
                Already have an account?{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="signin-btn"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
