// src/utils/moneyFormatSettings.js

export const MONEY_FORMATS = [
  {
    key: "space",
    label: "1 234 567 (cách nhau bằng khoảng trắng)",
    group: " ",
    decimal: ",",
    thousand: " ",
  },
  {
    key: "dot",
    label: "1.234.567 (dấu chấm)",
    group: ".",
    decimal: ",",
    thousand: ".",
  },
  {
    key: "comma",
    label: "1,234,567 (dấu phẩy)",
    group: ",",
    decimal: ".",
    thousand: ",",
  },
];

const getStorageValue = (key, fallback) => {
  if (typeof window === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ?? fallback;
  } catch (error) {
    return fallback;
  }
};

export function getMoneyFormatSettings() {
  const formatKey = getStorageValue("moneyFormat", "space");
  const parsedDigits = parseInt(getStorageValue("moneyDecimalDigits", "0"), 10);
  const decimalDigits = Number.isNaN(parsedDigits)
    ? 0
    : Math.min(Math.max(parsedDigits, 0), 8);
  const found = MONEY_FORMATS.find(f => f.key === formatKey) || MONEY_FORMATS[0];
  return {
    ...found,
    decimalDigits,
  };
}

export function setMoneyFormatSettings({ formatKey, decimalDigits }) {
  localStorage.setItem("moneyFormat", formatKey);
  localStorage.setItem("moneyDecimalDigits", decimalDigits);
}
