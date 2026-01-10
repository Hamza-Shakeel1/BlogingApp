// src/components/MyPosts.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import "./CreatePost.css";

const API_URL = "https://bloging-app-beryl.vercel.app";

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
  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    if (token) fetchPosts();
    else setLoading(false);
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/post/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(res.data);
    } catch {
      setError("Failed to fetch posts");
    } finally {
      setLoading(false);
    }
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

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this post?")) return;
    await axios.delete(`${API_URL}/post/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchPosts();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("content", form.content);
    formData.append(
      "tags",
      JSON.stringify(form.tags.split(",").map(t => t.trim()).filter(Boolean))
    );
    if (form.postImage) formData.append("postImage", form.postImage);

    await axios.put(`${API_URL}/post/${form.id}`, formData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setShowForm(false);
    fetchPosts();
    setSaving(false);
  };

  if (!token) return <p>Please login to view your posts.</p>;
  if (loading) return <p>Loading...</p>;

  return (
    <div className="create-post-container">
      <h2>My Posts</h2>

      {showForm && (
        <form className="create-post-form" onSubmit={handleSubmit}>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
          <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
          <button type="submit">{saving ? "Updating..." : "Update"}</button>
        </form>
      )}

      <div className="posts-list">
        {posts.length === 0 ? (
          <p>No posts found</p>
        ) : (
          posts.map(post => (
            <div key={post.id} className="post-card">
              <h3>{post.title}</h3>
              <p>{post.content}</p>

              {/* ✅ EDIT / DELETE ONLY FOR OWNER */}
              {user?.id === post.userId && (
                <div className="post-actions">
                  <button onClick={() => handleEdit(post)}>Edit</button>
                  <button onClick={() => handleDelete(post.id)}>Delete</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyPosts;
