import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider } from "./context/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginView } from "./features/auth/LoginView";
import { LandingPage } from "./features/landing/LandingPage";
import { useAuth } from "./context/AuthContext";
import { isTauri } from "./utils/platform";
import { Navigate as RouterNavigate, useLocation } from "react-router-dom";
import { RegisterView } from "./features/auth/RegisterView";
import { DashboardView } from "./features/dashboard/DashboardView";
import { WorkspaceView } from "./features/workspace/WorkspaceView";
import { SpaceWorkspace } from "./features/spatial/SpaceWorkspace";
import "./i18n";

import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";

/** Web only: public landing + auth pages for visitors, with deep links sent to the login. */
const GuestRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginView />} />
      <Route path="/register" element={<RegisterView />} />
      <Route path="*" element={<RouterNavigate to="/login" state={{ from: location }} replace />} />
    </Routes>
  );
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isHydrating } = useAuth();
  // The desktop app has no landing page: it goes straight to login or the dashboard.
  if (!isTauri()) {
    if (isHydrating) {
      return <div className="h-screen w-screen bg-app" aria-busy="true" />;
    }
    if (!isAuthenticated) return <GuestRoutes />;
  }
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginView />} />
      <Route path="/register" element={<RegisterView />} />

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
          <Route
            path="spatial"
            element={
              <div className="h-full w-full animate-fade-in">
                <SpaceWorkspace />
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
    <ToastProvider>
      <AuthProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ErrorBoundary>
      </AuthProvider>
    </ToastProvider>
  );
}
