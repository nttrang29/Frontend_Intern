# 🔌 Frontend API Integration Guide

**Base URL:** `http://localhost:8080`  
**Authentication:** Sử dụng JWT Bearer Token trong header

```javascript
const API_BASE_URL = 'http://localhost:8080';
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken'); // hoặc cách lưu token của bạn
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};
```

---

## 📋 Mục lục

1. [Authentication APIs](#authentication-apis)
2. [Profile APIs](#profile-apis)
3. [Wallet APIs](#wallet-apis)
4. [Category APIs](#category-apis)
5. [Transaction APIs](#transaction-apis)
6. [Budget APIs](#budget-apis)
7. [Scheduled Transaction APIs](#scheduled-transaction-apis)
8. [Reminder APIs](#reminder-apis)
9. [Report/Export APIs](#reportexport-apis)
10. [Backup APIs](#backup-apis)
11. [Feedback APIs](#feedback-apis)
12. [Fund APIs](#fund-apis)
13. [Admin APIs](#admin-apis)

---

## 🔐 Authentication APIs

### 1. Đăng ký tài khoản
```javascript
const register = async (data) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
      recaptchaToken: data.recaptchaToken
    })
  });
  return response.json();
};
```

### 2. Xác minh email
```javascript
const verifyEmail = async (email, code) => {
  const response = await fetch(`${API_BASE_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  return response.json();
};
```

### 3. Đăng nhập
```javascript
const login = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (data.accessToken) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  }
  return data;
};
```

### 4. Làm mới token
```javascript
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  const data = await response.json();
  if (data.accessToken) {
    localStorage.setItem('accessToken', data.accessToken);
  }
  return data;
};
```

### 5. Quên mật khẩu
```javascript
const forgotPassword = async (email) => {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
};
```

### 6. Xác thực OTP
```javascript
const verifyOtp = async (email, code) => {
  const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, "Mã xác thực": code })
  });
  return response.json();
};
```

### 7. Đặt lại mật khẩu
```javascript
const resetPassword = async (email, code, newPassword, confirmPassword) => {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      "Mã xác thực": code,
      newPassword,
      confirmPassword
    })
  });
  return response.json();
};
```

---

## 👤 Profile APIs

### 1. Lấy thông tin profile
```javascript
const getProfile = async () => {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 2. Cập nhật profile
```javascript
const updateProfile = async (fullName, avatar) => {
  const response = await fetch(`${API_BASE_URL}/profile/update`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ fullName, avatar })
  });
  return response.json();
};
```

### 3. Đổi mật khẩu
```javascript
const changePassword = async (oldPassword, newPassword, confirmPassword) => {
  const response = await fetch(`${API_BASE_URL}/profile/change-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ oldPassword, newPassword, confirmPassword })
  });
  return response.json();
};
```

---

## 💰 Wallet APIs

### 1. Tạo ví mới
```javascript
const createWallet = async (walletData) => {
  const response = await fetch(`${API_BASE_URL}/wallets/create`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      walletName: walletData.walletName,
      currencyCode: walletData.currencyCode,
      initialBalance: walletData.initialBalance || 0,
      description: walletData.description,
      setAsDefault: walletData.setAsDefault || false,
      walletType: walletData.walletType || 'PERSONAL'
    })
  });
  return response.json();
};
```

### 2. Lấy danh sách ví
```javascript
const getWallets = async () => {
  const response = await fetch(`${API_BASE_URL}/wallets`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 3. Lấy chi tiết ví
```javascript
const getWalletDetails = async (walletId) => {
  const response = await fetch(`${API_BASE_URL}/wallets/${walletId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 4. Cập nhật ví
```javascript
const updateWallet = async (walletId, walletData) => {
  const response = await fetch(`${API_BASE_URL}/wallets/${walletId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(walletData)
  });
  return response.json();
};
```

### 5. Xóa ví
```javascript
const deleteWallet = async (walletId) => {
  const response = await fetch(`${API_BASE_URL}/wallets/${walletId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 6. Đặt ví mặc định
```javascript
const setDefaultWallet = async (walletId) => {
  const response = await fetch(`${API_BASE_URL}/wallets/${walletId}/set-default`, {
    method: 'PATCH',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 7. Chia sẻ ví
```javascript
const shareWallet = async (walletId, email) => {
  const response = await fetch(`${API_BASE_URL}/wallets/${walletId}/share`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email })
  });
  return response.json();
};
```

### 8. Lấy danh sách thành viên ví
```javascript
const getWalletMembers = async (walletId) => {
  const response = await fetch(`${API_BASE_URL}/wallets/${walletId}/members`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 9. Xóa thành viên khỏi ví
```javascript
const removeWalletMember = async (walletId, memberUserId) => {
  const response = await fetch(`${API_BASE_URL}/wallets/${walletId}/members/${memberUserId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 10. Rời khỏi ví
```javascript
const leaveWallet = async (walletId) => {
  const response = await fetch(`${API_BASE_URL}/wallets/${walletId}/leave`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 11. Chuyển tiền giữa các ví
```javascript
const transferMoney = async (fromWalletId, toWalletId, amount, note) => {
  const response = await fetch(`${API_BASE_URL}/wallets/transfer`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      fromWalletId,
      toWalletId,
      amount,
      note
    })
  });
  return response.json();
};
```

### 12. Lấy danh sách ví đích để chuyển tiền
```javascript
const getTransferTargets = async (walletId) => {
  const response = await fetch(`${API_BASE_URL}/wallets/${walletId}/transfer-targets`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 13. Lấy danh sách ví có thể gộp
```javascript
const getMergeCandidates = async (sourceWalletId) => {
  const response = await fetch(`${API_BASE_URL}/wallets/${sourceWalletId}/merge-candidates`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 14. Xem trước gộp ví
```javascript
const getMergePreview = async (targetWalletId, sourceWalletId, targetCurrency) => {
  const response = await fetch(
    `${API_BASE_URL}/wallets/${targetWalletId}/merge-preview?sourceWalletId=${sourceWalletId}&targetCurrency=${targetCurrency}`,
    {
      method: 'GET',
      headers: getAuthHeaders()
    }
  );
  return response.json();
};
```

### 15. Gộp ví
```javascript
const mergeWallets = async (targetWalletId, sourceWalletId, targetCurrency) => {
  const response = await fetch(`${API_BASE_URL}/wallets/${targetWalletId}/merge`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      sourceWalletId,
      targetCurrency
    })
  });
  return response.json();
};
```

---

## 📁 Category APIs

### 1. Tạo danh mục mới
```javascript
const createCategory = async (categoryName, icon, transactionTypeId) => {
  const response = await fetch(`${API_BASE_URL}/categories/create`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      categoryName,
      icon,
      transactionTypeId
    })
  });
  return response.json();
};
```

### 2. Cập nhật danh mục
```javascript
const updateCategory = async (categoryId, categoryName, icon) => {
  const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ categoryName, icon })
  });
  return response.json();
};
```

### 3. Xóa danh mục
```javascript
const deleteCategory = async (categoryId) => {
  const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.text();
};
```

### 4. Lấy danh sách danh mục
```javascript
const getCategories = async () => {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

---

## 💸 Transaction APIs

### 1. Tạo giao dịch chi tiêu
```javascript
const createExpense = async (transactionData) => {
  const response = await fetch(`${API_BASE_URL}/transactions/expense`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      walletId: transactionData.walletId,
      categoryId: transactionData.categoryId,
      amount: transactionData.amount,
      transactionDate: transactionData.transactionDate,
      note: transactionData.note,
      imageUrl: transactionData.imageUrl
    })
  });
  return response.json();
};
```

### 2. Tạo giao dịch thu nhập
```javascript
const createIncome = async (transactionData) => {
  const response = await fetch(`${API_BASE_URL}/transactions/income`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      walletId: transactionData.walletId,
      categoryId: transactionData.categoryId,
      amount: transactionData.amount,
      transactionDate: transactionData.transactionDate,
      note: transactionData.note,
      imageUrl: transactionData.imageUrl
    })
  });
  return response.json();
};
```

### 3. Lấy danh sách giao dịch
```javascript
const getTransactions = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.walletId) params.append('walletId', filters.walletId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.categoryId) params.append('categoryId', filters.categoryId);
  
  const response = await fetch(`${API_BASE_URL}/transactions?${params}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 4. Lấy chi tiết giao dịch
```javascript
const getTransactionDetails = async (transactionId) => {
  const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 5. Cập nhật giao dịch
```javascript
const updateTransaction = async (transactionId, transactionData) => {
  const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(transactionData)
  });
  return response.json();
};
```

### 6. Xóa giao dịch
```javascript
const deleteTransaction = async (transactionId) => {
  const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

---

## 📊 Budget APIs

### 1. Tạo ngân sách
```javascript
const createBudget = async (budgetData) => {
  const response = await fetch(`${API_BASE_URL}/budgets/create`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      categoryId: budgetData.categoryId,
      walletId: budgetData.walletId, // null = tất cả ví
      amountLimit: budgetData.amountLimit,
      startDate: budgetData.startDate,
      endDate: budgetData.endDate,
      note: budgetData.note,
      warningThreshold: budgetData.warningThreshold
    })
  });
  return response.json();
};
```

> ⚠️ Tip: `endDate` phải lớn hơn `startDate`. Backend sẽ từ chối nếu khoảng thời gian trùng với ngân sách khác đang ở trạng thái `PENDING/ACTIVE/WARNING/EXCEEDED`.

### 2. Lấy tất cả ngân sách
```javascript
const getAllBudgets = async () => {
  const response = await fetch(`${API_BASE_URL}/budgets`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

> Response trả về `status`/`budgetStatus` dưới dạng enum (`PENDING`, `ACTIVE`, `WARNING`, `EXCEEDED`, `COMPLETED`). FE có thể map các trạng thái này trực tiếp để hiển thị badge.

### 3. Lấy chi tiết ngân sách
```javascript
const getBudgetDetails = async (budgetId) => {
  const response = await fetch(`${API_BASE_URL}/budgets/${budgetId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 4. Lấy giao dịch thuộc ngân sách
```javascript
const getBudgetTransactions = async (budgetId) => {
  const response = await fetch(`${API_BASE_URL}/budgets/${budgetId}/transactions`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 5. Cập nhật ngân sách
```javascript
const updateBudget = async (budgetId, budgetData) => {
  const response = await fetch(`${API_BASE_URL}/budgets/${budgetId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      amountLimit: budgetData.amountLimit,
      startDate: budgetData.startDate,
      endDate: budgetData.endDate,
      note: budgetData.note,
      warningThreshold: budgetData.warningThreshold
    })
  });
  return response.json();
};
```

> Lưu ý:
> - Không thể thay đổi `categoryId` hoặc `walletId`.
> - `startDate` mới không được nhỏ hơn ngày giao dịch đã phát sinh; backend sẽ báo lỗi nếu vi phạm.
> - Backend tự tính lại trạng thái ngân sách và sẽ từ chối nếu thời gian mới chồng lắp ngân sách khác còn hiệu lực.

---

## ⏰ Scheduled Transaction APIs

### 1. Tạo giao dịch đặt lịch
```javascript
const createScheduledTransaction = async (scheduleData) => {
  const response = await fetch(`${API_BASE_URL}/scheduled-transactions/create`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      walletId: scheduleData.walletId,
      transactionTypeId: scheduleData.transactionTypeId, // 1 = Chi tiêu, 2 = Thu nhập
      categoryId: scheduleData.categoryId,
      amount: scheduleData.amount,
      note: scheduleData.note,
      scheduleType: scheduleData.scheduleType, // ONCE, DAILY, WEEKLY, MONTHLY, YEARLY
      startDate: scheduleData.startDate,
      executionTime: scheduleData.executionTime, // HH:mm:ss
      endDate: scheduleData.endDate, // null cho ONCE
      dayOfWeek: scheduleData.dayOfWeek, // 1-7 cho WEEKLY
      dayOfMonth: scheduleData.dayOfMonth, // 1-31 cho MONTHLY
      month: scheduleData.month, // 1-12 cho YEARLY
      day: scheduleData.day // 1-31 cho YEARLY
    })
  });
  return response.json();
};
```

### 2. Lấy tất cả giao dịch đặt lịch
```javascript
const getAllScheduledTransactions = async () => {
  const response = await fetch(`${API_BASE_URL}/scheduled-transactions`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 3. Lấy chi tiết giao dịch đặt lịch
```javascript
const getScheduledTransactionDetails = async (scheduleId) => {
  const response = await fetch(`${API_BASE_URL}/scheduled-transactions/${scheduleId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 4. Xóa giao dịch đặt lịch
```javascript
const deleteScheduledTransaction = async (scheduleId) => {
  const response = await fetch(`${API_BASE_URL}/scheduled-transactions/${scheduleId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

---

## 🔔 Reminder APIs

### 1. Lấy cấu hình nhắc nhở
```javascript
const getReminderSettings = async () => {
  const response = await fetch(`${API_BASE_URL}/reminders`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 2. Cập nhật cấu hình nhắc nhở
```javascript
const updateReminderSettings = async (enabled, reminderTime) => {
  const response = await fetch(`${API_BASE_URL}/reminders`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      enabled,
      reminderTime // Format: "HH:mm" (ví dụ: "20:00")
    })
  });
  return response.json();
};
```

---

## 📄 Report/Export APIs

### 1. Export báo cáo (tổng quát)
```javascript
const exportReport = async (reportType, format, filters = {}) => {
  const response = await fetch(`${API_BASE_URL}/reports/export`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      reportType, // TRANSACTIONS, BUDGETS, SUMMARY
      format, // EXCEL, PDF
      walletId: filters.walletId || null,
      startDate: filters.startDate || null,
      endDate: filters.endDate || null
    })
  });
  
  // Xử lý download file
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report.${format.toLowerCase()}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
```

### 2. Export báo cáo giao dịch
```javascript
const exportTransactions = async (format, filters = {}) => {
  const response = await fetch(`${API_BASE_URL}/reports/export/transactions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      format, // EXCEL, PDF
      walletId: filters.walletId || null,
      startDate: filters.startDate || null,
      endDate: filters.endDate || null
    })
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions.${format.toLowerCase()}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
```

### 3. Export báo cáo ngân sách
```javascript
const exportBudgets = async (format, filters = {}) => {
  const response = await fetch(`${API_BASE_URL}/reports/export/budgets`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      format, // EXCEL, PDF
      walletId: filters.walletId || null
    })
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `budgets.${format.toLowerCase()}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
```

### 4. Export báo cáo tổng quan
```javascript
const exportSummary = async (format, filters = {}) => {
  const response = await fetch(`${API_BASE_URL}/reports/export/summary`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      format, // EXCEL, PDF
      walletId: filters.walletId || null,
      startDate: filters.startDate || null,
      endDate: filters.endDate || null
    })
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `summary.${format.toLowerCase()}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
```

---

## 💾 Backup APIs

### 1. Kích hoạt backup thủ công
```javascript
const triggerBackup = async () => {
  const response = await fetch(`${API_BASE_URL}/backups/trigger`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 2. Lấy lịch sử backup
```javascript
const getBackupHistory = async () => {
  const response = await fetch(`${API_BASE_URL}/backups/history`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

---

## 💬 Feedback APIs

### 1. Gửi phản hồi/báo lỗi
```javascript
const createFeedback = async (feedbackData) => {
  const response = await fetch(`${API_BASE_URL}/feedback`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      type: feedbackData.type, // FEEDBACK, BUG, FEATURE, OTHER
      subject: feedbackData.subject,
      message: feedbackData.message,
      contactEmail: feedbackData.contactEmail // optional
    })
  });
  return response.json();
};
```

### 2. Lấy danh sách phản hồi của user
```javascript
const getUserFeedbacks = async () => {
  const response = await fetch(`${API_BASE_URL}/feedback`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 3. Lấy chi tiết một phản hồi
```javascript
const getFeedbackDetails = async (feedbackId) => {
  const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

---

## 💰 Fund APIs (Quỹ Tiết Kiệm)

### 1. Tạo quỹ mới
```javascript
const createFund = async (fundData) => {
  const response = await fetch(`${API_BASE_URL}/funds`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      fundName: fundData.fundName,
      targetWalletId: fundData.targetWalletId,
      fundType: fundData.fundType, // PERSONAL, GROUP
      hasDeadline: fundData.hasDeadline, // true, false
      
      // Cho quỹ có kỳ hạn
      targetAmount: fundData.targetAmount,
      frequency: fundData.frequency, // DAILY, WEEKLY, MONTHLY, YEARLY
      amountPerPeriod: fundData.amountPerPeriod,
      startDate: fundData.startDate, // YYYY-MM-DD
      endDate: fundData.endDate, // YYYY-MM-DD
      
      // Cho quỹ không kỳ hạn (tùy chọn)
      // frequency, amountPerPeriod, startDate có thể có hoặc không
      
      // Nhắc nhở
      reminderEnabled: fundData.reminderEnabled || false,
      reminderType: fundData.reminderType, // DAILY, WEEKLY, MONTHLY, YEARLY
      reminderTime: fundData.reminderTime, // HH:mm:ss
      reminderDayOfWeek: fundData.reminderDayOfWeek, // 1-7 cho WEEKLY
      reminderDayOfMonth: fundData.reminderDayOfMonth, // 1-31 cho MONTHLY
      reminderMonth: fundData.reminderMonth, // 1-12 cho YEARLY
      reminderDay: fundData.reminderDay, // 1-31 cho YEARLY
      
      // Tự động nạp tiền
      autoDepositEnabled: fundData.autoDepositEnabled || false,
      autoDepositType: fundData.autoDepositType, // FOLLOW_REMINDER, CUSTOM_SCHEDULE
      sourceWalletId: fundData.sourceWalletId,
      autoDepositScheduleType: fundData.autoDepositScheduleType, // Cho CUSTOM_SCHEDULE
      autoDepositTime: fundData.autoDepositTime, // HH:mm:ss
      autoDepositDayOfWeek: fundData.autoDepositDayOfWeek,
      autoDepositDayOfMonth: fundData.autoDepositDayOfMonth,
      autoDepositMonth: fundData.autoDepositMonth,
      autoDepositDay: fundData.autoDepositDay,
      autoDepositAmount: fundData.autoDepositAmount,
      
      note: fundData.note,
      
      // Thành viên (chỉ cho GROUP)
      members: fundData.members || [] // [{ email: "...", role: "CONTRIBUTOR" }]
    })
  });
  return response.json();
};
```

### 2. Lấy tất cả quỹ của user
```javascript
const getAllFunds = async () => {
  const response = await fetch(`${API_BASE_URL}/funds`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 3. Lấy quỹ cá nhân
```javascript
const getPersonalFunds = async (hasDeadline = null) => {
  const params = hasDeadline !== null ? `?hasDeadline=${hasDeadline}` : '';
  const response = await fetch(`${API_BASE_URL}/funds/personal${params}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 4. Lấy quỹ nhóm
```javascript
const getGroupFunds = async (hasDeadline = null) => {
  const params = hasDeadline !== null ? `?hasDeadline=${hasDeadline}` : '';
  const response = await fetch(`${API_BASE_URL}/funds/group${params}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 5. Lấy quỹ tham gia (không phải chủ quỹ)
```javascript
const getParticipatedFunds = async () => {
  const response = await fetch(`${API_BASE_URL}/funds/participated`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 6. Lấy chi tiết một quỹ
```javascript
const getFundDetails = async (fundId) => {
  const response = await fetch(`${API_BASE_URL}/funds/${fundId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 7. Cập nhật quỹ
```javascript
const updateFund = async (fundId, fundData) => {
  const response = await fetch(`${API_BASE_URL}/funds/${fundId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      fundName: fundData.fundName,
      frequency: fundData.frequency,
      amountPerPeriod: fundData.amountPerPeriod,
      startDate: fundData.startDate,
      endDate: fundData.endDate, // Chỉ cho quỹ có kỳ hạn
      note: fundData.note,
      reminderEnabled: fundData.reminderEnabled,
      reminderType: fundData.reminderType,
      reminderTime: fundData.reminderTime,
      reminderDayOfWeek: fundData.reminderDayOfWeek,
      reminderDayOfMonth: fundData.reminderDayOfMonth,
      reminderMonth: fundData.reminderMonth,
      reminderDay: fundData.reminderDay,
      autoDepositEnabled: fundData.autoDepositEnabled,
      autoDepositType: fundData.autoDepositType,
      sourceWalletId: fundData.sourceWalletId,
      autoDepositScheduleType: fundData.autoDepositScheduleType,
      autoDepositTime: fundData.autoDepositTime,
      autoDepositDayOfWeek: fundData.autoDepositDayOfWeek,
      autoDepositDayOfMonth: fundData.autoDepositDayOfMonth,
      autoDepositMonth: fundData.autoDepositMonth,
      autoDepositDay: fundData.autoDepositDay,
      autoDepositAmount: fundData.autoDepositAmount,
      members: fundData.members // Cho quỹ nhóm
    })
  });
  return response.json();
};
```

### 8. Đóng quỹ
```javascript
const closeFund = async (fundId) => {
  const response = await fetch(`${API_BASE_URL}/funds/${fundId}/close`, {
    method: 'PUT',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 9. Xóa quỹ
```javascript
const deleteFund = async (fundId) => {
  const response = await fetch(`${API_BASE_URL}/funds/${fundId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 10. Nạp tiền vào quỹ
```javascript
const depositToFund = async (fundId, amount) => {
  const response = await fetch(`${API_BASE_URL}/funds/${fundId}/deposit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ amount })
  });
  return response.json();
};
```

### 11. Rút tiền từ quỹ (chỉ cho quỹ không kỳ hạn)
```javascript
const withdrawFromFund = async (fundId, amount) => {
  const response = await fetch(`${API_BASE_URL}/funds/${fundId}/withdraw`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ amount })
  });
  return response.json();
};
```

### 12. Kiểm tra ví có đang được sử dụng
```javascript
const checkWalletUsed = async (walletId) => {
  const response = await fetch(`${API_BASE_URL}/funds/check-wallet/${walletId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

---

## ⭐ App Review APIs (Đánh giá ứng dụng)

### 1. Gửi đánh giá ứng dụng
```javascript
const createAppReview = async (reviewData) => {
  const response = await fetch(`${API_BASE_URL}/app-reviews`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      displayName: reviewData.displayName || null, // Optional, mặc định "Người dùng ẩn danh"
      rating: reviewData.rating, // 1-5 sao
      content: reviewData.content // Required
    })
  });
  return response.json();
};
```

**Lưu ý:**
- Mỗi user chỉ được đánh giá một lần
- Hệ thống tự động gửi thông báo cho admin khi có đánh giá mới

### 2. Lấy đánh giá của user hiện tại
```javascript
const getMyReview = async () => {
  const response = await fetch(`${API_BASE_URL}/app-reviews/my-review`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};

// Response example:
// {
//   "hasReview": true,
//   "review": {
//     "reviewId": 1,
//     "displayName": "Nguyễn Văn A",
//     "rating": 5,
//     "content": "Ứng dụng tuyệt vời!",
//     "status": "ANSWERED",
//     "adminReply": "Cảm ơn bạn!",
//     "repliedAt": "2024-01-01T11:00:00",
//     ...
//   }
// }
```

### 3. Lấy thống kê đánh giá (public)
```javascript
const getReviewStats = async () => {
  const response = await fetch(`${API_BASE_URL}/app-reviews/stats`, {
    method: 'GET',
    headers: getAuthHeaders() // Có thể bỏ headers nếu endpoint là public
  });
  return response.json();
};

// Response example:
// {
//   "totalReviews": 15,
//   "pendingCount": 3,
//   "answeredCount": 12,
//   "averageRating": 4.5,
//   "repliedCount": 12
// }
```

**Lưu ý:** Dùng để hiển thị "4.5/5 dựa trên 15 đánh giá" trên trang chủ

---

## 🔔 Notification APIs (Thông báo)

### 1. Lấy tất cả thông báo
```javascript
const getNotifications = async () => {
  const response = await fetch(`${API_BASE_URL}/notifications`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

**Lưu ý:**
- Tự động phân biệt user/admin dựa trên role
- Admin nhận thông báo về đánh giá/feedback mới
- User nhận thông báo về phản hồi từ admin

### 2. Lấy thông báo chưa đọc
```javascript
const getUnreadNotifications = async () => {
  const response = await fetch(`${API_BASE_URL}/notifications/unread`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 3. Đếm số thông báo chưa đọc
```javascript
const getUnreadNotificationCount = async () => {
  const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};

// Response: { "unreadCount": 5 }
```

**Lưu ý:** Dùng để hiển thị badge số trên icon thông báo

### 4. Đánh dấu thông báo đã đọc
```javascript
const markNotificationAsRead = async (notificationId) => {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 5. Đánh dấu tất cả thông báo đã đọc
```javascript
const markAllNotificationsAsRead = async () => {
  const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
    method: 'PUT',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 6. Xóa thông báo
```javascript
const deleteNotification = async (notificationId) => {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

---

## 👨‍💼 Admin APIs

### 1. Admin - Lấy tất cả feedback
```javascript
const getAllFeedbacks = async (status = null, type = null) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (type) params.append('type', type);
  
  const response = await fetch(`${API_BASE_URL}/admin/feedbacks?${params}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 2. Admin - Lấy chi tiết feedback
```javascript
const getFeedbackById = async (feedbackId) => {
  const response = await fetch(`${API_BASE_URL}/admin/feedbacks/${feedbackId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 3. Admin - Cập nhật trạng thái feedback
```javascript
const updateFeedbackStatus = async (feedbackId, status) => {
  const response = await fetch(`${API_BASE_URL}/admin/feedbacks/${feedbackId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });
  return response.json();
};
```

### 4. Admin - Thêm phản hồi cho user
```javascript
const addAdminResponse = async (feedbackId, adminResponse) => {
  const response = await fetch(`${API_BASE_URL}/admin/feedbacks/${feedbackId}/response`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ adminResponse })
  });
  return response.json();
};
```

### 5. Admin - Lấy thống kê feedback
```javascript
const getFeedbackStats = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/feedbacks/stats`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 6. Admin - Lấy danh sách user
```javascript
const getAllUsers = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 7. Admin - Xem chi tiết user
```javascript
const getUserDetail = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/detail`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 8. Admin - Khóa/Mở khóa user
```javascript
const lockUser = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/lock`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return response.json();
};

const unlockUser = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/unlock`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 9. Admin - Đổi role user
```javascript
const changeUserRole = async (userId, role) => {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role })
  });
  return response.json();
};
```

### 10. Admin - Xem log hành động
```javascript
const getAdminLogs = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/users/logs`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 11. Admin - Xem login logs của user
```javascript
const getUserLoginLogs = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/login-logs`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 12. Admin - Xóa user
```javascript
const deleteUser = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.status === 204;
};
```

### 13. Admin - Lấy tất cả đánh giá ứng dụng
```javascript
const getAllAppReviews = async (status = null) => {
  const params = status ? `?status=${status}` : '';
  const response = await fetch(`${API_BASE_URL}/admin/app-reviews${params}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};

// Response:
// {
//   "reviews": [...],
//   "total": 15,
//   "stats": {
//     "totalReviews": 15,
//     "pendingCount": 3,
//     "answeredCount": 12,
//     "averageRating": 4.5,
//     "repliedCount": 12
//   }
// }
```

### 14. Admin - Lấy chi tiết đánh giá
```javascript
const getAppReviewById = async (reviewId) => {
  const response = await fetch(`${API_BASE_URL}/admin/app-reviews/${reviewId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 15. Admin - Phản hồi đánh giá
```javascript
const replyToAppReview = async (reviewId, adminReply) => {
  const response = await fetch(`${API_BASE_URL}/admin/app-reviews/${reviewId}/reply`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ adminReply })
  });
  return response.json();
};
```

**Lưu ý:** 
- Tự động chuyển status sang `ANSWERED`
- Hệ thống tự động gửi thông báo cho user

### 16. Admin - Lấy thống kê đánh giá
```javascript
const getAppReviewStats = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/app-reviews/stats`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

### 17. Admin - Xóa đánh giá
```javascript
const deleteAppReview = async (reviewId) => {
  const response = await fetch(`${API_BASE_URL}/admin/app-reviews/${reviewId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.json();
};
```

**Lưu ý:** Tất cả Admin APIs yêu cầu role `ADMIN` trong token

---

## 📝 Ví dụ sử dụng với Axios

Nếu bạn sử dụng Axios, có thể tạo một instance như sau:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Thêm interceptor để tự động thêm token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Thêm interceptor để xử lý lỗi 401 (token hết hạn)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Thử refresh token
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          });
          localStorage.setItem('accessToken', response.data.accessToken);
          // Retry request với token mới
          error.config.headers.Authorization = `Bearer ${response.data.accessToken}`;
          return axios.request(error.config);
        } catch (refreshError) {
          // Refresh token cũng hết hạn, redirect về login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Sử dụng
export const createFund = async (fundData) => {
  const response = await api.post('/funds', fundData);
  return response.data;
};

export const getAllFunds = async () => {
  const response = await api.get('/funds');
  return response.data;
};
```

---

## 🔑 Enums và Constants

```javascript
// Feedback Types
export const FEEDBACK_TYPE = {
  FEEDBACK: 'FEEDBACK',
  BUG: 'BUG',
  FEATURE: 'FEATURE',
  OTHER: 'OTHER'
};

// Feedback Status
export const FEEDBACK_STATUS = {
  PENDING: 'PENDING',
  REVIEWED: 'REVIEWED',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
};

// Fund Types
export const FUND_TYPE = {
  PERSONAL: 'PERSONAL',
  GROUP: 'GROUP'
};

// Fund Status
export const FUND_STATUS = {
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  COMPLETED: 'COMPLETED'
};

// Budget Status
export const BUDGET_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  WARNING: 'WARNING',
  EXCEEDED: 'EXCEEDED',
  COMPLETED: 'COMPLETED'
};

// Fund Frequency
export const FUND_FREQUENCY = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY'
};

// Reminder Type
export const REMINDER_TYPE = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY'
};

// Auto Deposit Type
export const AUTO_DEPOSIT_TYPE = {
  FOLLOW_REMINDER: 'FOLLOW_REMINDER',
  CUSTOM_SCHEDULE: 'CUSTOM_SCHEDULE'
};

// Fund Member Role
export const FUND_MEMBER_ROLE = {
  OWNER: 'OWNER',
  CONTRIBUTOR: 'CONTRIBUTOR'
};

// Schedule Type
export const SCHEDULE_TYPE = {
  ONCE: 'ONCE',
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY'
};

// Schedule Status
export const SCHEDULE_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

// Export Format
export const EXPORT_FORMAT = {
  EXCEL: 'EXCEL',
  PDF: 'PDF'
};

// Report Type
export const REPORT_TYPE = {
  TRANSACTIONS: 'TRANSACTIONS',
  BUDGETS: 'BUDGETS',
  SUMMARY: 'SUMMARY'
};

// Budget Status
export const BUDGET_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  WARNING: 'WARNING',
  EXCEEDED: 'EXCEEDED',
  COMPLETED: 'COMPLETED'
};

// App Review Status
export const APP_REVIEW_STATUS = {
  PENDING: 'PENDING',
  ANSWERED: 'ANSWERED'
};

// Notification Types
export const NOTIFICATION_TYPE = {
  NEW_APP_REVIEW: 'NEW_APP_REVIEW',
  REVIEW_REPLIED: 'REVIEW_REPLIED',
  NEW_FEEDBACK: 'NEW_FEEDBACK',
  FEEDBACK_REPLIED: 'FEEDBACK_REPLIED',
  BUDGET_WARNING: 'BUDGET_WARNING',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT'
};
```

---

## ⚠️ Lưu ý quan trọng

1. **Token Management**: Luôn lưu token vào localStorage hoặc secure storage
2. **Error Handling**: Luôn xử lý lỗi và hiển thị thông báo cho user
3. **Loading States**: Hiển thị loading khi đang gọi API
4. **Validation**: Validate dữ liệu trước khi gửi lên server
5. **Date Format**: Sử dụng format `YYYY-MM-DD` cho dates và `HH:mm:ss` cho times
6. **File Download**: Xử lý download file cho export APIs
7. **CORS**: Đảm bảo backend đã cấu hình CORS cho frontend URL

---

## 📞 Hỗ trợ

Nếu gặp vấn đề khi tích hợp API:
1. Kiểm tra token có còn hạn không
2. Kiểm tra request body format đúng chưa
3. Kiểm tra headers có đầy đủ không
4. Kiểm tra user có quyền truy cập resource không
5. Xem console log để debug

