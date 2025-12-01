// src/pages/Home/SettingsPage.jsx

import React, { useState, useEffect, useRef } from "react";
import { getProfile, updateProfile, changePassword } from "../../services/profile.service";
import "../../styles/pages/SettingsPage.css";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../components/common/Toast/ToastContext";

export default function SettingsPage() {
  const [activeKey, setActiveKey] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [defaultCurrency, setDefaultCurrency] = useState(() => {
    // Lấy từ localStorage hoặc mặc định là VND
    return localStorage.getItem("defaultCurrency") || "VND";
  });
  // Move money format state to top-level to avoid hook rules error
  const [moneyFormat, setMoneyFormat] = useState(() => localStorage.getItem("moneyFormat") || "space");
  const [moneyDecimalDigits, setMoneyDecimalDigits] = useState(() => localStorage.getItem("moneyDecimalDigits") || "0");
  // Move date format state to top-level to avoid hook rules error
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem("dateFormat") || "dd/MM/yyyy");
  const [dateSuccess, setDateSuccess] = useState("");
  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  const { t, changeLanguage, language } = useLanguage();
  const { showToast } = useToast();
  const [selectedLang, setSelectedLang] = useState(language || "vi");

  // Refs cho các input fields
  const fullNameRef = useRef(null);
  const avatarRef = useRef(null);
  const oldPasswordRef = useRef(null);
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const currencyRef = useRef(null);

  // Load profile khi component mount
  useEffect(() => {
    loadProfile();
    // Load và áp dụng theme khi component mount
    const savedTheme = localStorage.getItem("theme") || "light";
    setSelectedTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  // Hàm áp dụng theme
  const applyTheme = (theme) => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    } else if (theme === "system") {
      // System: theo preference của OS
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.body.classList.remove("dark");
      }
    }
  };

  // Lắng nghe thay đổi system preference khi theme là "system"
  useEffect(() => {
    if (selectedTheme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      
      const handleSystemThemeChange = (e) => {
        if (selectedTheme === "system") {
          if (e.matches) {
            document.documentElement.classList.add("dark");
            document.body.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
            document.body.classList.remove("dark");
          }
        }
      };

      // Lắng nghe thay đổi
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handleSystemThemeChange);
      } else {
        // Fallback cho trình duyệt cũ
        mediaQuery.addListener(handleSystemThemeChange);
      }

      // Cleanup
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener("change", handleSystemThemeChange);
        } else {
          mediaQuery.removeListener(handleSystemThemeChange);
        }
      };
    }
  }, [selectedTheme]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { response, data } = await getProfile();
      if (response.ok && data.user) {
        setUser(data.user);
      } else {
        setError(data.error || t('settings.error.load_profile'));
      }
    } catch (err) {
      setError(t('settings.error.network_load'));
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (key) => {
    setActiveKey((prev) => (prev === key ? null : key));
    setError("");
    setSuccess("");
    // Reset avatar preview khi đóng form
    if (key !== "profile") {
      setAvatarPreview(null);
      setAvatarFile(null);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError(t('settings.error.avatar_invalid'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('settings.error.avatar_size'));
      return;
    }

    setAvatarFile(file);
    setError("");

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  // Sửa trong file SettingsPage.jsx

  const handleUpdateProfile = async () => {
    const fullName = fullNameRef.current?.value?.trim();
    
    // Logic xác định avatar:
    // 1. Ưu tiên file mới (avatarPreview là base64 của file)
    // 2. Nếu không có file mới, giữ nguyên avatar cũ từ state (user.avatar)
    const avatar = avatarFile 
      ? avatarPreview // Base64 data URL từ file đã chọn
      : user?.avatar; // Giữ nguyên avatar cũ nếu không chọn file mới

    if (!fullName && !avatarFile) {
      if (!fullName && !user?.fullName) {
        setError(t('settings.error.enter_name_or_avatar'));
        return;
      }
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const { response, data } = await updateProfile({ 
        fullName: fullName || undefined, 
        avatar: avatar || undefined 
      });

      if (response.ok && data.user) {
        // 1. Cập nhật state cục bộ (như cũ)
        setUser(data.user);

        // 2. ✅ Cập nhật localStorage với user mới nhất từ API
        localStorage.setItem("user", JSON.stringify(data.user));

        // 3. ✅ Bắn tín hiệu "storageUpdated" để HomeTopbar cập nhật avatar
        // Sử dụng setTimeout nhỏ để đảm bảo localStorage đã được cập nhật
        setTimeout(() => {
          console.log("SettingsPage: Đã cập nhật localStorage và bắn tín hiệu 'storageUpdated'");
          window.dispatchEvent(new CustomEvent('storageUpdated'));
        }, 0);

        // 4. Dọn dẹp form
        setAvatarPreview(null);
        setAvatarFile(null);
        if (avatarRef.current) avatarRef.current.value = "";
        
        // 5. Hiển thị thông báo thành công
        setSuccess(data.message || t('settings.profile.save_success'));
        setTimeout(() => setSuccess(""), 3000);
        
      } else {
        // Xử lý lỗi từ API
        setError(data.error || t('settings.profile.save_failed'));
      }
    } catch (err) {
      // Xử lý lỗi mạng hoặc lỗi hệ thống
      setError(t('settings.error.network_update'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const oldPassword = oldPasswordRef.current?.value;
    const newPassword = newPasswordRef.current?.value;
    const confirmPassword = confirmPasswordRef.current?.value;

    if (!newPassword || !confirmPassword) {
      setError(t('settings.password.error.fill'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('settings.password.error.mismatch'));
      return;
    }

    // Nếu user đã có password, bắt buộc phải nhập old password
    if (user?.hasPassword && (!oldPassword || oldPassword.trim() === "")) {
      setError(t('settings.password.error.need_current'));
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const { response, data } = await changePassword({
        oldPassword: user?.hasPassword ? oldPassword : undefined, // Chỉ gửi oldPassword nếu user đã có password
        newPassword,
        confirmPassword,
      });
      if (response.ok && data.message) {
        setSuccess(data.message);
        // Clear password fields
        if (oldPasswordRef.current) oldPasswordRef.current.value = "";
        if (newPasswordRef.current) newPasswordRef.current.value = "";
        if (confirmPasswordRef.current) confirmPasswordRef.current.value = "";
        // Reload profile để cập nhật hasPassword
        await loadProfile();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error || t('settings.password.failed'));
      }
    } catch (err) {
      setError(t('settings.error.network_update'));
    } finally {
      setLoading(false);
    }
  };

  const renderDetail = (key) => {

    switch (key) {

      // ====== NHÓM BẢO MẬT ======

      case "profile":

        return (
<div className="settings-detail__body">
<h4>{t('settings.profile')}</h4>
<p className="settings-detail__desc">{t('settings.profile.desc')}</p>
<div className="settings-profile-grid">

              {/* CỘT TRÁI: ĐỔI TÊN */}
<div className="settings-form__group">
<label>{t('settings.profile.display_name')}</label>
<input
                  ref={fullNameRef}
                  type="text"
                  defaultValue={user?.fullName || ""}
                  placeholder={t('settings.profile.placeholder')}
                />
</div>

              {/* CỘT PHẢI: ẢNH ĐẠI DIỆN */}
<div className="settings-avatar-upload">
<img

                  src={avatarPreview || user?.avatar || "https://i.pravatar.cc/150?img=12"}

                  alt="avatar"

                  className="settings-avatar-preview"

                />
<label className="settings-btn settings-btn--primary settings-avatar-btn">
                  {t('settings.profile.choose_avatar')}
<input

                    ref={avatarRef}
                    type="file"

                    accept="image/*"

                    onChange={handleAvatarChange}

                    style={{ display: 'none' }}

                  />
</label>
{avatarFile && (
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  {t('settings.profile.selected')}: {avatarFile.name}
                </p>
              )}
</div>
</div>
{error && activeKey === "profile" && <div className="settings-error" style={{color: 'red', marginBottom: '10px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px'}}>{error}</div>}
{success && activeKey === "profile" && <div className="settings-success" style={{color: 'green', marginBottom: '10px', padding: '10px', backgroundColor: '#e6ffe6', borderRadius: '4px'}}>{success}</div>}
<button 
              className="settings-btn settings-btn--primary"
              onClick={handleUpdateProfile}
              disabled={loading}
            >
              {loading ? t('common.loading') : t('common.save')}
</button>
</div>

        );

      case "password":

        return (
<div className="settings-detail__body">
<h4>{t('settings.password')}</h4>
<p className="settings-detail__desc">
              {user?.hasPassword 
                ? t('settings.password.has_desc')
                : t('settings.password.no_password_desc')}
</p>
<div className="settings-form__grid">
{/* Chỉ hiển thị field "Mật khẩu hiện tại" nếu user đã có password */}
{user?.hasPassword && (
<div className="settings-form__group">
<label>Mật khẩu hiện tại</label>
<input 
                ref={oldPasswordRef}
                type="password" 
                placeholder="Nhập mật khẩu hiện tại" 
                required
              />
</div>
)}
<div className="settings-form__group">
<label>Mật khẩu mới</label>
<input 
                ref={newPasswordRef}
                type="password" 
                placeholder="Nhập mật khẩu mới" 
                required
              />
</div>
<div className="settings-form__group">
<label>Nhập lại mật khẩu mới</label>
<input

                  ref={confirmPasswordRef}
                  type="password"

                  placeholder="Nhập lại mật khẩu mới"
                  required

                />
</div>
</div>
{error && activeKey === "password" && <div className="settings-error" style={{color: 'red', marginBottom: '10px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px'}}>{error}</div>}
{success && activeKey === "password" && <div className="settings-success" style={{color: 'green', marginBottom: '10px', padding: '10px', backgroundColor: '#e6ffe6', borderRadius: '4px'}}>{success}</div>}
<button 
              className="settings-btn settings-btn--primary"
              onClick={handleChangePassword}
              disabled={loading}
            >

              {loading ? t('settings.password.updating') : user?.hasPassword ? t('settings.password.update_btn') : t('settings.password.set_btn')}
</button>
</div>

        );

      case "2fa":

        return (
<div className="settings-detail__body">
<h4>{t('settings.2fa')}</h4>
<p className="settings-detail__desc">{t('settings.2fa.desc')}</p>
<div className="settings-toggle-row">
<span>{t('settings.2fa.status_label')}</span>
<label className="settings-switch">
<input type="checkbox" />
<span className="settings-switch__slider" />
</label>
</div>
<p className="settings-detail__hint">{t('settings.2fa.hint')}</p>
<button className="settings-btn settings-btn--primary">{t('settings.2fa.configure')}</button>
</div>

        );

      case "login-log":

        return (
<div className="settings-detail__body">
<h4>{t('settings.login_log')}</h4>
<p className="settings-detail__desc">{t('settings.login_log.desc')}</p>
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
  <h4>{t('settings.logout_all')}</h4>
  <p className="settings-detail__desc">{t('settings.logout_all.desc')}</p>
  <ul className="settings-detail__list">
    <li>{t('settings.logout_all.note1')}</li>
    <li>{t('settings.logout_all.note2')}</li>
  </ul>
  <button className="settings-btn settings-btn--danger">{t('settings.logout_all.btn')}</button>
</div>

        );

      // ====== NHÓM CÀI ĐẶT HỆ THỐNG ======

      case "currency":

        return (
<div className="settings-detail__body">
  <h4>{t('settings.currency')}</h4>
  <p className="settings-detail__desc">{t('settings.currency.desc')}</p>
  <div className="settings-form__group">
    <label>{t('settings.currency.label')}</label>
    <select
      ref={currencyRef}
      defaultValue={defaultCurrency}
      onChange={(e) => setDefaultCurrency(e.target.value)}
    >
      <option value="VND">VND - Việt Nam Đồng</option>
      <option value="USD">USD - Đô la Mỹ</option>
    </select>
  </div>
{error && activeKey === "currency" && <div className="settings-error" style={{color: 'red', marginBottom: '10px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px'}}>{error}</div>}
{success && activeKey === "currency" && <div className="settings-success" style={{color: 'green', marginBottom: '10px', padding: '10px', backgroundColor: '#e6ffe6', borderRadius: '4px'}}>{success}</div>}
            <button 
              className="settings-btn settings-btn--primary"
              onClick={() => {
                const selectedCurrency = currencyRef.current?.value || "VND";
                localStorage.setItem("defaultCurrency", selectedCurrency);
                setDefaultCurrency(selectedCurrency);
                // Bắn event để các component khác cập nhật
                window.dispatchEvent(new CustomEvent('currencySettingChanged', { detail: { currency: selectedCurrency } }));
                showToast(t('settings.currency.saved'), { type: 'success', anchorSelector: 'body', topbarSelector: '.no-topbar', offset: { top: 12, right: 16 } });
              }}
            >
              {t('common.save')}
</button>
</div>

        );

      case "currency-format":
        return (
          <div className="settings-detail__body">
            <h4>{t('settings.currency_format')}</h4>
            <p className="settings-detail__desc">{t('settings.currency_format.desc')}</p>
            <div className="settings-form__group">
              <label>{t('settings.currency_format.label')}</label>
              <select value={moneyFormat} onChange={e => setMoneyFormat(e.target.value)}>
                <option value="space">{t('settings.currency_format.opt.space')}</option>
                <option value="dot">{t('settings.currency_format.opt.dot')}</option>
                <option value="comma">{t('settings.currency_format.opt.comma')}</option>
              </select>
            </div>
            <div className="settings-form__group">
              <label>{t('settings.currency_format.decimals_label')}</label>
              <select value={moneyDecimalDigits} onChange={e => setMoneyDecimalDigits(e.target.value)}>
                <option value="0">{t('settings.currency_format.opt.decimals.0')}</option>
                <option value="2">{t('settings.currency_format.opt.decimals.2')}</option>
              </select>
            </div>
            <button className="settings-btn settings-btn--primary" onClick={() => {
              localStorage.setItem("moneyFormat", moneyFormat);
              localStorage.setItem("moneyDecimalDigits", moneyDecimalDigits);
              window.dispatchEvent(new CustomEvent('moneyFormatChanged', { detail: { moneyFormat, moneyDecimalDigits } }));
              showToast(t('settings.currency_format.saved'), { type: 'success', anchorSelector: 'body', topbarSelector: '.no-topbar', offset: { top: 12, right: 16 } });
            }}>
              {t('common.save')}
            </button>
          </div>
        );

      case "date-format":
        return (
          <div className="settings-detail__body">
            <h4>{t('settings.date_format')}</h4>
            <p className="settings-detail__desc">{t('settings.date_format.desc')}</p>
            <div className="settings-form__group">
              <label>{t('settings.date_format.label')}</label>
              <select value={dateFormat} onChange={e => setDateFormat(e.target.value)}>
                <option value="dd/MM/yyyy">{t('settings.date_format.opt.ddMMyyyy')}</option>
                <option value="MM/dd/yyyy">{t('settings.date_format.opt.MMddyyyy')}</option>
                <option value="yyyy-MM-dd">{t('settings.date_format.opt.yyyyMMdd')}</option>
              </select>
            </div>
            <button className="settings-btn settings-btn--primary" onClick={() => {
              localStorage.setItem("dateFormat", dateFormat);
              window.dispatchEvent(new CustomEvent('dateFormatChanged', { detail: { dateFormat } }));
              showToast(t('settings.date_format.saved'), { type: 'success', anchorSelector: 'body', topbarSelector: '.no-topbar', offset: { top: 12, right: 16 } });
            }}>
              {t('common.save')}
            </button>
          </div>
        );

      case "language":

        return (
<div className="settings-detail__body">
<h4>{t('settings.language.title')}</h4>
<p className="settings-detail__desc">{t('settings.language.desc')}</p>
<div className="settings-form__group">
<label>{t('settings.language.label')}</label>
<select value={selectedLang} onChange={(e) => setSelectedLang(e.target.value)}>
<option value="vi">Tiếng Việt</option>
<option value="en">English</option>
</select>
</div>
<button className="settings-btn settings-btn--primary" onClick={() => {
                changeLanguage(selectedLang);
                // notify other parts if they listen for an event
                window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: selectedLang } }));
                showToast(t('settings.language.saved'), { type: 'success', anchorSelector: 'body', topbarSelector: '.no-topbar', offset: { top: 12, right: 16 } });
              }}>
              {t('settings.language.save')}
</button>
</div>

        );

      case "theme":

        const handleThemeChange = (theme) => {
          setSelectedTheme(theme);
          // Áp dụng theme ngay lập tức khi chọn
          applyTheme(theme);
        };

        const handleSaveTheme = () => {
          localStorage.setItem("theme", selectedTheme);
          applyTheme(selectedTheme);
          
          showToast(t('common.success'), { 
            type: 'success', 
            anchorSelector: 'body', 
            topbarSelector: '.no-topbar', 
            offset: { top: 12, right: 16 } 
          });
        };

        return (
<div className="settings-detail__body">
<h4>{t('settings.theme')}</h4>
<p className="settings-detail__desc">{t('settings.theme.desc')}</p>
<div className="settings-theme-options">
  <div 
    className={`settings-theme-card ${selectedTheme === "light" ? "active" : ""}`}
    onClick={() => handleThemeChange("light")}
  >
    <div className="settings-theme-card__icon">
      <i className="bi bi-sun"></i>
    </div>
    <div className="settings-theme-card__content">
      <h5>{t('settings.theme.opt.light')}</h5>
      <p>Giao diện sáng, dễ nhìn</p>
    </div>
    <div className="settings-theme-card__radio">
      <input 
        type="radio" 
        name="theme" 
        value="light"
        checked={selectedTheme === "light"}
        onChange={() => handleThemeChange("light")}
      />
    </div>
  </div>

  <div 
    className={`settings-theme-card ${selectedTheme === "dark" ? "active" : ""}`}
    onClick={() => handleThemeChange("dark")}
  >
    <div className="settings-theme-card__icon">
      <i className="bi bi-moon-stars"></i>
    </div>
    <div className="settings-theme-card__content">
      <h5>{t('settings.theme.opt.dark')}</h5>
      <p>Giao diện tối, tiết kiệm pin</p>
    </div>
    <div className="settings-theme-card__radio">
      <input 
        type="radio" 
        name="theme" 
        value="dark"
        checked={selectedTheme === "dark"}
        onChange={() => handleThemeChange("dark")}
      />
    </div>
  </div>

  <div 
    className={`settings-theme-card ${selectedTheme === "system" ? "active" : ""}`}
    onClick={() => handleThemeChange("system")}
  >
    <div className="settings-theme-card__icon">
      <i className="bi bi-circle-half"></i>
    </div>
    <div className="settings-theme-card__content">
      <h5>{t('settings.theme.opt.system')}</h5>
      <p>Theo cài đặt hệ thống</p>
    </div>
    <div className="settings-theme-card__radio">
      <input 
        type="radio" 
        name="theme" 
        value="system"
        checked={selectedTheme === "system"}
        onChange={() => handleThemeChange("system")}
      />
    </div>
  </div>
</div>
<button className="settings-btn settings-btn--primary" onClick={handleSaveTheme}>
  {t('common.save')}
</button>
</div>

        );

      case "backup":

        return (
<div className="settings-detail__body">
<h4>{t('settings.backup')}</h4>
<p className="settings-detail__desc">{t('settings.backup.desc')}</p>
<ul className="settings-detail__list">
  <li>{t('settings.backup.manual')}</li>
  <li>{t('settings.backup.auto')}</li>
  </ul>
<div className="settings-form__actions">
  <button className="settings-btn settings-btn--primary" onClick={() => showToast(t('settings.backup.backup_now'), { type: 'success', anchorSelector: 'body', topbarSelector: '.no-topbar', offset: { top: 12, right: 16 } })}>{t('settings.backup.backup_now')}</button>
  <button className="settings-btn" onClick={() => showToast(t('settings.backup.enable_sync'), { type: 'success', anchorSelector: 'body', topbarSelector: '.no-topbar', offset: { top: 12, right: 16 } })}>{t('settings.backup.enable_sync')}</button>
</div>
</div>

        );

      default:

        return null;

    }

  };

  // use translation keys for labels so UI follows selected language
  const securityItems = [
    { key: "profile", labelKey: "settings.profile" },
    { key: "password", labelKey: "settings.password" },
    { key: "2fa", labelKey: "settings.2fa" },
    { key: "login-log", labelKey: "settings.login_log" },
    { key: "logout-all", labelKey: "settings.logout_all" },
  ];

  const systemItems = [
    { key: "currency", labelKey: "settings.currency" },
    { key: "currency-format", labelKey: "settings.currency_format" },
    { key: "date-format", labelKey: "settings.date_format" },
    { key: "language", labelKey: "settings.language" },
    { key: "theme", labelKey: "settings.theme" },
    { key: "backup", labelKey: "settings.backup" },
  ];

  return (
<div className="settings-page tx-page container-fluid py-4">
  <div className="tx-page-inner">
<h1 className="settings-title">{t('settings.title')}</h1>
<p className="settings-subtitle">{t('settings.subtitle')}</p>

      {/* ===== PROFILE HEADER NẰM NGOÀI BẢO MẬT ===== */}
<div className="settings-profile-header">
<img

          src={user?.avatar || "https://www.gravatar.com/avatar/?d=mp&s=40"}

          alt="avatar"

          className="settings-profile-avatar"

        />
<div className="settings-profile-info">
<h3 className="settings-profile-name">{user?.fullName || t('common.loading')}</h3>
<p className="settings-profile-email">{user?.email || ""}</p>
</div>
</div>
<div className="settings-list">

        {/* NHÓM: BẢO MẬT */}
      <div className="settings-group">
      <div className="settings-group__header">{t('settings.security_group')}</div>

          {securityItems.map((item) => (
<div key={item.key} className="settings-item">
<button

                className={`settings-item__btn ${

                  activeKey === item.key ? "is-active" : ""

                }`}

                onClick={() => toggleItem(item.key)}
>
<span className="settings-item__label">{t(item.labelKey)}</span>
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
      <div className="settings-group__header">{t('settings.system_group')}</div>

          {systemItems.map((item) => (
<div key={item.key} className="settings-item">
<button

                className={`settings-item__btn ${

                  activeKey === item.key ? "is-active" : ""

                }`}

                onClick={() => toggleItem(item.key)}
>
<span className="settings-item__label">{t(item.labelKey)}</span>
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
  </div>

  );

}
 