import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly title?: string;
  readonly fallbackDescription?: string;
  readonly onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Widget-level Error Boundary with retry capability (§4.2, §13.3).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      const {
        title = 'Não foi possível carregar este componente',
        fallbackDescription = 'Ocorreu um erro inesperado ao processar os dados. Tente novamente.',
      } = this.props;

      return (
        <div
          role="alert"
          className="bg-bg-card border border-error/40 rounded-2xl p-6 flex flex-col items-start gap-3 shadow-sm"
        >
          <div className="flex items-center gap-2.5 text-error font-semibold text-base">
            <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{title}</span>
          </div>
          <p className="text-sm text-text-secondary">{fallbackDescription}</p>
          {this.state.error?.message && (
            <p className="text-xs font-mono text-text-muted bg-bg-elevated px-2.5 py-1 rounded">
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-1 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-text-inverse hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
