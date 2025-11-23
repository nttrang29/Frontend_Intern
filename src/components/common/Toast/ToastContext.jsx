import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import Toast from "./Toast";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success", // "success" | "error"
    duration: 2500,
    // mặc định bám theo topbar + main của HomeLayout
    topbarSelector: ".home__topbar, .home-topbar, header.home__topbar",
    anchorSelector: ".home__main, main.home__main",
    offset: { top: 10, right: 16 },
  });

  /**
   * showToast("Nội dung", "success" | "error")
   * hoặc showToast("Nội dung", { type: "error", duration: 3000 })
   */
  const showToast = useCallback(
    (message, typeOrOptions = "success") => {
      const options = typeof typeOrOptions === "string" 
        ? { type: typeOrOptions } 
        : typeOrOptions;
      
      setToast((prev) => ({
        ...prev,
        open: true,
        message,
        type: options.type ?? prev.type ?? "success",
        duration: options.duration ?? prev.duration ?? 2500,
        topbarSelector: options.topbarSelector ?? prev.topbarSelector,
        anchorSelector: options.anchorSelector ?? prev.anchorSelector,
        offset: options.offset ?? prev.offset,
      }));
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, open: false }));
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      hideToast,
    }),
    [showToast, hideToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* ✅ Toast global – luôn nằm ở cuối cây, nhưng chỉ hiện khi open=true */}
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        topbarSelector={toast.topbarSelector}
        anchorSelector={toast.anchorSelector}
        offset={toast.offset}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast phải dùng bên trong <ToastProvider>.");
  }
  return ctx;
};

