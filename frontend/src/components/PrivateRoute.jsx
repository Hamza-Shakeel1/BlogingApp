import React from "react";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children, role: requiredRole }) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;

  // Role check (case-insensitive)
  if (requiredRole && role?.toLowerCase() !== requiredRole.toLowerCase())
    return <Navigate to="/login" replace />;

  return children;
};

export default PrivateRoute;
