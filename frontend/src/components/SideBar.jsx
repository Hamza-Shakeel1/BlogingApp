import { Link } from "react-router-dom";
import "./Sidebar.css";

const SideBar = ({ auth }) => {
  const user = auth?.user;

  // ❌ If user is not logged in, don't show sidebar
  if (!user) return null;

  return (
    <div className="sidebar">
      <Link to="/user-profile" className="sidebar-link">
        User Profile
      </Link>

      <Link to="/posts" className="sidebar-link">
        All Posts
      </Link>

      {/* ✅ SHOW FOR EVERY LOGGED-IN USER */}
      <Link to="/my-posts" className="sidebar-link">
        My Posts
      </Link>

      {/* ✅ ADMIN ONLY */}
      {user.role === "admin" && (
        <Link to="/admin-dashboard" className="sidebar-link">
          Admin Dashboard
        </Link>
      )}
    </div>
  );
};

export default SideBar;
