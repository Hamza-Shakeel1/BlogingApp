// src/components/SideBar.jsx
import { Link } from "react-router-dom";
import "./Sidebar.css";

const SideBar = ({ auth }) => {
  const user = auth?.user;

  if (!user) return null;

  return (
    <div className="sidebar">
      <Link to="/user-profile" className="sidebar-link">
        User Profile
      </Link>

      <Link to="/posts" className="sidebar-link">
        All Posts
      </Link>

      <Link to="/my-posts" className="sidebar-link">
        My Posts
      </Link>

      {user.role === "admin" && (
        <Link to="/create-post" className="sidebar-link">
          Create Post
        </Link>
      )}
    </div>
  );
};

export default SideBar;
