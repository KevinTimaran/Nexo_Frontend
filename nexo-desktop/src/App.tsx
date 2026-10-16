import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./app/providers/ThemeProvider";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider } from "./context/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginView } from "./features/auth/LoginView";
import { DashboardView } from "./features/dashboard/DashboardView";
import { WorkspaceView } from "./features/workspace/WorkspaceView";
import "./i18n";

import { ProtectedRoute } from "./features/auth/ProtectedRoute";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Route */}
      <Route path="/login" element={<LoginView />} />

      {/* Protected Desktop Application Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<AppLayout />}>
          <Route
            index
            element={
              <div className="h-full w-full animate-fade-in">
                <DashboardView />
              </div>
            }
          />
          <Route
            path="workspace/:projectId"
            element={
              <div className="h-full w-full animate-fade-in">
                <WorkspaceView />
              </div>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
