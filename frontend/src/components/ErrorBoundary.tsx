import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { safeLog } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    safeLog.error('Error boundary caught an error:', error);
    safeLog.info('Error component stack:', errorInfo?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
          <div className="text-center max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <AlertTriangle className="h-20 w-20 text-red-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-800 mb-3">Oops! Something went wrong.</h1>
            <p className="text-gray-600 text-lg mb-6">
              We're sorry for the inconvenience. Our team has been notified.
              Please try refreshing the page or contact support if the issue persists.
            </p>
            <Button
              onClick={() => window.location.reload()}
              size="lg"
            >
              Refresh Page
            </Button>
            {this.state.error && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left text-sm text-gray-700 overflow-auto max-h-48">
                <h4 className="font-semibold mb-2">Error Details:</h4>
                <p className="font-mono text-xs text-red-700 break-all">{this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="font-mono text-xs text-red-700 whitespace-pre-wrap mt-2">{this.state.error.stack}</pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}