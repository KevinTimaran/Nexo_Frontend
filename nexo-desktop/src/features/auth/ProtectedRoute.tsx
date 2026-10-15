import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Sparkles } from "lucide-react";

/**
 * ProtectedRoute: Guarantees that only authenticated users can access
 * internal application views (Dashboard, Workspace, Document Generator).
 *
 * Preserves the user's intended destination path via React Router `state.from`
 * so after successful login they are automatically returned to their target project.
 */
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-app text-fg">
        <div className="w-12 h-12 rounded-2xl bg-concept-fg/10 text-concept-fg flex items-center justify-center mb-4 border border-concept-fg/20 shadow-sm animate-pulse">
          <Sparkles className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-caption font-medium text-muted tracking-wide">
          Verificando sesión en Nexo Desktop…
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
