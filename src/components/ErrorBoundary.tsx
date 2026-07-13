import React, { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8 bg-pink-50 border-2 border-pink-200 rounded-2xl text-center my-4">
          <span className="text-4xl mb-4">😢</span>
          <h2 className="text-xl font-bold text-pink-800 mb-2">Chồng ơi, có lỗi nhỏ xảy ra rồi!</h2>
          <p className="text-sm text-pink-600 mb-4">Vợ đừng lo nhé, chồng đang kiểm tra lại hệ thống ngay đây.</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-2 bg-pink-500 text-white rounded-full font-bold shadow-md hover:bg-pink-600 transition-colors"
          >
            Thử tải lại phần này
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
