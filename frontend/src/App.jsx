// src/App.jsx
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Nav from "./components/Nav";
import Sidebar from "./components/Sidebar";
import Login from "./components/LoginForm";
import Signup from "./components/Signup";
import UserProfile from "./components/UserProfile";
import CreatePost from "./components/CreatePost";
import MyPosts from "./components/MyPosts";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  // Central auth state with localStorage
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    let user = null;

    try {
      const userStr = localStorage.getItem("user");
      if (userStr && userStr !== "undefined") {
        user = JSON.parse(userStr);
      }
    } catch (err) {
      console.warn("Error parsing user from localStorage:", err);
    }

    return { token, role, user };
  });

  const isLoggedIn = !!auth?.token;

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Navbar */}
        <Nav auth={auth} setAuth={setAuth} />

        {/* Layout: Sidebar + main content */}
        <div className="app-content" style={{ display: "flex" }}>
          {isLoggedIn && <Sidebar auth={auth} />}

          <div
            className="main-wrapper"
            style={{ flexGrow: 1, padding: "20px" }}
          >
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login setAuth={setAuth} />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected */}
              <Route
                path="/user-profile"
                element={
                  <PrivateRoute auth={auth}>
                    <UserProfile auth={auth} />
                  </PrivateRoute>
                }
              />
              <Route
                path="/posts"
                element={
                  <PrivateRoute auth={auth}>
                    <CreatePost auth={auth} />
                  </PrivateRoute>
                }
              />
              <Route
                path="/my-posts"
                element={
                  <PrivateRoute auth={auth}>
                    <MyPosts auth={auth} />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-post"
                element={
                  <PrivateRoute auth={auth} role="admin">
                    <CreatePost auth={auth} />
                  </PrivateRoute>
                }
              />

              {/* Fallback */}
              <Route
                path="*"
                element={<Navigate to={isLoggedIn ? "/posts" : "/login"} replace />}
              />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
