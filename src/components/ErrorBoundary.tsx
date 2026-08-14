import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070a0e] text-slate-100 flex items-center justify-center p-6">
          <div className="bg-[#0e1319] border border-[#1d2631] rounded-lg p-6 max-w-md w-full text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">终端显示异常</h2>
              <p className="text-xs text-slate-400">
                {this.state.error?.message || '组件加载出现异常，请点击重试恢复'}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded bg-[#d4a038] hover:bg-[#c4932f] text-black font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>刷新重试</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
