import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { formatVietnamTime } from "../../../utils/dateFormat";
import { chatAPI } from "../../../services/api-client";
import "./ChatWidget.css";

export default function ChatWidget() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Xin chào! Tôi là trợ lí tài chính của bạn. Tôi có thể giúp bạn quản lý tài chính, xem số dư, theo dõi thu chi và nhiều hơn nữa. Bạn cần hỗ trợ gì?",
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

    try {
      // Chuẩn bị lịch sử hội thoại cho API (bỏ qua tin nhắn chào mừng ban đầu)
      const historyForApi = messages
        .slice(1) // Bỏ qua tin nhắn chào mừng đầu tiên
        .map((msg) => ({
          role: msg.sender === "user" ? "user" : "model",
          content: msg.text,
        }));

      // Gọi API backend
      // apiCall trả về data trực tiếp (ChatResponse object)
      const chatResponse = await chatAPI.sendMessage(text, historyForApi);

      // Kiểm tra response từ backend
      // ChatResponse có: { message: string, success: boolean, error: string }
      if (chatResponse && chatResponse.success && chatResponse.message) {
        // Thêm response từ AI vào messages
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: chatResponse.message,
            sender: "system",
            timestamp: new Date(),
          },
        ]);
      } else {
        // Xử lý lỗi từ backend
        const errorMessage = chatResponse?.error || chatResponse?.message || "Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại sau.";
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: errorMessage,
            sender: "system",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error sending message to chat API:", error);
      // Xử lý lỗi từ API call
      const errorMessage = error.message || error.data?.error || "Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại sau.";
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: errorMessage,
          sender: "system",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
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
                      <div className="chat-widget-title">Trợ lí tài chính của bạn</div>
                      <div className="chat-widget-subtitle">Hỗ trợ quản lý tài chính 24/7</div>
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

