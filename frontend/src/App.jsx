// src/App.jsx
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import UserProfile from "./components/UserProfile";
import CreatePost from "./components/CreatePost";
import MyPosts from "./components/MyPosts";
import SideBar from "./components/SideBar";
import Signup from "./components/Signup";
import Login from "./components/LoginForm";
import PrivateRoute from "./components/PrivateRoute";
import Navbar from "./components/navbar";

function App() {
  // Single source of truth for auth with safe localStorage parsing
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
      user = null;
    }

    return { token, role, user };
  });

  const isLoggedIn = !!auth.token;

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Navbar receives auth and setAuth */}
        <Navbar auth={auth} setAuth={setAuth} />

        <div className="app-content">
          {/* Sidebar only if logged in */}
          {isLoggedIn && <SideBar auth={auth} />}

          <div className={`main-wrapper ${isLoggedIn ? "with-sidebar-margin" : ""}`}>
            <Routes>
              {/* Public Routes */}
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login setAuth={setAuth} />} />

              {/* All Posts */}
              <Route
                path="/posts"
                element={
                  <main className={`main-content ${isLoggedIn ? "with-sidebar" : "without-sidebar"}`}>
                    <div className="content-wrapper">
                      <CreatePost />
                    </div>
                  </main>
                }
              />

              {/* My Posts (Protected) */}
              <Route
                path="/my-posts"
                element={
                  <PrivateRoute>
                    <main className="main-content with-sidebar">
                      <div className="content-wrapper">
                        <MyPosts />
                      </div>
                    </main>
                  </PrivateRoute>
                }
              />

              {/* User Profile (Protected) */}
              <Route
                path="/user-profile"
                element={
                  <PrivateRoute>
                    <main className="main-content with-sidebar">
                      <div className="content-wrapper">
                        <UserProfile />
                      </div>
                    </main>
                  </PrivateRoute>
                }
              />

              {/* Admin Create Post */}
              <Route
                path="/create-post"
                element={
                  <PrivateRoute role="admin">
                    <main className="main-content with-sidebar">
                      <div className="content-wrapper">
                        <CreatePost />
                      </div>
                    </main>
                  </PrivateRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/posts" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
