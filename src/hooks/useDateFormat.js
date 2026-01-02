// src/hooks/useDateFormat.js
import { useState, useEffect, useCallback } from "react";
import { getDateFormatSetting, formatDate } from "../utils/dateFormatSettings";

export function useDateFormat() {
  const [dateFormatVersion, setDateFormatVersion] = useState(0);
  const [dateFormat, setDateFormat] = useState(() => getDateFormatSetting());

  useEffect(() => {
    const handler = (e) => {
      setDateFormat(e.detail?.dateFormat || getDateFormatSetting());
      setDateFormatVersion(v => v + 1);
    };
    window.addEventListener("dateFormatChanged", handler);
    return () => window.removeEventListener("dateFormatChanged", handler);
  }, []);

  const format = useCallback((date) => {
    return formatDate(date, getDateFormatSetting());
  }, [dateFormatVersion]);

  return { dateFormat, formatDate: format };
}
