import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles/variables.css";

// ✅ Thêm dòng này
import { WalletDataProvider } from "./home/store/WalletDataContext";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* ✅ Bọc toàn bộ App trong Provider */}
    <WalletDataProvider>
      <App />
    </WalletDataProvider>
  </React.StrictMode>
);
