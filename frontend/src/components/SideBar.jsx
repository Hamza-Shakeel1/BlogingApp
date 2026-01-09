import { Link } from "react-router-dom";
import "./Sidebar.css";

const SideBar = ({ auth }) => {
  const user = auth.user;

  return (
    <div className="sidebar">
      <Link to="/user-profile" className="sidebar-link">
        User Profile
      </Link>

      <Link to="/posts" className="sidebar-link">
        All Posts
      </Link>

      {/* Only admin can see 'My Posts' */}
      {user?.role === "admin" && (
        <Link to="/my-posts" className="sidebar-link">
          My Posts
        </Link>
      )}

      {/* Only admin can see Admin Dashboard */}
      {user?.role === "admin" && (
        <Link to="/admin-dashboard" className="sidebar-link">
          Admin Dashboard
        </Link>
      )}
    </div>
  );
};

export default SideBar;
