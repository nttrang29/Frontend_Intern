// src/pages/Home/SettingsPage.jsx

import React, { useState } from "react";

import "../../styles/home/SettingsPage.css";

export default function SettingsPage() {

  const [activeKey, setActiveKey] = useState(null);

  const toggleItem = (key) => {

    setActiveKey((prev) => (prev === key ? null : key));

  };

  const renderDetail = (key) => {

    switch (key) {

      // ====== NHÓM BẢO MẬT ======

      case "profile":

        return (
<div className="settings-detail__body">
<h4>Chỉnh sửa hồ sơ cá nhân</h4>
<p className="settings-detail__desc">

              Cập nhật ảnh đại diện và tên hiển thị của bạn.
</p>
<div className="settings-profile-grid">

              {/* CỘT TRÁI: ĐỔI TÊN */}
<div className="settings-form__group">
<label>Tên hiển thị</label>
<input

                  type="text"

                  defaultValue="Trí Trần Vinh"

                  placeholder="Nhập tên muốn hiển thị"

                />
</div>

              {/* CỘT PHẢI: ẢNH ĐẠI DIỆN */}
<div className="settings-avatar-upload">
<img

                  src="https://i.pravatar.cc/150?img=12"

                  alt="avatar"

                  className="settings-avatar-preview"

                />
<label className="settings-btn settings-btn--primary settings-avatar-btn">

                  Chọn ảnh
<input

                    type="file"

                    accept="image/*"

                    className="settings-avatar-input"

                  />
</label>
</div>
</div>
<button className="settings-btn settings-btn--primary">

              Lưu thay đổi
</button>
</div>

        );

      case "password":

        return (
<div className="settings-detail__body">
<h4>Đổi mật khẩu</h4>
<p className="settings-detail__desc">

              Nên sử dụng mật khẩu mạnh, khó đoán để bảo vệ tài khoản.
</p>
<div className="settings-form__grid">
<div className="settings-form__group">
<label>Mật khẩu hiện tại</label>
<input type="password" placeholder="Nhập mật khẩu hiện tại" />
</div>
<div className="settings-form__group">
<label>Mật khẩu mới</label>
<input type="password" placeholder="Nhập mật khẩu mới" />
</div>
<div className="settings-form__group">
<label>Nhập lại mật khẩu mới</label>
<input

                  type="password"

                  placeholder="Nhập lại mật khẩu mới"

                />
</div>
</div>
<button className="settings-btn settings-btn--primary">

              Cập nhật mật khẩu
</button>
</div>

        );

      case "2fa":

        return (
<div className="settings-detail__body">
<h4>Xác thực 2 lớp (2FA)</h4>
<p className="settings-detail__desc">

              Thêm một lớp bảo mật bằng mã xác thực khi đăng nhập.
</p>
<div className="settings-toggle-row">
<span>Trạng thái 2FA</span>
<label className="settings-switch">
<input type="checkbox" />
<span className="settings-switch__slider" />
</label>
</div>
<p className="settings-detail__hint">

              Sau khi bật, mỗi lần đăng nhập bạn sẽ cần nhập thêm mã xác thực

              gửi qua ứng dụng hoặc email.
</p>
<button className="settings-btn settings-btn--primary">

              Cấu hình 2FA
</button>
</div>

        );

      case "login-log":

        return (
<div className="settings-detail__body">
<h4>Nhật ký đăng nhập</h4>
<p className="settings-detail__desc">

              Kiểm tra các lần đăng nhập gần đây để phát hiện hoạt động bất

              thường.
</p>
<div className="settings-table__wrap">
<table className="settings-table">
<thead>
<tr>
<th>Thời gian</th>
<th>Thiết bị</th>
<th>Địa chỉ IP</th>
<th>Trạng thái</th>
</tr>
</thead>
<tbody>
<tr>
<td>Hôm nay, 09:32</td>
<td>Chrome • Windows</td>
<td>192.168.1.10</td>
<td>Thành công</td>
</tr>
<tr>
<td>Hôm qua, 21:15</td>
<td>Safari • iOS</td>
<td>10.0.0.5</td>
<td>Thành công</td>
</tr>
<tr>
<td>2 ngày trước</td>
<td>Không xác định</td>
<td>203.113.12.45</td>
<td>Nghi vấn</td>
</tr>
</tbody>
</table>
</div>
</div>

        );

      case "logout-all":

        return (
<div className="settings-detail__body">
<h4>Đăng xuất tất cả thiết bị</h4>
<p className="settings-detail__desc">

              Tính năng này sẽ đăng xuất tài khoản khỏi tất cả thiết bị đang

              đăng nhập ngoại trừ thiết bị hiện tại.
</p>
<ul className="settings-detail__list">
<li>Nên sử dụng khi bạn nghi ngờ tài khoản bị lộ.</li>
<li>

                Sau khi đăng xuất, bạn cần đăng nhập lại bằng mật khẩu hiện tại.
</li>
</ul>
<button className="settings-btn settings-btn--danger">

              Đăng xuất tất cả thiết bị
</button>
</div>

        );

      // ====== NHÓM CÀI ĐẶT HỆ THỐNG ======

      case "currency":

        return (
<div className="settings-detail__body">
<h4>Chọn đơn vị tiền tệ</h4>
<p className="settings-detail__desc">

              Đơn vị tiền tệ mặc định dùng để hiển thị số dư và báo cáo.
</p>
<div className="settings-form__group">
<label>Đơn vị tiền tệ mặc định</label>
<select defaultValue="VND">
<option value="VND">VND - Việt Nam Đồng</option>
<option value="USD">USD - Đô la Mỹ</option>
<option value="EUR">EUR - Euro</option>
<option value="JPY">JPY - Yên Nhật</option>
</select>
</div>
<button className="settings-btn settings-btn--primary">

              Lưu cài đặt
</button>
</div>

        );

      case "currency-format":

        return (
<div className="settings-detail__body">
<h4>Định dạng tiền tệ</h4>
<p className="settings-detail__desc">

              Chọn cách hiển thị số tiền trên ứng dụng.
</p>
<div className="settings-form__group">
<label>Kiểu hiển thị</label>
<select defaultValue="space">
<option value="space">

                  1 234 567 (cách nhau bằng khoảng trắng)
</option>
<option value="dot">1.234.567 (dấu chấm)</option>
<option value="comma">1,234,567 (dấu phẩy)</option>
</select>
</div>
<div className="settings-form__group">
<label>Số chữ số thập phân</label>
<select defaultValue="0">
<option value="0">0 (ví dụ: 1.000)</option>
<option value="2">2 (ví dụ: 1.000,50)</option>
</select>
</div>
<button className="settings-btn settings-btn--primary">

              Lưu định dạng
</button>
</div>

        );

      case "date-format":

        return (
<div className="settings-detail__body">
<h4>Cài đặt định dạng ngày</h4>
<p className="settings-detail__desc">

              Chọn cách hiển thị ngày tháng trên toàn hệ thống.
</p>
<div className="settings-form__group">
<label>Định dạng</label>
<select defaultValue="dd/MM/yyyy">
<option value="dd/MM/yyyy">dd/MM/yyyy (31/12/2025)</option>
<option value="MM/dd/yyyy">MM/dd/yyyy (12/31/2025)</option>
<option value="yyyy-MM-dd">yyyy-MM-dd (2025-12-31)</option>
</select>
</div>
<button className="settings-btn settings-btn--primary">

              Lưu cài đặt ngày
</button>
</div>

        );

      case "language":

        return (
<div className="settings-detail__body">
<h4>Chọn ngôn ngữ hệ thống</h4>
<p className="settings-detail__desc">

              Ngôn ngữ hiển thị cho toàn bộ giao diện ứng dụng.
</p>
<div className="settings-form__group">
<label>Ngôn ngữ</label>
<select defaultValue="vi">
<option value="vi">Tiếng Việt</option>
<option value="en">English</option>
</select>
</div>
<button className="settings-btn settings-btn--primary">

              Lưu ngôn ngữ
</button>
</div>

        );

      case "theme":

        return (
<div className="settings-detail__body">
<h4>Chế độ nền</h4>
<p className="settings-detail__desc">

              Chọn chế độ hiển thị phù hợp với mắt của bạn.
</p>
<div className="settings-radio-row">
<label className="settings-radio">
<input type="radio" name="theme" defaultChecked />
<span>Chế độ sáng</span>
</label>
<label className="settings-radio">
<input type="radio" name="theme" />
<span>Chế độ tối</span>
</label>
<label className="settings-radio">
<input type="radio" name="theme" />
<span>Tự động theo hệ thống</span>
</label>
</div>
<button className="settings-btn settings-btn--primary">

              Lưu chế độ nền
</button>
</div>

        );

      case "backup":

        return (
<div className="settings-detail__body">
<h4>Sao lưu & đồng bộ</h4>
<p className="settings-detail__desc">

              Đảm bảo dữ liệu ví của bạn luôn được an toàn và có thể khôi phục.
</p>
<ul className="settings-detail__list">
<li>Sao lưu thủ công dữ liệu hiện tại.</li>
<li>Bật đồng bộ tự động với tài khoản của bạn.</li>
</ul>
<div className="settings-form__actions">
<button className="settings-btn settings-btn--primary">

                Sao lưu ngay
</button>
<button className="settings-btn">

                Bật đồng bộ tự động
</button>
</div>
</div>

        );

      default:

        return null;

    }

  };

  const securityItems = [

    { key: "profile", label: "Chỉnh hồ sơ cá nhân" },

    { key: "password", label: "Đổi mật khẩu" },

    { key: "2fa", label: "Xác thực 2 lớp (2FA)" },

    { key: "login-log", label: "Nhật ký đăng nhập" },

    { key: "logout-all", label: "Đăng xuất tất cả thiết bị" },

  ];

  const systemItems = [

    { key: "currency", label: "Chọn đơn vị tiền tệ" },

    { key: "currency-format", label: "Định dạng tiền tệ" },

    { key: "date-format", label: "Cài đặt định dạng ngày" },

    { key: "language", label: "Chọn ngôn ngữ hệ thống" },

    { key: "theme", label: "Chế độ nền" },

    { key: "backup", label: "Sao lưu & đồng bộ" },

  ];

  return (
<div className="settings-page">
<h1 className="settings-title">Cài đặt</h1>
<p className="settings-subtitle">

        Quản lý bảo mật và cài đặt hệ thống cho tài khoản của bạn.
</p>

      {/* ===== PROFILE HEADER NẰM NGOÀI BẢO MẬT ===== */}
<div className="settings-profile-header">
<img

          src="https://i.pravatar.cc/150?img=12"

          alt="avatar"

          className="settings-profile-avatar"

        />
<div className="settings-profile-info">
<h3 className="settings-profile-name">Trí Trần Vinh</h3>
<p className="settings-profile-email">vinhtri@example.com</p>
</div>
</div>
<div className="settings-list">

        {/* NHÓM: BẢO MẬT */}
<div className="settings-group">
<div className="settings-group__header">Bảo mật</div>

          {securityItems.map((item) => (
<div key={item.key} className="settings-item">
<button

                className={`settings-item__btn ${

                  activeKey === item.key ? "is-active" : ""

                }`}

                onClick={() => toggleItem(item.key)}
>
<span className="settings-item__label">{item.label}</span>
<span className="settings-item__arrow">

                  {activeKey === item.key ? "▲" : "▼"}
</span>
</button>

              {activeKey === item.key && (
<div className="settings-detail">{renderDetail(item.key)}</div>

              )}
</div>

          ))}
</div>

        {/* NHÓM: CÀI ĐẶT HỆ THỐNG */}
<div className="settings-group">
<div className="settings-group__header">Cài đặt hệ thống</div>

          {systemItems.map((item) => (
<div key={item.key} className="settings-item">
<button

                className={`settings-item__btn ${

                  activeKey === item.key ? "is-active" : ""

                }`}

                onClick={() => toggleItem(item.key)}
>
<span className="settings-item__label">{item.label}</span>
<span className="settings-item__arrow">

                  {activeKey === item.key ? "▲" : "▼"}
</span>
</button>

              {activeKey === item.key && (
<div className="settings-detail">{renderDetail(item.key)}</div>

              )}
</div>

          ))}
</div>
</div>
</div>

  );

}
 