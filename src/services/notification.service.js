export function fetchNotifications() {
  // giả lập gọi API
  return Promise.resolve([
    { id: 1, title: "Nhận lương tháng 11", time: "2 phút trước" },
    { id: 2, title: "Chi tiêu > 80% hạn mức Ăn uống", time: "1 giờ trước" },
    { id: 3, title: "Giao dịch 120.000đ tại Circle K", time: "Hôm qua" },
  ]);
}
