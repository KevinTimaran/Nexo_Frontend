import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginView } from "./features/auth/LoginView";
import { DashboardView } from "./features/dashboard/DashboardView";
import { WorkspaceView } from "./features/workspace/WorkspaceView";
import "./i18n";

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-app text-fg">
        <div className="flex items-center gap-2 text-caption text-muted">
          <span className="w-2 h-2 rounded-full bg-concept-fg animate-ping" />
          Loading Nexo Desktop…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route
          index
          element={
            <DashboardView
              onOpenNewProject={() => {
                // Handled in layout command modal
              }}
            />
          }
        />
        <Route path="workspace/:projectId" element={<WorkspaceView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <ThemeProvider defaultTheme="system">
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
