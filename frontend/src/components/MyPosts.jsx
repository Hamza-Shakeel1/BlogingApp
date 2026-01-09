import { useEffect, useState } from "react";
import axios from "axios";
import "./CreatePost.css";

const API_URL = "https://blogingapp-production.up.railway.app";

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

  // Fetch posts for admin or user
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_URL}/admin/post`, {
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

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setForm((prev) => ({ ...prev, postImage: e.target.files?.[0] || null }));
  };

  const resetForm = () => {
    setForm({
      id: null,
      title: "",
      content: "",
      tags: "",
      postImage: null,
      existingImage: null,
    });
    setShowForm(false);
  };

  // Edit post
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

  // Update post
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("content", form.content);
      formData.append("tags", form.tags);
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

  // Delete post
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

  if (loading) return <p>Loading posts...</p>;

  return (
    <div className="create-post-container">
      {error && <p style={{ color: "red" }}>{error}</p>}

      {showForm ? (
        <form className="create-post-form" onSubmit={handleSubmit}>
          <h2>Update Post</h2>
          <input
            type="text"
            name="title"
            placeholder="Title"
            value={form.title}
            onChange={handleChange}
            required
          />
          <textarea
            name="content"
            placeholder="Content"
            value={form.content}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="tags"
            placeholder="Tags (comma separated)"
            value={form.tags}
            onChange={handleChange}
          />
          <input type="file" accept="image/*" onChange={handleFileChange} />

          {form.existingImage && !form.postImage && (
            <div style={{ marginTop: 10 }}>
              <p>Current Image:</p>
              <img
                src={`data:image/*;base64,${form.existingImage}`}
                alt="current"
                style={{ width: "200px" }}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: 10 }}>
            <button type="submit" disabled={saving}>
              {saving ? "Updating..." : "Update"}
            </button>
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <h2>My Posts</h2>
          <div className="posts-list">
            {posts.length === 0 ? (
              <p>No posts yet.</p>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="post-card">
                  <h3>{post.title}</h3>
                  <p>{post.content}</p>
                  <small>Tags: {post.tags?.join(", ")}</small>
                  {post.postImage && (
                    <img
                      src={`data:image/*;base64,${post.postImage}`}
                      alt={post.title}
                      style={{ width: "200px" }}
                    />
                  )}
                  <div className="post-actions">
                    <button onClick={() => handleEdit(post)}>Edit</button>
                    <button onClick={() => handleDelete(post.id)}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MyPosts;
