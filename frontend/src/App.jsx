// src/App.jsx
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Nav";
import SideBar from "./components/SideBar";
import Signup from "./components/Signup";
import Login from "./components/LoginForm";
import UserProfile from "./components/UserProfile";
import MyPosts from "./components/MyPosts";
import CreatePost from "./components/CreatePost";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    let user = null;

    try {
      const userStr = localStorage.getItem("user");
      if (userStr && userStr !== "undefined") user = JSON.parse(userStr);
    } catch {
      user = null;
    }

    return { token, role, user };
  });

  const isLoggedIn = !!auth.token;

  return (
    <BrowserRouter>
      <Navbar auth={auth} setAuth={setAuth} />

      <div className="app-content">
        {isLoggedIn && <SideBar auth={auth} />}

        <div className={`main-wrapper ${isLoggedIn ? "with-sidebar-margin" : ""}`}>
          <Routes>
            {/* Public */}
            <Route path="/posts" element={<CreatePost />} />
            <Route path="/login" element={<Login setAuth={setAuth} />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected */}
            <Route
              path="/my-posts"
              element={
                <PrivateRoute>
                  <MyPosts />
                </PrivateRoute>
              }
            />

            <Route
              path="/user-profile"
              element={
                <PrivateRoute>
                  <UserProfile />
                </PrivateRoute>
              }
            />

            <Route
              path="/create-post"
              element={
                <PrivateRoute role="admin">
                  <CreatePost />
                </PrivateRoute>
              }
            />

            <Route path="*" element={<Navigate to="/posts" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
