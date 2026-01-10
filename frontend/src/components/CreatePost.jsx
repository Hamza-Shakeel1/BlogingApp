// src/components/CreatePost.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import "./CreatePost.css";

const API_URL = "https://bloging-app-beryl.vercel.app";


const CreatePost = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    tags: "",
    postImage: null,
  });

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role"); // "admin" or null

  // Fetch all posts
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_URL}/post`);
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
    setForm({ title: "", content: "", tags: "", postImage: null });
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (role !== "admin") return; // only admin can submit

    setSaving(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("content", form.content);
      formData.append("tags", form.tags);
      if (form.postImage) formData.append("postImage", form.postImage);

      await axios.post(`${API_URL}/post/create`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      resetForm();
      fetchPosts();
    } catch (err) {
      console.error(err);
      setError("Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  const getImageUrl = (post) =>
    post?.postImage ? `data:image/*;base64,${post.postImage}` : null;

  if (loading) return <p>Loading posts...</p>;

  return (
    <div className="create-post-container">
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Create Post Form - Admin Only */}
      {showForm && role === "admin" && (
        <form className="create-post-form" onSubmit={handleSubmit}>
          <h2>Create Post</h2>
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
          <div className="form-buttons">
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create"}
            </button>
            <button type="button" onClick={resetForm}>
              Back
            </button>
          </div>
        </form>
      )}

      {/* Posts List */}
      <h2>All Posts</h2>
      <div className="posts-list">
        {posts.length === 0 ? (
          <p>No posts found</p>
        ) : (
          posts
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((post) => (
              <div key={post.id} className="post-card">
                {getImageUrl(post) ? (
                  <img src={getImageUrl(post)} alt={post.title} />
                ) : (
                  <div className="placeholder-image">No Image</div>
                )}
                <h3>{post.title}</h3>
                <p>{post.content.length > 50 ? post.content.slice(0, 50) + "..." : post.content}</p>
                <small>Tags: {post.tags?.join(", ")}</small>
              </div>
            ))
        )}
      </div>

      {/* Add Post Button - Admin Only */}
      {!showForm && role === "admin" && (
        <button className="add-post-button" onClick={() => setShowForm(true)}>
          +
        </button>
      )}
    </div>
  );
};

export default CreatePost;
