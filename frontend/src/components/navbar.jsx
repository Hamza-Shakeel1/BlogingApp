import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

const Navbar = ({ auth, setAuth }) => {
  const navigate = useNavigate();

  const isLoggedIn = !!auth.token;
  const isAdmin = auth.role === "admin";

  const handleLogout = () => {
    localStorage.clear();
    setAuth({ token: null, role: null, user: null }); // update App-level auth
    navigate("/login");
  };

  return (
    <div className="navbar">
      <h1 className="navbar-title">Blog App</h1>

      <div className="nav-right">
        <Link to="/posts" className="nav-btn">
          Posts
        </Link>

        {!isLoggedIn && (
          <>
            <Link to="/signup" className="nav-btn">Signup</Link>
            <Link to="/login" className="nav-btn">Login</Link>
          </>
        )}

        {isLoggedIn && (
          <>
            {isAdmin && (
              <Link to="/create-post" className="nav-btn">
                Add Post
              </Link>
            )}
            <button onClick={handleLogout} className="nav-btn logout-btn">
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Navbar;
