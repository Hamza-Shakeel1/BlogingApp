import { useEffect, useState } from "react";
import axios from "axios";
import "./UserProfile.css"; // updated CSS file name

const API_URL = "http://127.0.0.1:8000";

const UserProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    password: "",
    contact: "",
    profileImage: null,
    preview: null,
  });

  const token = localStorage.getItem("token");

  // Fetch logged-in user
  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/user/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setForm((prev) => ({
        ...prev,
        name: res.data.name,
        email: res.data.email,
        role: res.data.role,
        contact: res.data.contact || "",
        preview: res.data.profileImage
          ? `data:image/jpeg;base64,${res.data.profileImage}`
          : null,
      }));
    } catch (err) {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files && files[0]) {
      setForm((prev) => ({
        ...prev,
        profileImage: files[0],
        preview: URL.createObjectURL(files[0]),
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("contact", form.contact);

    if (form.password.trim()) {
      formData.append("password", form.password);
    }

    if (form.profileImage) {
      formData.append("profileImage", form.profileImage);
    }

    try {
      await axios.put(`${API_URL}/user/me`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setSuccess("Profile updated successfully");
      setForm((prev) => ({ ...prev, password: "" }));
      fetchProfile();
    } catch (err) {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="upn-loading">Loading profile...</p>;

  return (
    <div className="upn-container">
      <h2 className="upn-header">My Profile</h2>

      {error && <p className="upn-error">{error}</p>}
      {success && <p className="upn-success">{success}</p>}

      <form onSubmit={handleSubmit} className="upn-form">
        <div className="upn-avatar-wrapper">
          {form.preview ? (
            <img src={form.preview} alt="Profile" className="upn-avatar-img" />
          ) : (
            <div className="upn-avatar-placeholder">
              {form.name[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="upn-file-input"
        />

        <input
          type="text"
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          className="upn-input"
          required
        />
        <input
          type="email"
          value={form.email}
          disabled
          className="upn-input"
        />
        <input
          type="text"
          value={form.role}
          disabled
          className="upn-input"
        />
        <input
          type="password"
          name="password"
          placeholder="New Password (optional)"
          value={form.password}
          onChange={handleChange}
          className="upn-input"
        />
        <input
          type="text"
          name="contact"
          placeholder="Contact"
          value={form.contact}
          onChange={handleChange}
          className="upn-input"
        />

        <button type="submit" disabled={saving} className="upn-button">
          {saving ? "Updating..." : "Update Profile"}
        </button>
      </form>
    </div>
  );
};

export default UserProfile;
