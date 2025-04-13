// src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import Layout from "./Layout";

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  isAuthenticated,
  redirectPath = "/",
}) => {
  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default ProtectedRoute;
