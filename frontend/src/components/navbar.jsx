// src/components/Navbar.jsx
import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const location = useLocation();
  const token = localStorage.getItem("token"); // check if user is logged in

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <nav className="navbar">
      <div className="navbar-title">Blog App</div>
      <div className="nav-right">
        {token ? (
          // Logged in buttons
          <>
            <Link
              to="/post"
              className={`nav-btn ${location.pathname === "/myposts" ? "active" : ""}`}
            >
              Posts
            </Link>

            <Link
              to="/create-post"
              className={`nav-btn ${location.pathname === "/create-post" ? "active" : ""}`}
            >
              Create Post
            </Link>

            <button className="nav-btn logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          // Not logged in buttons
          <>
            <Link
              to="/login"
              className={`nav-btn ${location.pathname === "/login" ? "active" : ""}`}
            >
              Login
            </Link>

            <Link
              to="/signup"
              className={`nav-btn ${location.pathname === "/signup" ? "active" : ""}`}
            >
              Signup
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
