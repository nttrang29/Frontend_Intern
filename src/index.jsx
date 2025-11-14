import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles/variables.css";

// ✅ Import providers
import { WalletDataProvider } from "./home/store/WalletDataContext";
import { BudgetDataProvider } from "./home/store/BudgetDataContext";
import { CategoryDataProvider } from "./home/store/CategoryDataContext";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* ✅ Wrap with providers - CategoryDataProvider first, then others */}
    <CategoryDataProvider>
      <WalletDataProvider>
        <BudgetDataProvider>
          <App />
        </BudgetDataProvider>
      </WalletDataProvider>
    </CategoryDataProvider>
  </React.StrictMode>
);

