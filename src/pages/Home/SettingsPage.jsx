// src/pages/Home/SettingsPage.jsx

import React, { useState, useEffect, useRef } from "react";
import { getProfile, updateProfile, changePassword } from "../../services/profile.service";
import { logoutAllDevices } from "../../services/auth.service";
import { getMyLoginLogs } from "../../services/loginLogApi";
import { get2FAStatus, setup2FA, enable2FA, disable2FA, change2FA } from "../../services/2fa.service";
import "../../styles/pages/SettingsPage.css";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../components/common/Toast/ToastContext";
import { normalizeUserProfile } from "../../utils/userProfile";

export default function SettingsPage() {
  const [activeKey, setActiveKey] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  // Move money format state to top-level to avoid hook rules error
  const [moneyFormat, setMoneyFormat] = useState(() => localStorage.getItem("moneyFormat") || "space");
  const [moneyDecimalDigits, setMoneyDecimalDigits] = useState(() => localStorage.getItem("moneyDecimalDigits") || "0");
  // Move date format state to top-level to avoid hook rules error
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem("dateFormat") || "dd/MM/yyyy");
  const [dateSuccess, setDateSuccess] = useState("");
  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginLogLoading, setLoginLogLoading] = useState(false);
  const [loginLogError, setLoginLogError] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAHasSecret, setTwoFAHasSecret] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [twoFASetupCode, setTwoFASetupCode] = useState("");
  const [twoFASetupError, setTwoFASetupError] = useState("");
  const [twoFASetupLoading, setTwoFASetupLoading] = useState(false);
  const [show2FAChangeModal, setShow2FAChangeModal] = useState(false);
  const [twoFAOldCode, setTwoFAOldCode] = useState("");
  const [twoFANewCode, setTwoFANewCode] = useState("");
  const [twoFAConfirmCode, setTwoFAConfirmCode] = useState("");
  const [twoFAChangeError, setTwoFAChangeError] = useState("");
  const [twoFAChangeLoading, setTwoFAChangeLoading] = useState(false);

  const { t, changeLanguage, language } = useLanguage();
  const { showToast } = useToast();
  const [selectedLang, setSelectedLang] = useState(language || "vi");

  const LOGIN_LOG_PAGE_SIZE = 50;
  const LOGIN_LOG_MAX_PAGES = 20;

  const toastPosition = {
    anchorSelector: "body",
    topbarSelector: ".no-topbar",
    offset: { top: 12, right: 16 },
  };

  const applyTheme = (theme) => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    } else if (theme === "system") {
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

  // Refs cho các input fields
  const fullNameRef = useRef(null);
  const avatarRef = useRef(null);
  const oldPasswordRef = useRef(null);
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const formatLogTime = (log) => {
    const raw =
      log?.time ||
      log?.loginTime ||
      log?.createdAt ||
      log?.loginAt ||
      log?.timestamp;
    if (!raw) return "--";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return typeof raw === "string" ? raw : "--";
    }
    const locale = selectedLang === "vi" ? "vi-VN" : "en-US";
    return date.toLocaleString(locale, {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatLogStatus = (status) => {
    if (!status) return "--";
    const str = String(status);
    const normalized = str.toLowerCase();
    if (normalized === "success") return t("common.success");
    if (["failed", "failure", "error"].includes(normalized)) return t("common.error");
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const resolveLogDevice = (log) => log?.device || log?.deviceInfo || log?.userAgent || "--";
  const resolveLogIp = (log) => log?.ipAddress || log?.ip || log?.clientIp || "--";
  const resolveLogAccount = (log) => {
    if (log?.account) return log.account;
    if (log?.accountName && log?.accountEmail) {
      return `${log.accountName} (${log.accountEmail})`;
    }
    if (log?.accountName) return log.accountName;
    if (log?.accountEmail) return log.accountEmail;
    if (log?.userEmail) return log.userEmail;
    if (log?.userName) return log.userName;
    if (user?.fullName && user?.email) {
      return `${user.fullName} (${user.email})`;
    }
    return user?.email || user?.fullName || "--";
  };

  // Load profile khi component mount
  useEffect(() => {
    loadProfile();
    fetchLoginLogs();
    load2FAStatus();
    // Load và áp dụng theme khi component mount
    const savedTheme = localStorage.getItem("theme") || "light";
    setSelectedTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  // Lắng nghe thay đổi system preference khi chọn mode "system"
  useEffect(() => {
    if (selectedTheme !== "system") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (event) => {
      if (event.matches) {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.body.classList.remove("dark");
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, [selectedTheme]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { response, data } = await getProfile();
      if (response.ok && data.user) {
        const normalizedUser = normalizeUserProfile(data.user);
        setUser(normalizedUser);
      } else {
        setError(data.error || t('settings.error.load_profile'));
      }
    } catch (err) {
      setError(t('settings.error.network_load'));
    } finally {
      setLoading(false);
    }
  };

  const load2FAStatus = async () => {
    try {
      const { response, data } = await get2FAStatus();
      if (response.ok) {
        setTwoFAEnabled(data.enabled || false);
        setTwoFAHasSecret(data.hasSecret || false);
      }
    } catch (err) {
      console.error("Lỗi load 2FA status:", err);
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

  const fetchLoginLogs = async () => {
    setLoginLogLoading(true);
    setLoginLogError("");
    try {
      const newLogs = [];
      const seenKeys = new Set();

      const extractLogs = (payload) => {
        if (!payload) return [];
        const candidates = [
          payload.logs,
          payload.loginLogs,
          payload.items,
          payload.entries,
          payload.records,
          payload.results,
          payload.content,
          payload.list,
          payload.rows,
          payload.data,
        ];
        for (const candidate of candidates) {
          if (Array.isArray(candidate)) return candidate;
        }
        if (payload.page && Array.isArray(payload.page.content)) {
          return payload.page.content;
        }
        if (Array.isArray(payload)) return payload;
        return [];
      };

      const getTimestamp = (log) => {
        const raw =
          log?.time ||
          log?.loginTime ||
          log?.createdAt ||
          log?.loginAt ||
          log?.timestamp;
        if (!raw) return 0;
        const millis = new Date(raw).getTime();
        return Number.isNaN(millis) ? 0 : millis;
      };

      const getLogKey = (log) => {
        if (log?.id != null) return `id:${log.id}`;
        const ts = getTimestamp(log);
        const ip = log?.ipAddress || log?.ip || log?.clientIp || "";
        const device = log?.device || log?.deviceInfo || log?.userAgent || "";
        return `ts:${ts}|ip:${ip}|device:${device}`;
      };

      const shouldContinue = (payload, batchLength, currentPage) => {
        if (!payload) return false;
        if (typeof payload.hasNext === "boolean") return payload.hasNext;
        if (typeof payload.nextPage === "number") return true;
        if (typeof payload.last === "boolean") return payload.last === false;
        const pageMeta = payload.page || payload.metadata || payload.meta || null;
        if (pageMeta) {
          if (typeof pageMeta.hasNext === "boolean") return pageMeta.hasNext;
          if (typeof pageMeta.last === "boolean") return pageMeta.last === false;
          if (
            typeof pageMeta.totalPages === "number" &&
            typeof pageMeta.number === "number"
          ) {
            return pageMeta.number + 1 < pageMeta.totalPages;
          }
        }
        if (
          typeof payload.totalPages === "number" &&
          typeof payload.page === "number"
        ) {
          return payload.page + 1 < payload.totalPages;
        }
        if (
          typeof payload.total === "number" &&
          typeof payload.pageSize === "number" &&
          typeof payload.page === "number"
        ) {
          return (payload.page + 1) * payload.pageSize < payload.total;
        }
        return batchLength >= LOGIN_LOG_PAGE_SIZE && currentPage + 1 < LOGIN_LOG_MAX_PAGES;
      };

      let page = 0;
      let keepFetching = true;
      while (keepFetching && page < LOGIN_LOG_MAX_PAGES) {
        const { response, data } = await getMyLoginLogs({
          page,
          size: LOGIN_LOG_PAGE_SIZE,
          limit: LOGIN_LOG_PAGE_SIZE,
        });
        if (!response?.ok) {
          throw new Error(data?.error || t("settings.login_log.error"));
        }
        const batch = extractLogs(data);
        batch.forEach((log) => {
          const key = getLogKey(log);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            newLogs.push(log);
          }
        });
        keepFetching = shouldContinue(data, batch.length, page);
        if (!keepFetching) break;
        page += 1;
      }

      newLogs.sort((a, b) => getTimestamp(b) - getTimestamp(a));
      setLoginLogs(newLogs);
    } catch (err) {
      setLoginLogs([]);
      setLoginLogError(err?.message || t("settings.login_log.error"));
    } finally {
      setLoginLogLoading(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (logoutAllLoading) return;
    setLogoutAllLoading(true);
    try {
      const { response, data } = await logoutAllDevices();
      if (response?.ok) {
        showToast(t("settings.logout_all.success"), {
          type: "success",
          ...toastPosition,
        });
      } else {
        showToast(data?.error || t("settings.logout_all.error"), {
          type: "error",
          ...toastPosition,
        });
      }
    } catch (error) {
      showToast(t("settings.logout_all.error"), {
        type: "error",
        ...toastPosition,
      });
    } finally {
      setLogoutAllLoading(false);
    }
  };

  const handle2FAToggle = async () => {
    if (twoFALoading) return;

    setTwoFALoading(true);
    setError("");
    setSuccess("");

    try {
      if (twoFAEnabled) {
        // Tắt 2FA
        const { response, data } = await disable2FA();
        if (response?.ok) {
          setTwoFAEnabled(false);
          setSuccess(data.message || t("settings.2fa.disable_success"));
          showToast(data.message || t("settings.2fa.disable_success"), {
            type: "success",
            ...toastPosition,
          });
        } else {
          setError(data?.error || t("settings.2fa.disable_error"));
        }
      } else {
        // Bật 2FA
        if (!twoFAHasSecret) {
          // Chưa có secret, cần setup trước
          setShow2FASetupModal(true);
          setTwoFALoading(false);
          return;
        }

        // Đã có secret, bật trực tiếp
        const { response, data } = await enable2FA();
        if (response?.ok) {
          setTwoFAEnabled(true);
          setSuccess(data.message || t("settings.2fa.enable_success"));
          showToast(data.message || t("settings.2fa.enable_success"), {
            type: "success",
            ...toastPosition,
          });
        } else {
          setError(data?.error || t("settings.2fa.enable_error"));
        }
      }
    } catch (error) {
      setError("Lỗi kết nối đến server. Vui lòng thử lại sau.");
    } finally {
      setTwoFALoading(false);
    }
  };

  const handle2FASetup = async () => {
    if (!twoFASetupCode || twoFASetupCode.length !== 6) {
      setTwoFASetupError("Vui lòng nhập mã pin 6 số");
      return;
    }

    setTwoFASetupLoading(true);
    setTwoFASetupError("");

    try {
      // Setup 2FA với mã pin do user tự tạo
      const { response, data } = await setup2FA(twoFASetupCode);
      if (response?.ok) {
        setTwoFAHasSecret(true);
        setShow2FASetupModal(false);
        setTwoFASetupCode("");
        setSuccess(data.message || "Đã tạo mã pin 2FA thành công");
        showToast(data.message || t("settings.2fa.setup_success"), {
          type: "success",
          ...toastPosition,
        });
        // Tự động bật 2FA sau khi setup
        await enable2FA();
        await load2FAStatus();
      } else {
        setTwoFASetupError(data?.error || "Không thể tạo mã pin 2FA");
      }
    } catch (error) {
      setTwoFASetupError("Lỗi kết nối đến server. Vui lòng thử lại sau.");
    } finally {
      setTwoFASetupLoading(false);
    }
  };

  const handle2FAChange = async () => {
    if (!twoFAOldCode || twoFAOldCode.length !== 6) {
      setTwoFAChangeError("Vui lòng nhập mã xác thực cũ");
      return;
    }

    if (!twoFANewCode || twoFANewCode.length !== 6) {
      setTwoFAChangeError("Vui lòng nhập mã xác thực mới");
      return;
    }

    if (!twoFAConfirmCode || twoFAConfirmCode.length !== 6) {
      setTwoFAChangeError("Vui lòng nhập lại mã xác thực mới");
      return;
    }

    if (twoFANewCode !== twoFAConfirmCode) {
      setTwoFAChangeError("Mã xác thực mới và nhập lại không khớp");
      return;
    }

    setTwoFAChangeLoading(true);
    setTwoFAChangeError("");

    try {
      const { response, data } = await change2FA({
        oldCode: twoFAOldCode,
        newCode: twoFANewCode,
        confirmCode: twoFAConfirmCode
      });

      if (response?.ok) {
        setShow2FAChangeModal(false);
        setTwoFAOldCode("");
        setTwoFANewCode("");
        setTwoFAConfirmCode("");
        setSuccess(data.message || "Đã đổi mã xác thực 2 lớp thành công");
        showToast(data.message || t("settings.2fa.change_success"), {
          type: "success",
          ...toastPosition,
        });
      } else {
        setTwoFAChangeError(data?.error || "Không thể đổi mã xác thực");
      }
    } catch (error) {
      setTwoFAChangeError("Lỗi kết nối đến server. Vui lòng thử lại sau.");
    } finally {
      setTwoFAChangeLoading(false);
    }
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
        const normalizedUser = normalizeUserProfile(data.user);
        // 1. Cập nhật state cục bộ (như cũ)
        setUser(normalizedUser);

        // 2. ✅ Cập nhật localStorage với user mới nhất từ API
        localStorage.setItem("user", JSON.stringify(normalizedUser));

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
<input 
  type="checkbox" 
  checked={twoFAEnabled}
  onChange={handle2FAToggle}
  disabled={twoFALoading}
/>
<span className="settings-switch__slider" />
</label>
</div>
<p className="settings-detail__hint">{t('settings.2fa.hint')}</p>
{!twoFAHasSecret && (
  <button 
    className="settings-btn settings-btn--primary"
    onClick={() => setShow2FASetupModal(true)}
    disabled={twoFALoading}
  >
    {t('settings.2fa.configure')}
  </button>
)}
{twoFAHasSecret && twoFAEnabled && (
  <button 
    className="settings-btn settings-btn--primary"
    onClick={() => setShow2FAChangeModal(true)}
    disabled={twoFALoading}
    style={{ marginTop: '10px' }}
  >
    Đổi mã xác thực
  </button>
)}
{error && activeKey === "2fa" && (
  <div className="settings-error" style={{color: 'red', marginBottom: '10px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px'}}>
    {error}
  </div>
)}
{success && activeKey === "2fa" && (
  <div className="settings-success" style={{color: 'green', marginBottom: '10px', padding: '10px', backgroundColor: '#e6ffe6', borderRadius: '4px'}}>
    {success}
  </div>
)}
</div>

        );

      case "login-log":

        return (
<div className="settings-detail__body">
<h4>{t('settings.login_log')}</h4>
<p className="settings-detail__desc">{t('settings.login_log.desc')}</p>
<div className="settings-detail__actions">
  <button
    className="settings-btn"
    onClick={fetchLoginLogs}
    disabled={loginLogLoading}
  >
    {loginLogLoading ? t('common.loading') : t('settings.login_log.refresh')}
  </button>
</div>
{loginLogError && (
  <div
    className="settings-error"
    style={{
      color: '#b42318',
      marginBottom: '10px',
      padding: '10px',
      backgroundColor: '#ffe6e6',
      borderRadius: '4px',
    }}
  >
    {loginLogError}
  </div>
)}
<div className="settings-table__wrap">
{loginLogLoading ? (
  <div className="settings-table__empty">{t('common.loading')}</div>
) : loginLogs.length ? (
  <table className="settings-table">
    <thead>
      <tr>
        <th>{t('settings.login_log.col.time')}</th>
        <th>{t('settings.login_log.col.account')}</th>
        <th>{t('settings.login_log.col.device')}</th>
        <th>{t('settings.login_log.col.ip')}</th>
        <th>{t('settings.login_log.col.status')}</th>
      </tr>
    </thead>
    <tbody>
      {loginLogs.map((log, index) => (
        <tr key={log.id || log._id || `${index}-${log?.time || log?.createdAt || log?.timestamp || log?.ipAddress || ''}`}>
          <td>{formatLogTime(log)}</td>
          <td>{resolveLogAccount(log)}</td>
          <td>{resolveLogDevice(log)}</td>
          <td>{resolveLogIp(log)}</td>
          <td>
            <span className={`settings-status-chip settings-status-chip--${(log?.status || '').toString().toLowerCase()}`}>
              {formatLogStatus(log?.status)}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
) : (
  <div className="settings-table__empty">{t('settings.login_log.empty')}</div>
)}
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
  <button
    className="settings-btn settings-btn--danger"
    onClick={handleLogoutAllDevices}
    disabled={logoutAllLoading}
  >
    {logoutAllLoading ? t('common.loading') : t('settings.logout_all.btn')}
  </button>
</div>

        );

      // ====== NHÓM CÀI ĐẶT HỆ THỐNG ======

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

      {/* Modal setup 2FA */}
      {show2FASetupModal && (
        <div className="modal-overlay" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "8px",
            maxWidth: "400px",
            width: "90%"
          }}>
            <h3 className="text-center mb-3">Cấu hình xác thực 2 lớp</h3>
            <p className="text-center text-muted mb-4">
              Vui lòng tạo mã pin 6 số cho xác thực 2 lớp. Mã này sẽ được sử dụng mỗi khi đăng nhập.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); handle2FASetup(); }}>
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control text-center"
                  placeholder="Nhập mã 6 số"
                  value={twoFASetupCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setTwoFASetupCode(value);
                    setTwoFASetupError("");
                  }}
                  maxLength={6}
                  style={{
                    fontSize: twoFASetupCode ? "1.5rem" : "1rem",
                    letterSpacing: twoFASetupCode ? "0.5rem" : "normal",
                    fontWeight: "600",
                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    color: "#1a1a1a",
                    padding: "0.75rem 1rem",
                    border: "2px solid #d1d5db",
                    borderRadius: "8px"
                  }}
                  disabled={twoFASetupLoading}
                />
              </div>
              {twoFASetupError && (
                <div className="alert alert-danger mb-3" role="alert">
                  {twoFASetupError}
                </div>
              )}
              <div className="d-grid gap-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={twoFASetupLoading}
                >
                  {twoFASetupLoading ? "Đang xử lý..." : "Kích hoạt"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShow2FASetupModal(false);
                    setTwoFASetupCode("");
                    setTwoFASetupError("");
                  }}
                  disabled={twoFASetupLoading}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal đổi mã 2FA */}
      {show2FAChangeModal && (
        <div className="modal-overlay" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "8px",
            maxWidth: "450px",
            width: "90%"
          }}>
            <h3 className="text-center mb-3">Đổi mã xác thực 2 lớp</h3>
            <p className="text-center text-muted mb-4">
              Vui lòng nhập mã xác thực cũ và mã xác thực mới (6 số).
            </p>
            <form onSubmit={(e) => { e.preventDefault(); handle2FAChange(); }}>
              <div className="mb-3">
                <label className="form-label">Mã xác thực cũ</label>
                <input
                  type="text"
                  className="form-control text-center"
                  placeholder="Nhập mã cũ 6 số"
                  value={twoFAOldCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setTwoFAOldCode(value);
                    setTwoFAChangeError("");
                  }}
                  maxLength={6}
                  style={{
                    fontSize: twoFAOldCode ? "1.5rem" : "1rem",
                    letterSpacing: twoFAOldCode ? "0.5rem" : "normal",
                    fontWeight: "600",
                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    color: "#1a1a1a",
                    padding: "0.75rem 1rem",
                    border: "2px solid #d1d5db",
                    borderRadius: "8px"
                  }}
                  disabled={twoFAChangeLoading}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Mã xác thực mới</label>
                <input
                  type="text"
                  className="form-control text-center"
                  placeholder="Nhập mã mới 6 số"
                  value={twoFANewCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setTwoFANewCode(value);
                    setTwoFAChangeError("");
                  }}
                  maxLength={6}
                  style={{
                    fontSize: twoFANewCode ? "1.5rem" : "1rem",
                    letterSpacing: twoFANewCode ? "0.5rem" : "normal",
                    fontWeight: "600",
                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    color: "#1a1a1a",
                    padding: "0.75rem 1rem",
                    border: "2px solid #d1d5db",
                    borderRadius: "8px"
                  }}
                  disabled={twoFAChangeLoading}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Nhập lại mã xác thực mới</label>
                <input
                  type="text"
                  className="form-control text-center"
                  placeholder="Nhập lại mã mới 6 số"
                  value={twoFAConfirmCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setTwoFAConfirmCode(value);
                    setTwoFAChangeError("");
                  }}
                  maxLength={6}
                  style={{
                    fontSize: twoFAConfirmCode ? "1.5rem" : "1rem",
                    letterSpacing: twoFAConfirmCode ? "0.5rem" : "normal",
                    fontWeight: "600",
                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    color: "#1a1a1a",
                    padding: "0.75rem 1rem",
                    border: "2px solid #d1d5db",
                    borderRadius: "8px"
                  }}
                  disabled={twoFAChangeLoading}
                />
              </div>
              {twoFAChangeError && (
                <div className="alert alert-danger mb-3" role="alert">
                  {twoFAChangeError}
                </div>
              )}
              <div className="d-grid gap-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={twoFAChangeLoading}
                >
                  {twoFAChangeLoading ? "Đang xử lý..." : "Đổi mã xác thực"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShow2FAChangeModal(false);
                    setTwoFAOldCode("");
                    setTwoFANewCode("");
                    setTwoFAConfirmCode("");
                    setTwoFAChangeError("");
                  }}
                  disabled={twoFAChangeLoading}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
  </div>
  );

}
 