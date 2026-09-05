// frontend/src/components/shared/ErrorBoundary.jsx
// Day 6: React error boundary that wraps interview pages to prevent blank screens.
// Catches render errors, displays a clear message with retry/navigation options.

import React from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onNavigate) {
      this.props.onNavigate('home');
    }
  };

  render() {
    if (this.state.hasError) {
      const modeLabel = this.props.modeLabel || 'this page';
      return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
          <div className="max-w-md w-full surface-text bg-surface  rounded-xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} className="text-danger" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              Something went wrong in {modeLabel}
            </h2>
            <p className="text-sm text-text-muted">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <p className="text-xs text-text-muted">
              Your previous answers are safe. You can retry or return home.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg surface-text bg-surface-hover text-text-primary text-sm font-medium hover:bg-bg-hover  focus:outline-none focus:ring-2 focus:ring-border-strong transition-colors"
                aria-label="Retry and reload the page"
              >
                <RefreshCw size={14} /> Retry
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-text-primary text-bg-primary text-sm font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-border-strong transition-colors"
                aria-label="Return to home page"
              >
                <ArrowLeft size={14} /> Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
