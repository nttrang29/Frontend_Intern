import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { formatVietnamTime } from "../../../utils/dateFormat";
import "./ChatWidget.css";

export default function ChatWidget() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Xin chào! Tôi là trợ lý ảo của MyWallet. Tôi có thể giúp bạn gì?",
      sender: "system",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom when new message is added
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isTyping) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      text,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate system response (có thể thay bằng API call thật)
    setTimeout(() => {
      const systemResponse = generateSystemResponse(text);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: systemResponse,
          sender: "system",
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000); // Random delay 1-2 seconds
  };

  const generateSystemResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();

    // Responses based on keywords
    if (lowerMessage.includes("xin chào") || lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
      return "Xin chào! Tôi có thể giúp bạn quản lý ví, xem giao dịch, hoặc trả lời các câu hỏi về ứng dụng. Bạn cần hỗ trợ gì?";
    }

    if (lowerMessage.includes("ví") || lowerMessage.includes("wallet")) {
      return "Để quản lý ví, bạn có thể:\n- Tạo ví mới từ trang 'Ví'\n- Nạp/rút tiền từ ví\n- Chuyển tiền giữa các ví\n- Xem chi tiết giao dịch\n\nBạn muốn làm gì với ví?";
    }

    if (lowerMessage.includes("giao dịch") || lowerMessage.includes("transaction")) {
      return "Trang 'Giao dịch' cho phép bạn:\n- Xem tất cả giao dịch thu/chi\n- Tạo giao dịch mới\n- Lọc theo ngày, danh mục, ví\n- Xem giao dịch chuyển khoản nội bộ\n\nBạn cần xem giao dịch nào?";
    }

    if (lowerMessage.includes("danh mục") || lowerMessage.includes("category")) {
      return "Trang 'Danh mục' giúp bạn:\n- Quản lý danh mục chi tiêu và thu nhập\n- Tạo danh mục mới\n- Chỉnh sửa hoặc xóa danh mục\n\nBạn muốn tạo danh mục mới không?";
    }

    if (lowerMessage.includes("ngân sách") || lowerMessage.includes("budget")) {
      return "Trang 'Ngân sách' cho phép bạn:\n- Đặt hạn mức chi tiêu cho từng danh mục\n- Theo dõi mức chi tiêu\n- Nhận cảnh báo khi gần vượt hạn mức\n\nBạn muốn thiết lập ngân sách không?";
    }

    if (lowerMessage.includes("báo cáo") || lowerMessage.includes("report")) {
      return "Trang 'Báo cáo' hiển thị:\n- Thống kê thu chi theo thời gian\n- Biểu đồ phân tích chi tiêu\n- Báo cáo theo danh mục\n\nBạn muốn xem báo cáo nào?";
    }

    if (lowerMessage.includes("giúp") || lowerMessage.includes("help") || lowerMessage.includes("hướng dẫn")) {
      return "Tôi có thể giúp bạn:\n- Quản lý ví và giao dịch\n- Thiết lập ngân sách\n- Xem báo cáo tài chính\n- Quản lý danh mục\n\nHãy hỏi tôi bất cứ điều gì về ứng dụng!";
    }

    if (lowerMessage.includes("cảm ơn") || lowerMessage.includes("thanks") || lowerMessage.includes("thank")) {
      return "Không có gì! Nếu bạn cần thêm hỗ trợ, cứ hỏi tôi nhé. 😊";
    }

    // Default response
    return "Tôi hiểu bạn đang hỏi về: \"" + userMessage + "\". Hiện tại tôi có thể giúp bạn với:\n- Quản lý ví và giao dịch\n- Thiết lập ngân sách\n- Xem báo cáo\n- Quản lý danh mục\n\nBạn muốn biết thêm về tính năng nào?";
  };

  const formatTime = (date) => formatVietnamTime(date) || "";

  return (
    <div className="chat-widget-container">
      {/* Chat Button */}
      {!isOpen && (
        <button
          className="chat-widget-button"
          onClick={() => setIsOpen(true)}
          aria-label="Mở chat"
        >
          <i className="bi bi-chat-dots-fill"></i>
          <span className="chat-widget-button-badge"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-widget-window">
          {/* Header */}
          <div className="chat-widget-header">
            <div className="chat-widget-header-info">
              <div className="chat-widget-avatar">
                <i className="bi bi-robot"></i>
              </div>
              <div>
                <div className="chat-widget-title">Trợ lý MyWallet</div>
                <div className="chat-widget-subtitle">Thường phản hồi ngay</div>
              </div>
            </div>
            <button
              className="chat-widget-close"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng chat"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {/* Messages */}
          <div className="chat-widget-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-widget-message ${
                  message.sender === "user" ? "chat-widget-message--user" : "chat-widget-message--system"
                }`}
              >
                {message.sender === "system" && (
                  <div className="chat-widget-message-avatar">
                    <i className="bi bi-robot"></i>
                  </div>
                )}
                <div className="chat-widget-message-content">
                  <div className="chat-widget-message-text">
                    {message.text.split("\n").map((line, idx) => (
                      <React.Fragment key={idx}>
                        {line}
                        {idx < message.text.split("\n").length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="chat-widget-message-time">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
                {message.sender === "user" && (
                  <div className="chat-widget-message-avatar chat-widget-message-avatar--user">
                    <i className="bi bi-person-fill"></i>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="chat-widget-message chat-widget-message--system">
                <div className="chat-widget-message-avatar">
                  <i className="bi bi-robot"></i>
                </div>
                <div className="chat-widget-message-content">
                  <div className="chat-widget-typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form className="chat-widget-input-form" onSubmit={handleSendMessage}>
            <input
              ref={inputRef}
              type="text"
              className="chat-widget-input"
              placeholder="Nhập tin nhắn..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isTyping}
            />
            <button
              type="submit"
              className="chat-widget-send"
              disabled={!inputValue.trim() || isTyping}
              aria-label="Gửi tin nhắn"
            >
              <i className="bi bi-send-fill"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

