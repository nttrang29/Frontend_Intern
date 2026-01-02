import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Kiểm tra nếu là timeout error, không hiển thị error boundary
    const isTimeoutError = 
      error?.message?.includes("Timeout") ||
      error?.message?.includes("timeout") ||
      error?.message?.includes("thời gian chờ") ||
      error?.message?.includes("quá thời gian") ||
      error?.name === "AbortError" ||
      error?.name === "TimeoutError" ||
      error?.code === "ECONNABORTED" ||
      (typeof error === "string" && error.toLowerCase().includes("timeout"));

    if (isTimeoutError) {
      // Log và không hiển thị error boundary cho timeout errors
      console.warn("Timeout error caught by ErrorBoundary (suppressed):", error);
      return null; // Không set hasError = true cho timeout errors
    }

    // Chỉ hiển thị error boundary cho các lỗi khác
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Kiểm tra nếu là timeout error
    const isTimeoutError = 
      error?.message?.includes("Timeout") ||
      error?.message?.includes("timeout") ||
      error?.message?.includes("thời gian chờ") ||
      error?.message?.includes("quá thời gian") ||
      error?.name === "AbortError" ||
      error?.name === "TimeoutError" ||
      error?.code === "ECONNABORTED";

    if (isTimeoutError) {
      // Chỉ log, không hiển thị error boundary
      console.warn("Timeout error in component (suppressed):", error, errorInfo);
      return;
    }

    // Log các lỗi khác
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    // Nếu là timeout error, render children bình thường
    if (this.state.error) {
      const isTimeoutError = 
        this.state.error?.message?.includes("Timeout") ||
        this.state.error?.message?.includes("timeout") ||
        this.state.error?.message?.includes("thời gian chờ") ||
        this.state.error?.name === "AbortError" ||
        this.state.error?.name === "TimeoutError";

      if (isTimeoutError) {
        return this.props.children;
      }
    }

    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: "20px", 
          textAlign: "center",
          color: "#dc3545"
        }}>
          <h2>Đã xảy ra lỗi</h2>
          <p>Vui lòng tải lại trang hoặc liên hệ hỗ trợ nếu vấn đề vẫn tiếp tục.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              marginTop: "10px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

