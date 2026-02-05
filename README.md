# Frontend - Ứng dụng Quản Lý Tài Chính Cá Nhân
## Giới thiệu
Đây là phần **giao diện người dùng (UI)** của hệ thống quản lý tài chính cá nhân, được phát triển bằng **React.js** nhằm mang đến trải nghiệm trực quan, hiện đại và dễ sử dụng. Ứng dụng cho phép người dùng theo dõi thu chi, quản lý ví, thiết lập ngân sách và xem báo cáo tài chính một cách chi tiết.

### Mục tiêu
- Giúp người dùng kiểm soát chi tiêu hàng ngày.
- Hỗ trợ thiết lập ngân sách và cảnh báo khi vượt hạn mức.
- Cung cấp báo cáo trực quan để phân tích xu hướng tài chính.
- Tích hợp dễ dàng với backend thông qua API RESTful.

## Chức năng chính
Ứng dụng bao gồm nhiều module và trang chức năng:

- **Tổng quan (Dashboard)**  
  Hiển thị số dư tổng, thu chi gần đây, biểu đồ thống kê theo thời gian.

- **Quản lý Ví**  
  Tạo, chỉnh sửa, xóa ví (tiền mặt, ngân hàng, ví điện tử). Hiển thị số dư từng ví.

- **Quỹ tiết kiệm (Funds)**  
  Thiết lập mục tiêu tài chính dài hạn, theo dõi tiến độ đạt mục tiêu.

- **Giao dịch (Transactions)**  
  Quản lý thu chi, chuyển tiền giữa các ví. Hỗ trợ tìm kiếm và lọc theo ngày, danh mục.

- **Danh mục chi tiêu (Categories)**  
  Phân loại giao dịch theo danh mục như ăn uống, mua sắm, hóa đơn, giải trí...

- **Nhóm ví (Wallet Groups)**  
  Gom các ví vào nhóm để quản lý dễ dàng hơn.

- **Ngân sách (Budgets)**  
  Đặt hạn mức chi tiêu cho từng danh mục, cảnh báo khi vượt mức.

- **Báo cáo tài chính (Reports)**  
  Biểu đồ thu chi, so sánh ngân sách, phân tích xu hướng theo tháng/quý/năm.

- **Quản lý tài khoản (Auth)**  
  Đăng ký, đăng nhập, bảo mật bằng JWT. Hỗ trợ phân quyền người dùng.

- **Phản hồi (Feedback)**  
  Cho phép người dùng gửi phản hồi về hệ thống.

## Công nghệ sử dụng
- **React.js** (Hooks, Functional Components)
- **React Router DOM** (Điều hướng giữa các trang)
- **Axios** (Gọi API đến backend)
- **CSS Modules** (Tùy chỉnh giao diện)
- **Chart.js / Recharts** (Hiển thị biểu đồ)
- **JWT** (Xác thực với backend)
- **ESLint + Prettier** (Chuẩn hóa code)
