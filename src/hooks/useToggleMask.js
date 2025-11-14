// src/hooks/useToggleMask.js
import { useState } from "react";

/**
 * useToggleMask
 * Hook nhỏ giúp ẩn/hiện các giá trị (ví dụ: số dư, tiền, mật khẩu, v.v.)
 * @param {boolean} initial - trạng thái ban đầu (true = hiển thị)
 * @returns [visible, toggle]
 */
export default function useToggleMask(initial = true) {
  const [visible, setVisible] = useState(initial);
  const toggle = () => setVisible((v) => !v);
  return [visible, toggle];
}
