import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-app text-fg select-none" role="alert">
          <div className="max-w-md w-full p-8 rounded-3xl glass-card border border-risk-fg/30 shadow-2xl flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-risk-fg/10 text-risk-fg border border-risk-fg/20 flex items-center justify-center shadow-md">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-fg">Algo no salió como esperábamos</h2>
              <p className="text-caption text-muted leading-relaxed">
                Se produjo un problema al renderizar este espacio. Puedes recargar o volver a tus proyectos.
              </p>
            </div>

            {this.state.error?.message && (
              <details className="w-full rounded-xl bg-sunken border border-line-soft text-left">
                <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-muted focus-ring rounded-xl">Detalles técnicos</summary>
                <div className="px-3 pb-3 font-mono text-[11px] text-muted overflow-x-auto max-h-28">{this.state.error.message}</div>
              </details>
            )}

            <div className="flex items-center gap-3 pt-2 w-full">
              <Button
                variant="glass"
                className="flex-1"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => window.location.reload()}
              >
                Recargar
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                icon={<Home className="w-4 h-4" />}
                onClick={this.handleReset}
              >
                Proyectos
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

