import React, { Component, ErrorInfo, ReactNode } from 'react';

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
    console.error('Uncaught error in UI:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#FAF8F5] dark:bg-[#181714] text-[#22211E] dark:text-[#EDEAE4] p-6 text-center select-none font-sans">
          <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-[#201F1B] border border-[#DDD6C8] dark:border-[#33312B] shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#E05725]/10 text-[#E05725] mx-auto flex items-center justify-center font-bold text-xl">
              !
            </div>
            <h2 className="text-xl font-semibold">
              حدث خطأ غير متوقع
            </h2>
            <p className="text-xs text-[#7A756B] dark:text-[#9A968C] leading-relaxed">
              تم اكتشاف خطأ في عرض الواجهة. يمكنك إعادة التحميل لمتابعة محادثاتك بأمان.
            </p>
            {this.state.error?.message && (
              <pre className="text-[11px] font-mono text-start p-3 rounded-lg bg-black/5 dark:bg-white/5 overflow-x-auto text-[#B85736]">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-[#E05725] hover:bg-[#C9471A] text-white text-sm font-medium transition-colors cursor-pointer shadow-md"
            >
              إعادة تحميل التطبيق
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
