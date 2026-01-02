// src/components/funds/fundUtils.js
export function calcEstimateDate(startDateStr, freq, periods) {
  if (!startDateStr || !periods || periods <= 0) return null;
  const d = new Date(startDateStr);
  if (Number.isNaN(d.getTime())) return null;

  const result = new Date(d);
  switch (freq) {
    case "day":
      result.setDate(result.getDate() + periods);
      break;
    case "week":
      result.setDate(result.getDate() + periods * 7);
      break;
    case "month":
      result.setMonth(result.getMonth() + periods);
      break;
    case "year":
      result.setFullYear(result.getFullYear() + periods);
      break;
    default:
      break;
  }
  return result;
}
