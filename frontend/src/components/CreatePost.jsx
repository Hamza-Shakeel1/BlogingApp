// src/components/CreatePost.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import "./CreatePost.css";

// ✅ Correct backend URL
const API_URL = "https://blogingapp-production.up.railway.app";

const CreatePost = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);

  const [form, setForm] = useState({
    title: "",
    content: "",
    tags: "",
    postImage: null,
  });

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // 🔹 Fetch all posts
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

  // 🔹 Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setForm((prev) => ({
      ...prev,
      postImage: e.target.files?.[0] || null,
    }));
  };

  const resetForm = () => {
    setForm({
      title: "",
      content: "",
      tags: "",
      postImage: null,
    });
    setShowForm(false);
  };

  // 🔹 Submit post
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

      await axios.post(`${API_URL}/post/create`, formData, {
        headers: { Authorization: `Bearer ${token}` },
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

  // 🔹 Select post for modal
  const handlePostClick = (post) => {
    setSelectedPost(post);
  };

  if (loading) return <p>Loading posts...</p>;

  // 🔹 Filter posts by search
  const filteredPosts = posts
    .filter((post) => {
      const query = searchQuery.toLowerCase();
      const titleMatch = post.title?.toLowerCase().includes(query);
      const tagsMatch = post.tags?.some((tag) =>
        tag.toLowerCase().includes(query)
      );
      return titleMatch || tagsMatch;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // 🔹 Convert base64 image to URL
  const getImageUrl = (post) => {
    if (!post || !post.postImage) return null;
    return `data:image/*;base64,${post.postImage}`;
  };

  return (
    <div className="create-post-container">
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* 🔹 Create Post Form */}
      {showForm ? (
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
      ) : (
        <>
          {/* 🔹 Search */}
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by title or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <h2>Posts</h2>
          <div className="posts-list">
            {filteredPosts.length === 0 ? (
              <p>No posts found</p>
            ) : (
              filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="post-card"
                  onClick={() => handlePostClick(post)}
                >
                  {post.postImage ? (
                    <img src={getImageUrl(post)} alt={post.title} />
                  ) : (
                    <div className="placeholder-image">No Image</div>
                  )}
                  <h3>{post.title}</h3>
                  <p className="post-content">
                    {post.content.length > 50
                      ? post.content.slice(0, 50) + "..."
                      : post.content}
                  </p>
                  <small>Tags: {post.tags?.join(", ")}</small>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* 🔹 Add Post Button */}
      {!showForm && role === "admin" && (
        <button
          className="add-post-button"
          onClick={() => setShowForm(true)}
        >
          +
        </button>
      )}

      {/* 🔹 Modal */}
      {selectedPost && (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedPost.postImage ? (
              <img
                src={getImageUrl(selectedPost)}
                alt={selectedPost.title}
                className="modal-image"
              />
            ) : (
              <div className="placeholder-image">No Image</div>
            )}
            <h2>{selectedPost.title}</h2>
            <p>{selectedPost.content}</p>
            <p>Tags: {selectedPost.tags?.join(", ")}</p>
            <button onClick={() => setSelectedPost(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePost;
