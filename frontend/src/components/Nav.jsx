// src/components/Navbar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

const Nav = ({ auth, setAuth }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const token = auth?.token;
  const role = auth?.role;

  const handleLogout = () => {
    localStorage.clear();
    setAuth({ token: null, role: null, user: null });
    navigate("/login", { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="navbar-title">Blog App</div>

      <div className="nav-right">
        {/* ✅ ALWAYS VISIBLE */}
        <Link
          to="/posts"
          className={`nav-btn ${location.pathname === "/posts" ? "active" : ""}`}
        >
          Posts
        </Link>

        {token ? (
          <>
            <Link
              to="/my-posts"
              className={`nav-btn ${location.pathname === "/my-posts" ? "active" : ""}`}
            >
              My Posts
            </Link>

            {role === "admin" && (
              <Link
                to="/create-post"
                className={`nav-btn ${location.pathname === "/create-post" ? "active" : ""}`}
              >
                Create Post
              </Link>
            )}

            <button className="nav-btn logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
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

export default Nav;
