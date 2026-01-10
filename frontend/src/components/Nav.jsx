// src/components/Navbar.jsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

const Nav = ({ auth, setAuth }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const token = auth?.token;
  const role = auth?.role;

  const handleLogout = () => {
    localStorage.clear();
    setAuth({ token: null, role: null, user: null });
    navigate("/login", { replace: true });
    setMenuOpen(false);
  };

  // Helper to render links
  const NavLink = ({ to, label }) => (
    <Link
      to={to}
      className={`nav-btn ${location.pathname === to ? "active" : ""}`}
      onClick={() => setMenuOpen(false)}
    >
      {label}
    </Link>
  );

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-title">Blog App</div>

        {/* Hamburger for mobile */}
        <div
          className={`hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <div className={`nav-right ${menuOpen ? "active" : ""}`}>
        {/* Always visible */}
        <NavLink to="/posts" label="All Posts" />

        {/* Logged-in users */}
        {token && (
          <>
            <NavLink to="/my-posts" label="My Posts" />
            <NavLink to="/user-profile" label="Profile" />
            
            <button className="nav-btn logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}

        {/* Not logged-in users */}
        {!token && (
          <>
            <NavLink to="/login" label="Login" />
            <NavLink to="/signup" label="Signup" />
          </>
        )}
      </div>
    </nav>
  );
};

export default Nav;
