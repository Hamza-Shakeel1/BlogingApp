// src/components/MyPosts.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import "./CreatePost.css";

const API_URL = "http://blogingapp-production.up.railway.app";

const MyPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    id: null,
    title: "",
    content: "",
    tags: "",
    postImage: null,
    existingImage: null,
  });

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role"); // "admin" or null

  // Only admins can access
  useEffect(() => {
    if (role === "admin") fetchPosts();
    else setLoading(false);
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_URL}/post/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setForm((prev) => ({ ...prev, postImage: e.target.files?.[0] || null }));
  };

  const resetForm = () => {
    setForm({ id: null, title: "", content: "", tags: "", postImage: null, existingImage: null });
    setShowForm(false);
  };

  const handleEdit = (post) => {
    setForm({
      id: post.id,
      title: post.title,
      content: post.content,
      tags: post.tags?.join(", ") || "",
      postImage: null,
      existingImage: post.postImage || null,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (role !== "admin") return;

    setSaving(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("content", form.content);
      // Convert tags string to array
      const tagsArray = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      formData.append("tags", JSON.stringify(tagsArray));
      if (form.postImage) formData.append("postImage", form.postImage);

      await axios.put(`${API_URL}/post/${form.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      resetForm();
      fetchPosts();
    } catch (err) {
      console.error(err);
      setError("Failed to update post");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await axios.delete(`${API_URL}/post/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPosts();
    } catch (err) {
      console.error(err);
      alert("Failed to delete post");
    }
  };

  const getImageUrl = (imageBase64) =>
    imageBase64 ? `data:image/*;base64,${imageBase64}` : null;

  if (loading) return <p>Loading posts...</p>;
  if (role !== "admin") return <p>You do not have access to this page.</p>;

  return (
    <div className="create-post-container">
      {error && <p style={{ color: "red" }}>{error}</p>}

      {showForm && (
        <form className="create-post-form" onSubmit={handleSubmit}>
          <h2>Update Post</h2>
          <input type="text" name="title" value={form.title} onChange={handleChange} required />
          <textarea name="content" value={form.content} onChange={handleChange} required />
          <input
            type="text"
            name="tags"
            value={form.tags}
            onChange={handleChange}
            placeholder="Tags (comma separated)"
          />
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {form.existingImage && !form.postImage && (
            <div style={{ marginTop: 10 }}>
              <p>Current Image:</p>
              <img src={getImageUrl(form.existingImage)} alt="current" style={{ width: "200px" }} />
            </div>
          )}
          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button type="submit" disabled={saving}>
              {saving ? "Updating..." : "Update"}
            </button>
            <button type="button" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      <h2>My Posts</h2>
      <div className="posts-list">
        {posts.length === 0 ? (
          <p>No posts found</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="post-card">
              {getImageUrl(post.postImage) ? (
                <img src={getImageUrl(post.postImage)} alt={post.title} />
              ) : (
                <div className="placeholder-image">No Image</div>
              )}
              <h3>{post.title}</h3>
              <p>{post.content.length > 50 ? post.content.slice(0, 50) + "..." : post.content}</p>
              <small>Tags: {post.tags?.join(", ")}</small>
              <div className="post-actions">
                <button onClick={() => handleEdit(post)}>Edit</button>
                <button onClick={() => handleDelete(post.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyPosts;
