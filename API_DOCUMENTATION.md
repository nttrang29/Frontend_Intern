# 📚 API Documentation - Personal Finance App

**Base URL:** `http://localhost:8080`

**Authentication:** Sử dụng JWT Bearer Token trong header
```
Authorization: Bearer <accessToken>
```

---

## 🔐 Authentication APIs

### 1. Đăng ký tài khoản
**POST** `/auth/register`

**Request Body:**
```json
{
  "fullName": "Nguyễn Văn A",
  "email": "user@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "recaptchaToken": "token_from_recaptcha"
}
```

**Response:**
```json
{
  "message": "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản."
}
```

**Lưu ý:**
- Mật khẩu phải ≥8 ký tự, có chữ hoa, thường, số, ký tự đặc biệt
- Email sẽ nhận mã xác minh 6 chữ số

---

### 2. Xác minh email
**POST** `/auth/verify`

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "Xác minh thành công",
  "accessToken": "jwt_token_here",
  "refreshToken": "refresh_token_here"
}
```

---

### 3. Đăng nhập
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "message": "Đăng nhập thành công",
  "accessToken": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "user": {
    "userId": 1,
    "fullName": "Nguyễn Văn A",
    "email": "user@example.com",
    "provider": "local",
    "avatar": null,
    "enabled": true
  }
}
```

---

### 4. Làm mới token
**POST** `/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "accessToken": "new_jwt_token_here",
  "message": "Làm mới token thành công"
}
```

---

### 5. Quên mật khẩu
**POST** `/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Mã xác thực đã gửi đến email"
}
```

---

### 6. Xác thực OTP
**POST** `/auth/verify-otp`

**Request Body:**
```json
{
  "email": "user@example.com",
  "Mã xác thực": "123456"
}
```

**Response:**
```json
{
  "message": "Xác thực mã thành công"
}
```

---

### 7. Đặt lại mật khẩu
**POST** `/auth/reset-password`

**Request Body:**
```json
{
  "email": "user@example.com",
  "Mã xác thực": "123456",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

**Response:**
```json
{
  "message": "Đổi mật khẩu thành công"
}
```

---

### 8. Đăng nhập Google OAuth2
**GET** `/auth/oauth2/authorization/google`

Redirect đến Google login, sau đó redirect về:
`http://localhost:3000/oauth/callback?token=<jwt_token>`

---

## 👤 Profile APIs

### 1. Lấy thông tin profile
**GET** `/profile`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "user": {
    "userId": 1,
    "fullName": "Nguyễn Văn A",
    "email": "user@example.com",
    "provider": "local",
    "avatar": "base64_or_url",
    "enabled": true
  }
}
```

---

### 2. Cập nhật profile
**POST** `/profile/update`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "fullName": "Nguyễn Văn B",
  "avatar": "base64_string_or_url"
}
```

**Response:**
```json
{
  "message": "Cập nhật profile thành công",
  "user": { ... }
}
```

---

### 3. Đổi mật khẩu
**POST** `/profile/change-password`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "oldPassword": "OldPassword123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

**Lưu ý:** Nếu user chưa có password (Google user), không cần `oldPassword`

**Response:**
```json
{
  "message": "Đổi mật khẩu thành công"
}
```

---

## 💰 Wallet APIs

### 1. Tạo ví mới
**POST** `/wallets/create`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "walletName": "Ví chính",
  "currencyCode": "VND",
  "initialBalance": 0.0,
  "description": "Ví mặc định",
  "setAsDefault": true,
  "walletType": "PERSONAL"
}
```

**Response:**
```json
{
  "message": "Tạo ví thành công",
  "wallet": {
    "walletId": 1,
    "walletName": "Ví chính",
    "currencyCode": "VND",
    "balance": 0.0,
    "description": "Ví mặc định",
    "isDefault": true,
    "walletType": "PERSONAL"
  }
}
```

---

### 2. Lấy danh sách ví
**GET** `/wallets`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters (optional):**
- Có thể filter theo `walletType` ở frontend: `PERSONAL` hoặc `GROUP`

**Response:**
```json
{
  "wallets": [
    {
      "walletId": 1,
      "walletName": "Ví chính",
      "walletType": "PERSONAL",
      "currencyCode": "VND",
      "balance": 1000000.00,
      "description": "Ví mặc định",
      "myRole": "OWNER",
      "ownerId": 1,
      "ownerName": "Nguyễn Văn A",
      "totalMembers": 1,
      "isDefault": true,
      "createdAt": "2024-01-01T10:00:00",
      "updatedAt": "2024-01-01T10:00:00"
    },
    {
      "walletId": 2,
      "walletName": "Ví nhóm gia đình",
      "walletType": "GROUP",
      "currencyCode": "VND",
      "balance": 5000000.00,
      "description": "Ví chung gia đình",
      "myRole": "OWNER",
      "ownerId": 1,
      "ownerName": "Nguyễn Văn A",
      "totalMembers": 3,
      "isDefault": false,
      "createdAt": "2024-01-01T10:00:00",
      "updatedAt": "2024-01-01T10:00:00"
    }
  ],
  "total": 2
}
```

**Lưu ý về Wallet Groups:**
- `walletType = "PERSONAL"`: Ví cá nhân (chỉ owner sử dụng)
- `walletType = "GROUP"`: Ví nhóm (có thể chia sẻ với nhiều thành viên)
- Frontend có thể filter/hiển thị riêng theo `walletType` để tạo "WalletGroupsPage"
- Tất cả ví (PERSONAL và GROUP) đều được trả về trong cùng một API
- Có thể phân loại ở frontend dựa trên field `walletType`

---

### 3. Lấy chi tiết ví
**GET** `/wallets/{walletId}`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "wallet": {
    "walletId": 1,
    "walletName": "Ví chính",
    "currencyCode": "VND",
    "balance": 1000000.00,
    "description": "Ví mặc định",
    "isDefault": true,
    "walletType": "PERSONAL",
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00"
  }
}
```

---

### 4. Cập nhật ví
**PUT** `/wallets/{walletId}`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "walletName": "Ví mới",
  "description": "Mô tả mới",
  "currencyCode": "VND",
  "balance": 0.0,
  "setAsDefault": false,
  "walletType": "GROUP"
}
```

**Lưu ý:**
- Chỉ có thể sửa balance nếu ví chưa có giao dịch
- **Ví mặc định (`setAsDefault`):**
  - `true`: Đặt ví này làm ví mặc định (tự động bỏ ví mặc định cũ)
  - `false`: Bỏ ví mặc định (nếu ví này đang là ví mặc định)
  - `null` hoặc không gửi: Không thay đổi trạng thái ví mặc định
- Có thể chuyển đổi loại ví: `PERSONAL` → `GROUP`
- **Không thể** chuyển từ `GROUP` → `PERSONAL` (sẽ báo lỗi)
- Khi chuyển `PERSONAL` → `GROUP`, hệ thống tự động đảm bảo owner được thêm vào WalletMember (nếu chưa có)

**Response:**
```json
{
  "message": "Cập nhật ví thành công",
  "wallet": {
    "walletId": 1,
    "walletName": "Ví mới",
    "walletType": "GROUP",
    "currencyCode": "VND",
    "balance": 0.0,
    "description": "Mô tả mới",
    "isDefault": false
  }
}
```

**Ví dụ chuyển đổi loại ví:**
```json
// Chuyển từ ví cá nhân sang ví nhóm
{
  "walletName": "Ví nhóm gia đình",
  "walletType": "GROUP"
}

// Lỗi: Không thể chuyển từ ví nhóm về ví cá nhân
{
  "walletType": "PERSONAL"
}
// Response: {
//   "error": "Không thể chuyển ví nhóm về ví cá nhân. Vui lòng xóa các thành viên trước."
// }
```

---

### 5. Xóa ví
**DELETE** `/wallets/{walletId}`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Xóa ví thành công",
  "deletedWallet": {
    "deletedWalletId": 1,
    "deletedWalletName": "Ví cũ",
    "balance": 0.0,
    "currencyCode": "VND",
    "wasDefault": false,
    "membersRemoved": 0,
    "transactionsDeleted": 0
  }
}
```

**Lưu ý:** 
- Không thể xóa ví có giao dịch hoặc ví mặc định
- Response bao gồm:
  - `wasDefault`: Ví có phải là ví mặc định không (luôn là `false` vì không thể xóa ví mặc định)
  - `membersRemoved`: Số thành viên đã bị xóa khỏi ví
  - `transactionsDeleted`: Số giao dịch đã bị xóa (luôn là `0` vì không thể xóa ví có giao dịch)

**Error Response:**
```json
{
  "error": "Không thể xóa ví. Bạn phải xóa các giao dịch trong ví này trước."
}
```
hoặc
```json
{
  "error": "Không thể xóa ví mặc định."
}
```
hoặc
```json
{
  "error": "Lỗi máy chủ nội bộ: ..."
}
```

---

### 6. Đặt ví mặc định
**PATCH** `/wallets/{walletId}/set-default`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Đặt ví mặc định thành công"
}
```

---

### 7. Chia sẻ ví
**POST** `/wallets/{walletId}/share`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "email": "friend@example.com"
}
```

**Response:**
```json
{
  "message": "Chia sẻ ví thành công",
  "member": {
    "memberId": 2,
    "userId": 2,
    "fullName": "Người bạn",
    "email": "friend@example.com",
    "avatar": null,
    "role": "MEMBER",
    "joinedAt": "2024-01-01T10:00:00"
  }
}
```

---

### 8. Lấy danh sách thành viên ví
**GET** `/wallets/{walletId}/members`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "members": [
    {
      "memberId": 1,
      "userId": 1,
      "fullName": "Nguyễn Văn A",
      "email": "user@example.com",
      "avatar": null,
      "role": "OWNER",
      "joinedAt": "2024-01-01T10:00:00"
    }
  ],
  "total": 1
}
```

---

### 9. Xóa thành viên khỏi ví
**DELETE** `/wallets/{walletId}/members/{memberUserId}`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Xóa thành viên thành công"
}
```

---

### 10. Rời khỏi ví
**POST** `/wallets/{walletId}/leave`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Bạn đã rời khỏi ví thành công"
}
```

**Lưu ý:** Owner không thể rời ví

---

### 11. Kiểm tra quyền truy cập ví
**GET** `/wallets/{walletId}/access`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "hasAccess": true,
  "isOwner": true,
  "role": "OWNER"
}
```

---

### 12. Chuyển tiền giữa các ví
**POST** `/wallets/transfer`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "fromWalletId": 1,
  "toWalletId": 2,
  "amount": 100000.00,
  "note": "Chuyển tiền"
}
```

**Response:**
```json
{
  "message": "Chuyển tiền thành công",
  "transfer": {
    "transferId": 1,
    "amount": 100000.00,
    "currencyCode": "VND",
    "transferredAt": "2024-01-01T10:00:00",
    "note": "Chuyển tiền",
    "status": "COMPLETED",
    "fromWalletId": 1,
    "fromWalletName": "Ví nguồn",
    "fromWalletBalanceBefore": 1000000.00,
    "fromWalletBalanceAfter": 900000.00,
    "toWalletId": 2,
    "toWalletName": "Ví đích",
    "toWalletBalanceBefore": 0.00,
    "toWalletBalanceAfter": 100000.00
  }
}
```

---

### 13. Lấy danh sách ví đích để chuyển tiền
**GET** `/wallets/{walletId}/transfer-targets`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "sourceWallet": {
    "walletId": 1,
    "walletName": "Ví nguồn",
    "currencyCode": "VND",
    "balance": 1000000.00
  },
  "targetWallets": [
    {
      "walletId": 2,
      "walletName": "Ví đích",
      "currencyCode": "VND",
      "balance": 0.00
    }
  ],
  "total": 1
}
```

---

### 14. Lấy danh sách ví có thể gộp
**GET** `/wallets/{sourceWalletId}/merge-candidates`

**Headers:** `Authorization: Bearer <token>`

**Mô tả:** Lấy danh sách tất cả ví mà user có thể gộp với ví nguồn. Chỉ trả về các ví mà user là owner.

**Response:**
```json
{
  "candidateWallets": [
    {
      "walletId": 2,
      "walletName": "Ví có thể gộp",
      "currencyCode": "VND",
      "balance": 500000.00,
      "transactionCount": 5,
      "isDefault": false,
      "canMerge": true,
      "reason": null
    }
  ],
  "ineligibleWallets": [],
  "total": 1
}
```

**Lưu ý:**
- Chỉ trả về các ví mà user là OWNER
- Không bao gồm chính ví nguồn
- Có thể gộp ví khác loại tiền tệ (sẽ tự động chuyển đổi)

---

### 15. Xem trước gộp ví
**GET** `/wallets/{targetWalletId}/merge-preview?sourceWalletId={sourceWalletId}&targetCurrency={currency}`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `sourceWalletId` (required): ID của ví nguồn sẽ bị xóa
- `targetCurrency` (required): Loại tiền tệ sau khi gộp (VD: "VND", "USD")

**Mô tả:** Xem trước kết quả trước khi thực hiện gộp ví. Hiển thị số dư, số giao dịch, và các cảnh báo.

**Response:**
```json
{
  "preview": {
    "sourceWalletId": 1,
    "sourceWalletName": "Ví nguồn",
    "sourceCurrency": "VND",
    "sourceBalance": 1000000.00,
    "sourceTransactionCount": 10,
    "sourceIsDefault": false,
    "targetWalletId": 2,
    "targetWalletName": "Ví đích",
    "targetCurrency": "USD",
    "targetBalance": 50.00,
    "targetTransactionCount": 5,
    "finalWalletName": "Ví đích",
    "finalCurrency": "USD",
    "finalBalance": 91.10,
    "totalTransactions": 15,
    "willTransferDefaultFlag": false,
    "canProceed": true,
    "warnings": [
      "Số dư sẽ được chuyển đổi sang USD"
    ]
  }
}
```

**Lưu ý:**
- Nếu ví nguồn và ví đích khác currency, số dư sẽ được chuyển đổi tự động
- Nếu ví nguồn là ví mặc định, flag sẽ được chuyển sang ví đích
- Tất cả transactions từ ví nguồn sẽ được chuyển sang ví đích
- Nếu transactions có currency khác, amount sẽ được chuyển đổi và lưu thông tin gốc

---

### 16. Gộp ví
**POST** `/wallets/{targetWalletId}/merge`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "sourceWalletId": 1,
  "targetCurrency": "VND"
}
```

**Mô tả:** Thực hiện gộp ví nguồn vào ví đích. Ví nguồn sẽ bị xóa sau khi gộp.

**Quy trình gộp ví:**
1. Kiểm tra quyền sở hữu cả 2 ví
2. Chuyển đổi số dư nếu khác currency
3. Chuyển tất cả transactions từ ví nguồn sang ví đích
4. Chuyển đổi amount của transactions nếu cần (lưu thông tin gốc)
5. Chuyển tất cả members từ ví nguồn sang ví đích (nếu chưa có)
6. Chuyển flag "default wallet" nếu ví nguồn là default
7. Xóa ví nguồn và các dữ liệu liên quan
8. Lưu lịch sử merge

**Response:**
```json
{
  "success": true,
  "message": "Gộp ví thành công",
  "result": {
    "success": true,
    "message": "Gộp ví thành công",
    "targetWalletId": 2,
    "targetWalletName": "Ví đích",
    "finalBalance": 1500000.00,
    "finalCurrency": "VND",
    "mergedTransactions": 10,
    "sourceWalletName": "Ví nguồn",
    "wasDefaultTransferred": false,
    "mergeHistoryId": 1,
    "mergedAt": "2024-01-01T10:00:00"
  }
}
```

**Lưu ý quan trọng:**
- ⚠️ **Ví nguồn sẽ bị XÓA** sau khi gộp thành công
- Chỉ có thể gộp ví mà bạn là OWNER của cả 2 ví
- Không thể gộp ví với chính nó
- Tất cả transactions sẽ được giữ nguyên, chỉ chuyển sang ví đích
- Nếu transactions có currency khác, amount sẽ được chuyển đổi và lưu:
  - `originalAmount`: Số tiền gốc
  - `originalCurrency`: Loại tiền gốc
  - `exchangeRate`: Tỷ giá đã áp dụng
- Tất cả members của ví nguồn sẽ được thêm vào ví đích (nếu chưa có)
- Nếu ví nguồn là ví mặc định, flag sẽ được chuyển sang ví đích
- Lịch sử merge được lưu để audit trail

---

## 📁 Category APIs

### 1. Tạo danh mục mới
**POST** `/categories/create`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "categoryName": "Ăn uống",
  "icon": "food",
  "transactionTypeId": 1
}
```

**Response:**
```json
{
  "categoryId": 1,
  "categoryName": "Ăn uống",
  "icon": "food",
  "transactionType": {
    "typeId": 1,
    "typeName": "Chi tiêu"
  },
  "isSystem": false
}
```

---

### 2. Cập nhật danh mục
**PUT** `/categories/{id}`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "categoryName": "Ăn uống mới",
  "icon": "restaurant"
}
```

**Response:**
```json
{
  "categoryId": 1,
  "categoryName": "Ăn uống mới",
  "icon": "restaurant"
}
```

---

### 3. Xóa danh mục
**DELETE** `/categories/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```
"Danh mục đã được xóa thành công"
```

**Lưu ý:** Không thể xóa danh mục hệ thống

---

### 4. Lấy danh sách danh mục
**GET** `/categories`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "categoryId": 1,
    "categoryName": "Ăn uống",
    "icon": "food",
    "transactionType": {
      "typeId": 1,
      "typeName": "Chi tiêu"
    },
    "isSystem": true
  }
]
```

---

## 💸 Transaction APIs

### 1. Preview cảnh báo budget trước khi tạo giao dịch chi tiêu
**POST** `/transactions/expense/preview`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "walletId": 1,
  "categoryId": 1,
  "amount": 200000.00,
  "transactionDate": "2024-01-15T10:00:00",
  "note": "Ăn trưa"
}
```

**Response:**
```json
{
  "budgetWarning": {
    "hasWarning": true,
    "warningType": "NEARLY_EXHAUSTED",
    "budgetId": 1,
    "budgetName": "Ăn uống",
    "amountLimit": 200000.00,
    "currentSpent": 200000.00,
    "remainingAmount": 0.00,
    "exceededAmount": 0.00,
    "usagePercentage": 100.0,
    "message": "⚠️ Ngân sách \"Ăn uống\" đã sử dụng 100.0%. Còn lại: 0 VND",
    "spentBeforeTransaction": 0.00,
    "remainingBeforeTransaction": 200000.00,
    "transactionAmount": 200000.00,
    "totalAfterTransaction": 200000.00,
    "remainingAfterTransaction": 0.00,
    "usagePercentageAfterTransaction": 100.0
  }
}
```

**Response Fields:**
- `hasWarning`: Có cảnh báo không
- `warningType`: `NEARLY_EXHAUSTED` (>= 80%) hoặc `EXCEEDED` (vượt hạn mức)
- `budgetId`: ID ngân sách
- `budgetName`: Tên ngân sách (tên danh mục)
- `amountLimit`: Hạn mức ngân sách
- `currentSpent`: Tổng đã chi (sau giao dịch này)
- `remainingAmount`: Số tiền còn lại (sau giao dịch này)
- `exceededAmount`: Số tiền vượt hạn mức (0 nếu không vượt)
- `usagePercentage`: Phần trăm sử dụng (sau giao dịch này)
- `spentBeforeTransaction`: Đã chi TRƯỚC giao dịch này
- `remainingBeforeTransaction`: Còn lại TRƯỚC giao dịch này
- `transactionAmount`: Số tiền giao dịch này
- `totalAfterTransaction`: Tổng SAU giao dịch này
- `remainingAfterTransaction`: Còn lại SAU giao dịch này
- `usagePercentageAfterTransaction`: % sử dụng SAU giao dịch này

**Lưu ý:**
- API này KHÔNG tạo transaction, chỉ kiểm tra và trả về cảnh báo
- Dùng để hiển thị modal cảnh báo trước khi user xác nhận tạo transaction
- Cảnh báo được kích hoạt khi:
  - Đạt 100% hạn mức (hoặc >= 80% cho NEARLY_EXHAUSTED)
  - Vượt hạn mức (EXCEEDED)
- Nếu `hasWarning = false`, có thể tạo transaction ngay mà không cần hiển thị modal

---

### 2. Tạo giao dịch chi tiêu
**POST** `/transactions/expense`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "walletId": 1,
  "categoryId": 1,
  "amount": 50000.00,
  "transactionDate": "2024-01-01T10:00:00",
  "note": "Ăn trưa",
  "imageUrl": "optional_image_url"
}
```

**Response:**
```json
{
  "message": "Thêm chi tiêu thành công",
  "transaction": {
    "transactionId": 1,
    "amount": 50000.00,
    "transactionDate": "2024-01-01T10:00:00",
    "note": "Ăn trưa",
    "imageUrl": "optional_image_url",
    "isExceededBudget": false,
    "exceededBudgetAmount": 0.00,
    "exceededBudgetId": null,
    "wallet": {
      "walletId": 1,
      "balance": 950000.00
    }
  },
  "budgetWarning": {
    "hasWarning": false
  }
}
```

**Response khi có cảnh báo budget:**
```json
{
  "message": "Thêm chi tiêu thành công",
  "transaction": {
    "transactionId": 1,
    "amount": 200000.00,
    "transactionDate": "2024-01-15T10:00:00",
    "note": "Ăn trưa",
    "isExceededBudget": true,
    "exceededBudgetAmount": 50000.00,
    "exceededBudgetId": 1,
    "wallet": {
      "walletId": 1,
      "balance": 800000.00
    }
  },
  "budgetWarning": {
    "hasWarning": true,
    "warningType": "EXCEEDED",
    "budgetId": 1,
    "budgetName": "Ăn uống",
    "amountLimit": 200000.00,
    "currentSpent": 250000.00,
    "remainingAmount": 0.00,
    "exceededAmount": 50000.00,
    "usagePercentage": 125.0,
    "message": "⚠️ Ngân sách \"Ăn uống\" đã vượt hạn mức 50000 VND"
  }
}
```

**Lưu ý:**
- Transaction vẫn được tạo ngay cả khi vượt hạn mức (không block transaction)
- Giao dịch vượt hạn mức có `isExceededBudget = true` và `exceededBudgetAmount > 0`
- Có thể hiển thị nhãn "⚠️" cho giao dịch vượt hạn mức trong danh sách
- Nên sử dụng API preview (`/expense/preview`) trước để hiển thị modal cảnh báo, sau đó mới gọi API này để tạo transaction

---

### 3. Tạo giao dịch thu nhập
**POST** `/transactions/income`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "walletId": 1,
  "categoryId": 5,
  "amount": 1000000.00,
  "transactionDate": "2024-01-01T10:00:00",
  "note": "Lương tháng 1",
  "imageUrl": null
}
```

**Response:**
```json
{
  "message": "Thêm thu nhập thành công",
  "transaction": {
    "transactionId": 2,
    "amount": 1000000.00,
    "transactionDate": "2024-01-01T10:00:00",
    "note": "Lương tháng 1",
    "wallet": {
      "walletId": 1,
      "balance": 1950000.00
    }
  }
}
```

---

## 📊 Budget APIs (Hạn mức chi tiêu)

### 1. Tạo ngân sách mới
**POST** `/budgets/create`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "categoryId": 1,
  "walletId": 1,
  "amountLimit": 5000000.00,
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "note": "Ngân sách ăn uống tháng 1"
}
```

**Request Fields:**
- `categoryId` (required): ID danh mục chi tiêu
- `walletId` (optional): ID ví (null = áp dụng cho tất cả ví)
- `amountLimit` (required): Hạn mức chi tiêu (phải ≥ 1.000 VND)
- `startDate` (required): Ngày bắt đầu (format: YYYY-MM-DD)
- `endDate` (required): Ngày kết thúc (format: YYYY-MM-DD)
- `warningThreshold` (optional): Ngưỡng cảnh báo (%) - từ 0 đến 100, mặc định 80%
- `note` (optional): Ghi chú (tối đa 255 ký tự)

**Quy tắc quan trọng:**
- Không thể tạo ngân sách nếu có ngân sách khác cùng `categoryId` + `walletId` (hoặc “tất cả ví”) đang ở trạng thái `PENDING`, `ACTIVE`, `WARNING` hoặc `EXCEEDED` trong khoảng thời gian bị chồng chéo.
- Ngày kết thúc phải lớn hơn ngày bắt đầu.
- Trạng thái được hệ thống tự tính ngay khi lưu (`PENDING` nếu chưa tới ngày, `ACTIVE` nếu đang chạy).

**Response:**
```json
{
  "message": "Tạo hạn mức chi tiêu thành công",
  "budget": {
    "budgetId": 1,
    "categoryId": 1,
    "categoryName": "Ăn uống",
    "walletId": 1,
    "walletName": "Ví chính",
    "amountLimit": 5000000.00,
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "note": "Ngân sách ăn uống tháng 1",
    "warningThreshold": 80.0,
    "status": "ACTIVE",
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00"
  }
}
```

**Lưu ý:**
- Hạn mức chi tiêu không phụ thuộc vào số dư ví
- Hạn mức có thể lớn hơn số dư hiện tại trong ví
- Không được tạo ngân sách trùng lặp (cùng user, category, wallet, và khoảng thời gian) nếu ngân sách kia còn hiệu lực (PENDING/ACTIVE/WARNING/EXCEEDED)
- Tên ngân sách = Tên danh mục

---

### 2. Lấy tất cả ngân sách của user
**GET** `/budgets`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "budgets": [
    {
      "budgetId": 1,
      "categoryId": 1,
      "categoryName": "Ăn uống",
      "walletId": 1,
      "walletName": "Ví chính",
      "amountLimit": 5000000.00,
      "spentAmount": 3500000.00,
      "remainingAmount": 1500000.00,
      "exceededAmount": 0.00,
      "usagePercentage": 70.0,
      "status": "ACTIVE",
      "budgetStatus": "ACTIVE",
      "startDate": "2024-01-01",
      "endDate": "2024-01-31",
      "note": "Ngân sách ăn uống tháng 1",
      "warningThreshold": 80.0,
      "createdAt": "2024-01-01T10:00:00",
      "updatedAt": "2024-01-01T10:00:00"
    }
  ],
  "total": 1
}
```

**Response Fields:**
- `spentAmount`: Tổng số tiền đã chi trong khoảng thời gian
- `remainingAmount`: Số tiền còn lại (amountLimit - spentAmount)
- `exceededAmount`: Số tiền vượt hạn mức (0 nếu không vượt)
- `usagePercentage`: Phần trăm sử dụng (%)
- `status`: Trạng thái hiện tại của ngân sách – luôn nằm trong tập `PENDING`, `ACTIVE`, `WARNING`, `EXCEEDED`, `COMPLETED`
- `budgetStatus`: Giống `status` (được giữ lại cho tương thích ngược)
- `warningThreshold`: Ngưỡng cảnh báo (%) - mặc định 80%

---

### 3. Lấy chi tiết một ngân sách
**GET** `/budgets/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "budget": {
    "budgetId": 1,
    "categoryId": 1,
    "categoryName": "Ăn uống",
    "walletId": 1,
    "walletName": "Ví chính",
    "amountLimit": 5000000.00,
    "spentAmount": 5500000.00,
    "remainingAmount": 0.00,
    "exceededAmount": 500000.00,
    "usagePercentage": 110.0,
    "status": "EXCEEDED",
    "budgetStatus": "EXCEEDED",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "note": "Ngân sách ăn uống tháng 1",
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00"
  }
}
```

**Lưu ý:**
- Hiển thị đầy đủ thông tin: hạn mức, đã chi, còn lại, % sử dụng, trạng thái
- Nếu vượt hạn mức: `exceededAmount` > 0, `status` = "EXCEEDED"
- Nếu >= 80%: `status` = "WARNING"

---

### 4. Lấy danh sách giao dịch thuộc một ngân sách
**GET** `/budgets/{id}/transactions`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "transactions": [
    {
      "transactionId": 1,
      "amount": 50000.00,
      "transactionDate": "2024-01-05T10:00:00",
      "note": "Ăn trưa",
      "isExceededBudget": true,
      "exceededBudgetAmount": 50000.00,
      "exceededBudgetId": 1,
      "wallet": {
        "walletId": 1,
        "walletName": "Ví chính"
      },
      "category": {
        "categoryId": 1,
        "categoryName": "Ăn uống"
      }
    }
  ],
  "total": 1
}
```

**Lưu ý:**
- Trả về tất cả giao dịch chi tiêu thuộc ngân sách trong khoảng thời gian
- Giao dịch vượt hạn mức có `isExceededBudget = true` và `exceededBudgetAmount` > 0
- Có thể hiển thị nhãn "⚠️" cho giao dịch vượt hạn mức

---

### 5. Cập nhật ngân sách
**PUT** `/budgets/{id}`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amountLimit": 6000000.00,
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "note": "Ngân sách ăn uống tháng 1 (đã cập nhật)"
}
```

**Request Fields:**
- `amountLimit` (required): Hạn mức chi tiêu (phải ≥ 1.000 VND)
- `startDate` (required): Ngày bắt đầu (format: YYYY-MM-DD)
- `endDate` (required): Ngày kết thúc (format: YYYY-MM-DD)
- `warningThreshold` (optional): Ngưỡng cảnh báo (%) - từ 0 đến 100, mặc định 80%
- `note` (optional): Ghi chú (tối đa 255 ký tự)

**Response:**
```json
{
  "message": "Cập nhật hạn mức chi tiêu thành công",
  "budget": {
    "budgetId": 1,
    "categoryId": 1,
    "categoryName": "Ăn uống",
    "walletId": 1,
    "walletName": "Ví chính",
    "amountLimit": 6000000.00,
    "spentAmount": 3500000.00,
    "remainingAmount": 2500000.00,
    "exceededAmount": 0.00,
    "usagePercentage": 58.33,
    "status": "ACTIVE",
    "budgetStatus": "ACTIVE",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "note": "Ngân sách ăn uống tháng 1 (đã cập nhật)",
    "warningThreshold": 90.0,
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-15T14:30:00"
  }
}
```

**Lưu ý:**
- Chỉ user tạo ngân sách mới được cập nhật
- Không thể thay đổi danh mục hoặc ví nguồn (ảnh hưởng dữ liệu lịch sử)
- Ngày bắt đầu mới không được nhỏ hơn ngày giao dịch đã phát sinh thuộc ngân sách này
- Hệ thống tự kiểm tra và chặn nếu thời gian mới chồng lắp với ngân sách khác đang PENDING/ACTIVE/WARNING/EXCEEDED
- Trạng thái (`status`, `budgetStatus`) được tính lại tự động dựa trên hạn mức và ngày hiện tại

**Lỗi có thể xảy ra:**
- `"Không tìm thấy ngân sách"` - budgetId không tồn tại
- `"Bạn không có quyền chỉnh sửa ngân sách này"` - user không phải chủ sở hữu
- `"Ngày kết thúc phải lớn hơn ngày bắt đầu"` - validation lỗi
- `"Ngày bắt đầu không được nhỏ hơn ngày giao dịch đã phát sinh (...)"` - có giao dịch lịch sử giữ nguyên
- `"Ví không tồn tại"` - walletId không hợp lệ
- `"Bạn không có quyền truy cập ví này"` - user không có quyền truy cập ví
- `"Danh mục ... đã có ngân sách (...) trùng thời gian..."` - trùng lặp với ngân sách khác đang còn hiệu lực

---

### 6. Xóa ngân sách
**DELETE** `/budgets/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Xóa hạn mức chi tiêu thành công"
}
```

**Lưu ý:**
- Chỉ user tạo ngân sách mới được xóa
- Xóa sẽ xóa hoàn toàn khỏi database
- Tất cả dữ liệu liên quan (giao dịch, cảnh báo) sẽ không còn tham chiếu đến ngân sách này

**Lỗi có thể xảy ra:**
- `"Không tìm thấy ngân sách"` - budgetId không tồn tại
- `"Bạn không có quyền xóa ngân sách này"` - user không phải chủ sở hữu

---

## ⏰ Scheduled Transaction APIs (Giao dịch định kỳ)

### 1. Preview ngày thực hiện tiếp theo (Mini Preview)
**POST** `/scheduled-transactions/preview`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "walletId": 1,
  "transactionTypeId": 1,
  "categoryId": 1,
  "amount": 50000.00,
  "note": "Cà phê sáng",
  "scheduleType": "MONTHLY",
  "startDate": "2024-12-01",
  "executionTime": "07:00:00",
  "endDate": "2024-12-31",
  "dayOfMonth": 5
}
```

**Response:**
```json
{
  "hasPreview": true,
  "nextExecutionDate": "2024-12-05",
  "executionTime": "07:00:00",
  "message": "Lần thực hiện tiếp theo: 2024-12-05 lúc 07:00:00"
}
```

**Response khi chưa đủ thông tin:**
```json
{
  "hasPreview": false,
  "message": "Chưa chọn thời điểm chạy."
}
```

**Lưu ý:**
- API này KHÔNG tạo scheduled transaction, chỉ tính toán và trả về ngày thực hiện tiếp theo
- Dùng để hiển thị "Mini preview" trong form tạo lịch giao dịch
- Frontend có thể gọi API này mỗi khi user thay đổi các field liên quan (scheduleType, startDate, executionTime, dayOfWeek, dayOfMonth, etc.)

---

### 2. Tạo giao dịch đặt lịch
**POST** `/scheduled-transactions/create`

**Headers:** `Authorization: Bearer <token>`

**Request Body (Một lần):**
```json
{
  "walletId": 1,
  "transactionTypeId": 1,
  "categoryId": 1,
  "amount": 50000.00,
  "note": "Thanh toán hóa đơn",
  "scheduleType": "ONCE",
  "startDate": "2024-12-20",
  "executionTime": "08:00:00",
  "endDate": null
}
```

**Request Body (Hàng ngày):**
```json
{
  "walletId": 1,
  "transactionTypeId": 1,
  "categoryId": 1,
  "amount": 50000.00,
  "note": "Cà phê sáng",
  "scheduleType": "DAILY",
  "startDate": "2024-12-01",
  "executionTime": "07:00:00",
  "endDate": "2024-12-31"
}
```

**Request Body (Hàng tuần):**
```json
{
  "walletId": 1,
  "transactionTypeId": 1,
  "categoryId": 1,
  "amount": 200000.00,
  "note": "Mua sắm cuối tuần",
  "scheduleType": "WEEKLY",
  "startDate": "2024-12-01",
  "executionTime": "08:30:00",
  "endDate": "2024-12-31",
  "dayOfWeek": 1
}
```

**Request Body (Hàng tháng):**
```json
{
  "walletId": 1,
  "transactionTypeId": 1,
  "categoryId": 1,
  "amount": 1000000.00,
  "note": "Tiền nhà",
  "scheduleType": "MONTHLY",
  "startDate": "2024-12-01",
  "executionTime": "09:00:00",
  "endDate": "2024-12-31",
  "dayOfMonth": 5
}
```

**Request Body (Hàng năm):**
```json
{
  "walletId": 1,
  "transactionTypeId": 2,
  "categoryId": 5,
  "amount": 5000000.00,
  "note": "Thưởng cuối năm",
  "scheduleType": "YEARLY",
  "startDate": "2024-12-01",
  "executionTime": "10:00:00",
  "endDate": null,
  "month": 12,
  "day": 31
}
```

**Request Fields:**
- `walletId` (required): ID ví
- `transactionTypeId` (required): 1 = Chi tiêu, 2 = Thu nhập
- `categoryId` (required): ID danh mục
- `amount` (required): Số tiền (phải > 0)
- `note` (optional): Ghi chú (tối đa 500 ký tự)
- `scheduleType` (required): `ONCE`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`
- `startDate` (required): Ngày bắt đầu (format: YYYY-MM-DD)
  - Cho ONCE: phải >= today
  - Cho recurring: có thể là quá khứ (sẽ tính từ ngày hợp lệ tiếp theo)
- `executionTime` (required): Giờ thực hiện (format: HH:mm:ss)
  - Cho ONCE: nếu startDate = today thì phải >= now
- `endDate` (optional): Ngày kết thúc
  - Cho ONCE: phải là null (không được có)
  - Cho recurring: null = không giới hạn, hoặc phải >= startDate
- `dayOfWeek` (required cho WEEKLY): Thứ trong tuần (1-7, Monday-Sunday)
- `dayOfMonth` (required cho MONTHLY): Ngày trong tháng (1-31)
- `month` (required cho YEARLY): Tháng (1-12)
- `day` (required cho YEARLY): Ngày (1-31)

**Validation Rules:**
- `startDate` cho ONCE: phải >= today, nếu = today thì `executionTime` phải >= now
- `endDate`: 
  - Không được có cho ONCE (phải null)
  - Cho recurring: nếu có thì phải >= startDate
- `dayOfWeek`: Bắt buộc cho WEEKLY
- `dayOfMonth`: Bắt buộc cho MONTHLY
- `month` và `day`: Bắt buộc cho YEARLY

**Response:**
```json
{
  "message": "Tạo lịch giao dịch thành công",
  "scheduledTransaction": {
    "scheduleId": 1,
    "walletId": 1,
    "walletName": "Ví chính",
    "transactionTypeId": 1,
    "transactionTypeName": "Chi tiêu",
    "categoryId": 1,
    "categoryName": "Ăn uống",
    "amount": 50000.00,
    "note": "Cà phê sáng",
    "scheduleType": "DAILY",
    "status": "PENDING",
    "nextExecutionDate": "2024-12-01",
    "executionTime": "07:00:00",
    "endDate": "2024-12-31",
    "dayOfWeek": null,
    "dayOfMonth": null,
    "month": null,
    "day": null,
    "completedCount": 0,
    "failedCount": 0,
    "createdAt": "2024-11-25T10:00:00",
    "updatedAt": "2024-11-25T10:00:00"
  }
}
```

**Validation Rules:**
- `startDate`: Bắt buộc, phải >= today (cho ONCE)
- `executionTime`: Bắt buộc, nếu startDate = today thì executionTime phải >= now (cho ONCE)
- `endDate`: 
  - Chỉ áp dụng cho recurring (DAILY, WEEKLY, MONTHLY, YEARLY), không được có cho ONCE
  - Nếu có, phải >= startDate
- `dayOfWeek`: Bắt buộc cho WEEKLY (1-7, Monday-Sunday)
- `dayOfMonth`: Bắt buộc cho MONTHLY (1-31)
- `month` và `day`: Bắt buộc cho YEARLY (month: 1-12, day: 1-31)

**Lưu ý:**
- Số dư ví chỉ được kiểm tra khi đến thời điểm thực hiện (cho chi tiêu)
- Nếu không đủ tiền: giao dịch được đánh dấu `FAILED`, nhưng lần tiếp theo vẫn được lên lịch (cho định kỳ)
- Hệ thống tự động thực hiện giao dịch mỗi phút
- Cho ONCE: endDate phải là null (không được có)
- Cho recurring: endDate có thể null (không giới hạn) hoặc >= startDate

---

### 3. Lấy tất cả giao dịch đặt lịch
**GET** `/scheduled-transactions`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "scheduledTransactions": [
    {
      "scheduleId": 1,
      "walletId": 1,
      "walletName": "Ví chính",
      "transactionTypeId": 1,
      "transactionTypeName": "Chi tiêu",
      "categoryId": 1,
      "categoryName": "Ăn uống",
      "amount": 50000.00,
      "note": "Cà phê sáng",
      "scheduleType": "DAILY",
      "status": "PENDING",
      "nextExecutionDate": "2024-12-01",
      "executionTime": "07:00:00",
      "endDate": "2024-12-31",
      "completedCount": 5,
      "failedCount": 0,
      "createdAt": "2024-11-25T10:00:00",
      "updatedAt": "2024-11-25T10:00:00"
    }
  ],
  "total": 1
}
```

**Lưu ý:**
- Sắp xếp theo `nextExecutionDate` tăng dần
- `status`: `PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`
- `completedCount`: Số lần đã thực hiện thành công
- `failedCount`: Số lần thất bại

---

### 4. Lấy chi tiết một giao dịch đặt lịch
**GET** `/scheduled-transactions/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "scheduledTransaction": {
    "scheduleId": 1,
    "walletId": 1,
    "walletName": "Ví chính",
    "transactionTypeId": 1,
    "transactionTypeName": "Chi tiêu",
    "categoryId": 1,
    "categoryName": "Ăn uống",
    "amount": 50000.00,
    "note": "Cà phê sáng",
    "scheduleType": "WEEKLY",
    "status": "PENDING",
    "nextExecutionDate": "2024-12-02",
    "executionTime": "08:30:00",
    "endDate": "2024-12-31",
    "dayOfWeek": 1,
    "dayOfMonth": null,
    "month": null,
    "day": null,
    "completedCount": 2,
    "failedCount": 1,
    "createdAt": "2024-11-25T10:00:00",
    "updatedAt": "2024-11-25T10:00:00"
  }
}
```

**Lưu ý:** Chỉ user tạo scheduled transaction mới được xem chi tiết

---

### 5. Hủy giao dịch đặt lịch
**PUT** `/scheduled-transactions/{id}/cancel`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Đã hủy lịch giao dịch",
  "scheduledTransaction": {
    "scheduleId": 1,
    "walletName": "momo",
    "transactionTypeName": "Chi tiêu",
    "categoryName": "Mua sắm",
    "amount": 10000.00,
    "note": "Thanh toán hóa đơn",
    "scheduleType": "ONCE",
    "status": "CANCELLED",
    "nextExecutionDate": "2024-12-20",
    "executionTime": "08:00:00",
    "endDate": null,
    "completedCount": 0,
    "failedCount": 0,
    "createdAt": "2024-11-25T10:00:00",
    "updatedAt": "2024-11-25T10:00:00"
  }
}
```

**Lưu ý:**
- Chỉ user tạo scheduled transaction mới được hủy
- Hủy sẽ đổi status thành `CANCELLED` (không xóa khỏi database)
- Scheduler sẽ tự động bỏ qua các scheduled transactions có status `CANCELLED`
- Không thể hủy lịch đã hoàn thành (`COMPLETED`)
- Không thể hủy lịch đã hủy trước đó

**Lỗi có thể xảy ra:**
- `"Không tìm thấy lịch giao dịch"` - scheduleId không tồn tại
- `"Bạn không có quyền hủy lịch giao dịch này"` - user không phải chủ sở hữu
- `"Lịch giao dịch này đã được hủy trước đó"` - đã hủy rồi
- `"Không thể hủy lịch giao dịch đã hoàn thành"` - status là `COMPLETED`

---

### 6. Xóa giao dịch đặt lịch
**DELETE** `/scheduled-transactions/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Xóa lịch giao dịch thành công"
}
```

**Lưu ý:**
- Chỉ user tạo scheduled transaction mới được xóa
- Xóa sẽ xóa hoàn toàn khỏi database (khác với hủy - cancel)
- Nếu muốn giữ lại lịch sử, nên dùng endpoint **Hủy** (`PUT /scheduled-transactions/{id}/cancel`) thay vì **Xóa**

---

## 💬 Feedback APIs

### 1. Gửi phản hồi/báo lỗi
**POST** `/feedback`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "type": "BUG",
  "subject": "Lỗi không thể đăng nhập",
  "message": "Tôi gặp lỗi khi đăng nhập vào ứng dụng. Màn hình hiển thị lỗi 500.",
  "contactEmail": "user@example.com"
}
```

**Request Fields:**
- `type` (required): Loại phản hồi - `FEEDBACK`, `BUG`, `FEATURE`, `OTHER`
- `subject` (required): Tiêu đề phản hồi (tối đa 200 ký tự)
- `message` (required): Nội dung phản hồi (tối đa 5000 ký tự)
- `contactEmail` (optional): Email để liên hệ lại (nếu khác email user)

**Response:**
```json
{
  "message": "Cảm ơn bạn đã gửi phản hồi! Chúng tôi sẽ xem xét và phản hồi sớm nhất có thể.",
  "feedback": {
    "feedbackId": 1,
    "userId": 1,
    "userEmail": "user@example.com",
    "userName": "Nguyễn Văn A",
    "type": "BUG",
    "status": "PENDING",
    "subject": "Lỗi không thể đăng nhập",
    "message": "Tôi gặp lỗi khi đăng nhập vào ứng dụng...",
    "contactEmail": "user@example.com",
    "adminResponse": null,
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00",
    "reviewedAt": null,
    "resolvedAt": null
  }
}
```

**Lưu ý:**
- Hệ thống tự động gửi email thông báo cho admin khi có feedback mới
- Status có thể là: `PENDING`, `REVIEWED`, `RESOLVED`, `CLOSED`

---

### 2. Lấy danh sách phản hồi của user
**GET** `/feedback`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "feedbacks": [
    {
      "feedbackId": 1,
      "userId": 1,
      "userEmail": "user@example.com",
      "userName": "Nguyễn Văn A",
      "type": "BUG",
      "status": "PENDING",
      "subject": "Lỗi không thể đăng nhập",
      "message": "Tôi gặp lỗi khi đăng nhập...",
      "contactEmail": "user@example.com",
      "adminResponse": null,
      "createdAt": "2024-01-01T10:00:00",
      "updatedAt": "2024-01-01T10:00:00"
    }
  ],
  "total": 1
}
```

---

### 3. Lấy chi tiết một phản hồi
**GET** `/feedback/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "feedback": {
    "feedbackId": 1,
    "userId": 1,
    "userEmail": "user@example.com",
    "userName": "Nguyễn Văn A",
    "type": "BUG",
    "status": "RESOLVED",
    "subject": "Lỗi không thể đăng nhập",
    "message": "Tôi gặp lỗi khi đăng nhập...",
    "contactEmail": "user@example.com",
    "adminResponse": "Đã khắc phục lỗi. Vui lòng thử lại.",
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T11:00:00",
    "reviewedAt": "2024-01-01T10:30:00",
    "resolvedAt": "2024-01-01T11:00:00"
  }
}
```

**Lưu ý:** Chỉ user tạo feedback mới được xem chi tiết

---

## 👨‍💼 Admin APIs

### 1. Admin - Lấy tất cả feedback
**GET** `/admin/feedbacks`

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `status` (optional): Lọc theo trạng thái - `PENDING`, `REVIEWED`, `RESOLVED`, `CLOSED`
- `type` (optional): Lọc theo loại - `FEEDBACK`, `BUG`, `FEATURE`, `OTHER`

**Response:**
```json
{
  "feedbacks": [
    {
      "feedbackId": 1,
      "userId": 1,
      "userEmail": "user@example.com",
      "userName": "Nguyễn Văn A",
      "type": "BUG",
      "status": "PENDING",
      "subject": "Lỗi không thể đăng nhập",
      "message": "Tôi gặp lỗi khi đăng nhập...",
      "contactEmail": "user@example.com",
      "adminResponse": null,
      "createdAt": "2024-01-01T10:00:00",
      "updatedAt": "2024-01-01T10:00:00",
      "reviewedAt": null,
      "resolvedAt": null
    }
  ],
  "total": 1,
  "pendingCount": 5
}
```

**Lưu ý:** Chỉ ADMIN mới có quyền truy cập

---

### 2. Admin - Lấy chi tiết một feedback
**GET** `/admin/feedbacks/{id}`

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "feedback": {
    "feedbackId": 1,
    "userId": 1,
    "userEmail": "user@example.com",
    "userName": "Nguyễn Văn A",
    "type": "BUG",
    "status": "PENDING",
    "subject": "Lỗi không thể đăng nhập",
    "message": "Tôi gặp lỗi khi đăng nhập...",
    "contactEmail": "user@example.com",
    "adminResponse": null,
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00"
  }
}
```

---

### 3. Admin - Cập nhật trạng thái feedback
**PUT** `/admin/feedbacks/{id}/status`

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "status": "REVIEWED"
}
```

**Response:**
```json
{
  "message": "Cập nhật trạng thái thành công",
  "feedback": {
    "feedbackId": 1,
    "status": "REVIEWED",
    "reviewedAt": "2024-01-01T11:00:00",
    ...
  }
}
```

**Lưu ý:**
- Status có thể là: `PENDING`, `REVIEWED`, `RESOLVED`, `CLOSED`
- Tự động cập nhật `reviewedAt` khi chuyển sang `REVIEWED`
- Tự động cập nhật `resolvedAt` khi chuyển sang `RESOLVED`

---

### 4. Admin - Thêm phản hồi cho user
**PUT** `/admin/feedbacks/{id}/response`

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "adminResponse": "Đã khắc phục lỗi. Vui lòng thử lại."
}
```

**Response:**
```json
{
  "message": "Thêm phản hồi thành công",
  "feedback": {
    "feedbackId": 1,
    "adminResponse": "Đã khắc phục lỗi. Vui lòng thử lại.",
    "status": "REVIEWED",
    "reviewedAt": "2024-01-01T11:00:00",
    ...
  }
}
```

**Lưu ý:**
- Tự động chuyển status sang `REVIEWED` nếu đang là `PENDING`
- User có thể xem `adminResponse` khi xem chi tiết feedback của mình

---

### 5. Admin - Lấy thống kê feedback
**GET** `/admin/feedbacks/stats`

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "pending": 5,
  "reviewed": 10,
  "resolved": 20,
  "closed": 3,
  "total": 38
}
```

**Lưu ý:** Dùng để hiển thị dashboard cho admin

---

### 6. Admin - Quản lý User
**GET** `/admin/users`

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
[
  {
    "userId": 1,
    "email": "user@example.com",
    "fullName": "Nguyễn Văn A",
    "role": "USER",
    "enabled": true,
    "locked": false
  }
]
```

---

### 7. Admin - Xem chi tiết user
**GET** `/admin/users/{id}/detail`

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "userId": 1,
  "email": "user@example.com",
  "fullName": "Nguyễn Văn A",
  "role": "USER",
  "enabled": true,
  "locked": false,
  "provider": "local",
  "createdAt": "2024-01-01T10:00:00"
}
```

---

### 8. Admin - Khóa user
**POST** `/admin/users/{id}/lock`

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "userId": 1,
  "email": "user@example.com",
  "locked": true
}
```

---

### 9. Admin - Mở khóa user
**POST** `/admin/users/{id}/unlock`

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "userId": 1,
  "email": "user@example.com",
  "locked": false
}
```

---

### 10. Admin - Đổi role user
**POST** `/admin/users/{id}/role`

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "role": "ADMIN"
}
```

**Response:**
```json
{
  "userId": 1,
  "email": "user@example.com",
  "role": "ADMIN"
}
```

**Lưu ý:** Role có thể là: `USER`, `ADMIN`

---

### 11. Admin - Xem log hành động admin
**GET** `/admin/users/logs`

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
[
  {
    "id": 1,
    "adminId": 1,
    "adminEmail": "admin@financeapp.com",
    "targetUserId": 2,
    "action": "LOCK_USER",
    "detail": "Khóa user user@example.com",
    "createdAt": "2024-01-01T10:00:00"
  }
]
```

---

### 12. Admin - Xem login logs của user
**GET** `/admin/users/{id}/login-logs`

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
[
  {
    "logId": 1,
    "userId": 1,
    "loginTime": "2024-01-01T10:00:00",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "success": true
  }
]
```

---

### 13. Admin - Xóa user
**DELETE** `/admin/users/{id}`

**Headers:** `Authorization: Bearer <admin_token>`

**Response:** `204 No Content`

**Lưu ý:** Xóa mềm (soft delete), không xóa dữ liệu thực tế

---

## 💰 Fund APIs (Quỹ Tiết Kiệm)

### 1. Tạo quỹ mới
**POST** `/funds`

**Headers:** `Authorization: Bearer <token>`

**Request Body (Quỹ cá nhân có kỳ hạn):**
```json
{
  "fundName": "Quỹ mua xe",
  "targetWalletId": 1,
  "fundType": "PERSONAL",
  "hasDeadline": true,
  "targetAmount": 50000000.00,
  "frequency": "MONTHLY",
  "amountPerPeriod": 5000000.00,
  "startDate": "2024-02-01",
  "endDate": "2024-12-31",
  "reminderEnabled": true,
  "reminderType": "MONTHLY",
  "reminderTime": "20:00:00",
  "reminderDayOfMonth": 1,
  "autoDepositEnabled": true,
  "autoDepositType": "CUSTOM_SCHEDULE",
  "sourceWalletId": 2,
  "autoDepositScheduleType": "MONTHLY",
  "autoDepositTime": "20:00:00",
  "autoDepositDayOfMonth": 1,
  "autoDepositAmount": 5000000.00,
  "note": "Tiết kiệm để mua xe"
}
```

**Request Body (Quỹ cá nhân không kỳ hạn):**
```json
{
  "fundName": "Quỹ khẩn cấp",
  "targetWalletId": 1,
  "fundType": "PERSONAL",
  "hasDeadline": false,
  "frequency": "MONTHLY",
  "amountPerPeriod": 2000000.00,
  "startDate": "2024-02-01",
  "reminderEnabled": true,
  "reminderType": "MONTHLY",
  "reminderTime": "20:00:00",
  "reminderDayOfMonth": 1,
  "note": "Quỹ dự phòng"
}
```

**Request Body (Quỹ nhóm có kỳ hạn):**
```json
{
  "fundName": "Quỹ du lịch nhóm",
  "targetWalletId": 1,
  "fundType": "GROUP",
  "hasDeadline": true,
  "targetAmount": 20000000.00,
  "frequency": "MONTHLY",
  "amountPerPeriod": 2000000.00,
  "startDate": "2024-02-01",
  "endDate": "2024-12-31",
  "members": [
    {
      "email": "friend1@example.com",
      "role": "CONTRIBUTOR"
    },
    {
      "email": "friend2@example.com",
      "role": "CONTRIBUTOR"
    }
  ],
  "reminderEnabled": true,
  "reminderType": "MONTHLY",
  "reminderTime": "20:00:00",
  "reminderDayOfMonth": 1,
  "note": "Quỹ du lịch cùng bạn bè"
}
```

**Request Fields:**
- `fundName` (required): Tên quỹ
- `targetWalletId` (required): ID ví đích (ví quỹ)
- `fundType` (required): `PERSONAL` hoặc `GROUP`
- `hasDeadline` (required): `true` = có kỳ hạn, `false` = không kỳ hạn
- `targetAmount` (required nếu hasDeadline=true): Số tiền mục tiêu
- `frequency` (required nếu hasDeadline=true): `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`
- `amountPerPeriod`: Số tiền gửi mỗi kỳ
- `startDate` (required nếu hasDeadline=true): Ngày bắt đầu
- `endDate` (required nếu hasDeadline=true): Ngày kết thúc
- `reminderEnabled`: Bật/tắt nhắc nhở
- `reminderType`: `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`
- `reminderTime`: Giờ nhắc (HH:mm:ss)
- `reminderDayOfWeek`: Thứ trong tuần (1-7, cho WEEKLY)
- `reminderDayOfMonth`: Ngày trong tháng (1-31, cho MONTHLY)
- `reminderMonth`: Tháng (1-12, cho YEARLY)
- `reminderDay`: Ngày (1-31, cho YEARLY)
- `autoDepositEnabled`: Bật/tắt tự động nạp tiền
- `autoDepositType`: `FOLLOW_REMINDER` hoặc `CUSTOM_SCHEDULE`
- `sourceWalletId`: ID ví nguồn (nếu autoDepositEnabled=true)
- `autoDepositScheduleType`: Kiểu lịch tự nạp (cho CUSTOM_SCHEDULE)
- `autoDepositAmount`: Số tiền mỗi lần nạp
- `members`: Danh sách thành viên (chỉ cho GROUP)
- `note`: Ghi chú

**Response:**
```json
{
  "message": "Tạo quỹ thành công",
  "fund": {
    "fundId": 1,
    "ownerId": 1,
    "ownerName": "Nguyễn Văn A",
    "ownerEmail": "user@example.com",
    "targetWalletId": 1,
    "targetWalletName": "Ví quỹ",
    "currencyCode": "VND",
    "fundType": "PERSONAL",
    "status": "ACTIVE",
    "fundName": "Quỹ mua xe",
    "hasDeadline": true,
    "targetAmount": 50000000.00,
    "currentAmount": 0.00,
    "progressPercentage": 0.00,
    "frequency": "MONTHLY",
    "amountPerPeriod": 5000000.00,
    "startDate": "2024-02-01",
    "endDate": "2024-12-31",
    "note": "Tiết kiệm để mua xe",
    "reminderEnabled": true,
    "reminderType": "MONTHLY",
    "reminderTime": "20:00:00",
    "reminderDayOfMonth": 1,
    "autoDepositEnabled": true,
    "autoDepositType": "CUSTOM_SCHEDULE",
    "sourceWalletId": 2,
    "sourceWalletName": "Ví nguồn",
    "autoDepositScheduleType": "MONTHLY",
    "autoDepositTime": "20:00:00",
    "autoDepositDayOfMonth": 1,
    "autoDepositAmount": 5000000.00,
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00",
    "members": null,
    "memberCount": null
  }
}
```

**Validation Rules:**
- Ví đích không được đã sử dụng cho quỹ hoặc ngân sách khác
- Nếu có kỳ hạn: `targetAmount` phải > số dư hiện tại của ví
- Nếu có kỳ hạn: `endDate` phải > `startDate`
- Khoảng thời gian phải đủ cho ít nhất một kỳ gửi (theo frequency)
- Nếu bật auto deposit: phải chọn ví nguồn (không được trùng ví đích)
- Nếu auto deposit = FOLLOW_REMINDER: phải bật reminder
- Quỹ nhóm phải có ít nhất 01 thành viên ngoài chủ quỹ
- Email thành viên không được trùng nhau hoặc trùng email chủ quỹ
- Ví nguồn không được đã sử dụng cho quỹ hoặc ngân sách khác

**Lỗi có thể xảy ra:**
- `"Ví đích không tồn tại"` - Ví đích không hợp lệ
- `"Bạn không có quyền truy cập ví này"` - User không có quyền truy cập ví đích
- `"Ví đã được sử dụng cho quỹ hoặc ngân sách khác"` - Ví đích đã được sử dụng
- `"Số tiền mục tiêu phải lớn hơn số dư hiện tại trong ví"` - targetAmount không hợp lệ
- `"Vui lòng chọn tần suất gửi quỹ"` - Thiếu frequency cho quỹ có kỳ hạn
- `"Ngày bắt đầu phải lớn hơn hoặc bằng ngày hiện tại"` - startDate không hợp lệ
- `"Ngày kết thúc phải lớn hơn ngày bắt đầu"` - endDate không hợp lệ
- `"Khoảng thời gian không đủ cho ít nhất một kỳ gửi"` - Khoảng thời gian quá ngắn
- `"Ví nguồn không được trùng với ví quỹ"` - Ví nguồn trùng ví đích
- `"Ví nguồn không hợp lệ vì đang là ví quỹ hoặc ví ngân sách"` - Ví nguồn đã được sử dụng
- `"Bạn phải bật nhắc nhở nếu dùng chế độ nạp theo lịch nhắc nhở"` - Thiếu reminder khi dùng FOLLOW_REMINDER
- `"Quỹ nhóm phải có ít nhất 01 thành viên ngoài chủ quỹ"` - Thiếu thành viên cho quỹ nhóm
- `"Tài khoản không tồn tại. Vui lòng mời người dùng đăng ký trước khi tham gia quỹ: {email}"` - Email thành viên chưa đăng ký
- `"Email thành viên bị trùng với chủ quỹ"` - Email thành viên trùng email chủ quỹ
- `"Email thành viên bị trùng: {email}"` - Email thành viên trùng nhau

---

### 2. Lấy tất cả quỹ của user
**GET** `/funds`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "funds": [
    {
      "fundId": 1,
      "fundName": "Quỹ mua xe",
      "fundType": "PERSONAL",
      "hasDeadline": true,
      "targetAmount": 50000000.00,
      "currentAmount": 10000000.00,
      "progressPercentage": 20.00,
      "status": "ACTIVE"
    }
  ],
  "total": 1
}
```

---

### 3. Lấy quỹ cá nhân
**GET** `/funds/personal?hasDeadline=true`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `hasDeadline` (optional): `true` = có kỳ hạn, `false` = không kỳ hạn, `null` = tất cả

**Response:**
```json
{
  "funds": [
    {
      "fundId": 1,
      "fundName": "Quỹ mua xe",
      "hasDeadline": true,
      "targetAmount": 50000000.00,
      "currentAmount": 10000000.00,
      "progressPercentage": 20.00
    }
  ],
  "total": 1
}
```

---

### 4. Lấy quỹ nhóm
**GET** `/funds/group?hasDeadline=true`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `hasDeadline` (optional): `true` = có kỳ hạn, `false` = không kỳ hạn, `null` = tất cả

**Response:**
```json
{
  "funds": [
    {
      "fundId": 2,
      "fundName": "Quỹ du lịch nhóm",
      "hasDeadline": true,
      "targetAmount": 20000000.00,
      "currentAmount": 5000000.00,
      "progressPercentage": 25.00,
      "memberCount": 3
    }
  ],
  "total": 1
}
```

---

### 5. Lấy quỹ tham gia (không phải chủ quỹ)
**GET** `/funds/participated`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "funds": [
    {
      "fundId": 3,
      "fundName": "Quỹ nhóm bạn bè",
      "fundType": "GROUP",
      "hasDeadline": false,
      "currentAmount": 3000000.00,
      "memberCount": 5
    }
  ],
  "total": 1
}
```

---

### 6. Lấy chi tiết một quỹ
**GET** `/funds/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "fund": {
    "fundId": 1,
    "ownerId": 1,
    "ownerName": "Nguyễn Văn A",
    "targetWalletId": 1,
    "targetWalletName": "Ví quỹ",
    "currencyCode": "VND",
    "fundType": "PERSONAL",
    "status": "ACTIVE",
    "fundName": "Quỹ mua xe",
    "hasDeadline": true,
    "targetAmount": 50000000.00,
    "currentAmount": 10000000.00,
    "progressPercentage": 20.00,
    "frequency": "MONTHLY",
    "amountPerPeriod": 5000000.00,
    "startDate": "2024-02-01",
    "endDate": "2024-12-31",
    "note": "Tiết kiệm để mua xe",
    "reminderEnabled": true,
    "reminderType": "MONTHLY",
    "reminderTime": "20:00:00",
    "reminderDayOfMonth": 1,
    "autoDepositEnabled": true,
    "autoDepositType": "CUSTOM_SCHEDULE",
    "sourceWalletId": 2,
    "sourceWalletName": "Ví nguồn",
    "autoDepositScheduleType": "MONTHLY",
    "autoDepositTime": "20:00:00",
    "autoDepositDayOfMonth": 1,
    "autoDepositAmount": 5000000.00,
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00",
    "members": null,
    "memberCount": null
  }
}
```

**Lưu ý:** 
- Chỉ chủ quỹ hoặc thành viên mới được xem chi tiết
- Response bao gồm đầy đủ thông tin về quỹ, nhắc nhở, tự động nạp tiền, và danh sách thành viên (nếu là quỹ nhóm)

**Lỗi có thể xảy ra:**
- `"Không tìm thấy quỹ"` - Fund ID không tồn tại
- `"Bạn không có quyền xem quỹ này"` - User không phải chủ quỹ hoặc thành viên

---

### 7. Cập nhật quỹ
**PUT** `/funds/{id}`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "fundName": "Quỹ mua xe mới",
  "frequency": "WEEKLY",
  "amountPerPeriod": 1000000.00,
  "startDate": "2024-02-01",
  "endDate": "2024-12-31",
  "note": "Cập nhật ghi chú",
  "reminderEnabled": true,
  "reminderType": "WEEKLY",
  "reminderTime": "20:00:00",
  "reminderDayOfWeek": 1,
  "autoDepositEnabled": false
}
```

**Lưu ý:**
- Chỉ chủ quỹ mới được sửa
- Chỉ có thể sửa: tên quỹ, tần suất, số tiền mỗi kỳ, ngày bắt đầu/kết thúc, ghi chú, nhắc nhở, tự động nạp
- Không thể sửa: loại quỹ, loại kỳ hạn, ví đích, số tiền mục tiêu (nếu có kỳ hạn)

**Lỗi có thể xảy ra:**
- `"Không tìm thấy quỹ"` - Fund ID không tồn tại
- `"Chỉ chủ quỹ mới được sửa thông tin quỹ"` - User không phải chủ quỹ
- `"Không thể sửa quỹ đã đóng hoặc đã hoàn thành"` - Quỹ không ở trạng thái ACTIVE

**Response:**
```json
{
  "message": "Cập nhật quỹ thành công",
  "fund": { ... }
}
```

---

### 8. Đóng quỹ
**PUT** `/funds/{id}/close`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Đóng quỹ thành công"
}
```

**Lưu ý:** 
- Chỉ chủ quỹ mới được đóng quỹ
- Quỹ đóng sẽ có status = `CLOSED`
- Quỹ đóng không thể nạp tiền hoặc rút tiền

**Lỗi có thể xảy ra:**
- `"Không tìm thấy quỹ"` - Fund ID không tồn tại
- `"Chỉ chủ quỹ mới được đóng quỹ"` - User không phải chủ quỹ

---

### 9. Xóa quỹ
**DELETE** `/funds/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Xóa quỹ thành công"
}
```

**Lưu ý:** 
- Chỉ chủ quỹ mới được xóa
- Xóa quỹ sẽ xóa tất cả thành viên và dữ liệu liên quan
- Xóa quỹ là thao tác không thể hoàn tác

**Lỗi có thể xảy ra:**
- `"Không tìm thấy quỹ"` - Fund ID không tồn tại
- `"Chỉ chủ quỹ mới được xóa quỹ"` - User không phải chủ quỹ

---

### 10. Nạp tiền vào quỹ
**POST** `/funds/{id}/deposit`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amount": 5000000.00
}
```

**Response:**
```json
{
  "message": "Nạp tiền vào quỹ thành công",
  "fund": {
    "fundId": 1,
    "currentAmount": 15000000.00,
    "progressPercentage": 30.00,
    "status": "ACTIVE"
  }
}
```

**Lưu ý:**
- Chủ quỹ hoặc thành viên (CONTRIBUTOR) có thể nạp tiền
- Nếu đạt mục tiêu, quỹ sẽ tự động chuyển sang status = `COMPLETED`
- Số tiền nạp sẽ được cộng vào `currentAmount` của quỹ và số dư của ví đích

**Lỗi có thể xảy ra:**
- `"Không tìm thấy quỹ"` - Fund ID không tồn tại
- `"Chỉ chủ quỹ hoặc thành viên mới được nạp tiền"` - User không có quyền
- `"Số tiền nạp phải lớn hơn 0"` - Số tiền không hợp lệ
- `"Ví đích không tồn tại"` - Ví đích đã bị xóa hoặc không tồn tại
- `"Số dư ví không đủ để nạp"` - Số dư ví nguồn không đủ (nếu nạp từ ví khác)

---

### 11. Rút tiền từ quỹ
**POST** `/funds/{id}/withdraw`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amount": 2000000.00
}
```

**Response:**
```json
{
  "message": "Rút tiền từ quỹ thành công",
  "fund": {
    "fundId": 1,
    "currentAmount": 8000000.00,
    "progressPercentage": 16.00
  }
}
```

**Lưu ý:**
- Chỉ quỹ không kỳ hạn mới được rút tiền
- Chỉ chủ quỹ mới được rút tiền
- Số tiền rút không được vượt quá số tiền hiện có trong quỹ
- Số tiền rút sẽ được trừ từ `currentAmount` của quỹ và số dư của ví đích

**Lỗi có thể xảy ra:**
- `"Không tìm thấy quỹ"` - Fund ID không tồn tại
- `"Chỉ quỹ không kỳ hạn mới được rút tiền"` - Quỹ có kỳ hạn không được rút
- `"Chỉ chủ quỹ mới được rút tiền"` - User không phải chủ quỹ
- `"Số tiền rút phải lớn hơn 0"` - Số tiền không hợp lệ
- `"Số tiền trong quỹ không đủ để rút"` - currentAmount < amount
- `"Ví đích không tồn tại"` - Ví đích đã bị xóa hoặc không tồn tại

---

### 12. Kiểm tra ví có đang được sử dụng
**GET** `/funds/check-wallet/{walletId}`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "isUsed": false
}
```

**Lưu ý:** 
- Kiểm tra ví có đang được sử dụng cho quỹ hoặc ngân sách khác không
- Trả về `true` nếu ví đã được sử dụng làm ví đích (targetWallet) cho một quỹ
- Trả về `false` nếu ví chưa được sử dụng

**Lỗi có thể xảy ra:**
- `"Lỗi hệ thống: ..."` - Lỗi server khi kiểm tra

---

## 💾 Backup & Sync APIs (Sao lưu & Đồng bộ)

### 1. Kiểm tra trạng thái cấu hình cloud backup
**GET** `/backups/config-status`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "isConfigured": false,
  "message": "Chức năng sao lưu cloud chưa được cấu hình. Vui lòng liên hệ quản trị viên để được hỗ trợ."
}
```

**Response khi đã cấu hình:**
```json
{
  "isConfigured": true,
  "message": "Cloud backup đã được cấu hình"
}
```

**Lưu ý:**
- Dùng để kiểm tra xem cloud backup có được cấu hình chưa trước khi hiển thị nút "Sao lưu ngay"
- Frontend có thể gọi API này khi load trang để disable/enable các nút backup

---

### 2. Sao lưu dữ liệu thủ công
**POST** `/backups/trigger`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Backup dữ liệu thành công",
  "backup": {
    "backupId": 1,
    "status": "SUCCESS",
    "requestedAt": "2024-11-26T10:00:00",
    "completedAt": "2024-11-26T10:00:05",
    "fileUrl": "https://s3.amazonaws.com/bucket/user-1/backup-20241126100000.json",
    "fileSizeBytes": 15234,
    "errorMessage": null
  }
}
```

**Lưu ý:**
- Backup tất cả dữ liệu của user: wallets, transactions, budgets
- Dữ liệu được lưu dưới dạng JSON và upload lên cloud storage (AWS S3)
- Cần cấu hình `cloud.aws.*` trong `application.properties` để sử dụng
- Nếu cloud backup chưa được bật, sẽ trả về lỗi: `"Chức năng sao lưu cloud chưa được cấu hình. Vui lòng liên hệ quản trị viên để được hỗ trợ."`

**Lỗi có thể xảy ra:**
- `"Chức năng sao lưu cloud chưa được cấu hình. Vui lòng liên hệ quản trị viên để được hỗ trợ."` - Cloud storage chưa được cấu hình
- `"Backup dữ liệu thất bại: ..."` - Lỗi khi upload lên cloud

---

### 3. Lấy lịch sử backup
**GET** `/backups/history`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "history": [
    {
      "backupId": 1,
      "status": "SUCCESS",
      "requestedAt": "2024-11-26T10:00:00",
      "completedAt": "2024-11-26T10:00:05",
      "fileUrl": "https://s3.amazonaws.com/bucket/user-1/backup-20241126100000.json",
      "fileSizeBytes": 15234,
      "errorMessage": null
    },
    {
      "backupId": 2,
      "status": "FAILED",
      "requestedAt": "2024-11-25T10:00:00",
      "completedAt": "2024-11-25T10:00:03",
      "fileUrl": null,
      "fileSizeBytes": 0,
      "errorMessage": "Connection timeout"
    }
  ],
  "total": 2
}
```

**Response Fields:**
- `status`: Trạng thái backup - `PENDING`, `SUCCESS`, `FAILED`
- `fileUrl`: URL để download file backup (null nếu thất bại)
- `fileSizeBytes`: Kích thước file backup (bytes)
- `errorMessage`: Thông báo lỗi (null nếu thành công)

---

### 4. Bật/tắt đồng bộ tự động
**PUT** `/backups/auto-sync`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "message": "Đã bật đồng bộ tự động",
  "autoBackupEnabled": true
}
```

**Lưu ý:**
- Khi bật (`enabled: true`), hệ thống sẽ tự động backup dữ liệu mỗi ngày lúc 02:00 sáng
- Khi tắt (`enabled: false`), hệ thống sẽ không tự động backup cho user này
- Mặc định: `autoBackupEnabled = false` (tắt)
- Chỉ backup user có `autoBackupEnabled = true`

**Lỗi có thể xảy ra:**
- `"Vui lòng cung cấp trường 'enabled' (true/false)"` - Thiếu field `enabled` trong request

---

### 5. Lấy trạng thái đồng bộ tự động
**GET** `/backups/auto-sync`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "autoBackupEnabled": true
}
```

**Lưu ý:**
- Trả về trạng thái hiện tại của auto backup cho user
- Dùng để hiển thị toggle switch trong UI

---

## ⭐ App Review APIs (Đánh giá ứng dụng)

### 1. Gửi đánh giá ứng dụng
**POST** `/app-reviews`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "displayName": "Nguyễn Văn A",
  "rating": 5,
  "content": "Ứng dụng rất tuyệt vời, giao diện đẹp và dễ sử dụng!"
}
```

**Request Fields:**
- `displayName` (optional): Tên hiển thị (tối đa 100 ký tự). Nếu không nhập, mặc định là "Người dùng ẩn danh"
- `rating` (required): Mức độ hài lòng (1-5 sao)
- `content` (required): Nội dung đánh giá (tối đa 5000 ký tự)

**Response:**
```json
{
  "message": "Cảm ơn bạn đã đánh giá ứng dụng! Chúng tôi sẽ xem xét và phản hồi sớm nhất có thể.",
  "review": {
    "reviewId": 1,
    "userId": 1,
    "userEmail": "user@example.com",
    "userName": "Nguyễn Văn A",
    "displayName": "Nguyễn Văn A",
    "rating": 5,
    "content": "Ứng dụng rất tuyệt vời...",
    "status": "PENDING",
    "adminReply": null,
    "repliedAt": null,
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00"
  }
}
```

**Lưu ý:**
- Mỗi người dùng chỉ được đánh giá một lần
- Hệ thống tự động gửi thông báo cho admin khi có đánh giá mới
- Trạng thái ban đầu: `PENDING` (chờ admin phản hồi)

**Lỗi có thể xảy ra:**
- `"Bạn đã gửi đánh giá trước đó. Mỗi người dùng chỉ được đánh giá một lần."` - User đã đánh giá rồi

---

### 2. Lấy đánh giá của user hiện tại
**GET** `/app-reviews/my-review`

**Headers:** `Authorization: Bearer <token>`

**Response (đã có đánh giá):**
```json
{
  "hasReview": true,
  "review": {
    "reviewId": 1,
    "userId": 1,
    "userEmail": "user@example.com",
    "userName": "Nguyễn Văn A",
    "displayName": "Nguyễn Văn A",
    "rating": 5,
    "content": "Ứng dụng rất tuyệt vời...",
    "status": "ANSWERED",
    "adminReply": "Cảm ơn bạn đã đánh giá! Chúng tôi sẽ tiếp tục cải thiện ứng dụng.",
    "repliedAt": "2024-01-01T11:00:00",
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T11:00:00"
  }
}
```

**Response (chưa có đánh giá):**
```json
{
  "hasReview": false,
  "review": null
}
```

**Lưu ý:**
- Trả về đánh giá của user nếu đã gửi
- Nếu admin đã phản hồi, `adminReply` sẽ có nội dung

---

### 3. Lấy thống kê đánh giá
**GET** `/app-reviews/stats`

**Headers:** Không cần (public endpoint)

**Response:**
```json
{
  "totalReviews": 15,
  "pendingCount": 3,
  "answeredCount": 12,
  "averageRating": 4.5,
  "repliedCount": 12
}
```

**Response Fields:**
- `totalReviews`: Tổng số đánh giá
- `pendingCount`: Số đánh giá chờ phản hồi
- `answeredCount`: Số đánh giá đã được phản hồi
- `averageRating`: Điểm trung bình (1-5)
- `repliedCount`: Số đánh giá admin đã phản hồi

**Lưu ý:**
- Endpoint này có thể public để hiển thị trên trang chủ/landing page
- Dùng để hiển thị "4.5/5 dựa trên 15 đánh giá"

---

### 4. Admin - Lấy tất cả đánh giá
**GET** `/admin/app-reviews`

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `status` (optional): Lọc theo trạng thái - `PENDING`, `ANSWERED`

**Response:**
```json
{
  "reviews": [
    {
      "reviewId": 1,
      "userId": 1,
      "userEmail": "user@example.com",
      "userName": "Nguyễn Văn A",
      "displayName": "Nguyễn Văn A",
      "rating": 5,
      "content": "Ứng dụng rất tuyệt vời...",
      "status": "PENDING",
      "adminReply": null,
      "repliedAt": null,
      "createdAt": "2024-01-01T10:00:00",
      "updatedAt": "2024-01-01T10:00:00"
    }
  ],
  "total": 1,
  "stats": {
    "totalReviews": 15,
    "pendingCount": 3,
    "answeredCount": 12,
    "averageRating": 4.5,
    "repliedCount": 12
  }
}
```

**Lưu ý:** Chỉ ADMIN mới có quyền truy cập

---

### 5. Admin - Lấy chi tiết một đánh giá
**GET** `/admin/app-reviews/{id}`

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "review": {
    "reviewId": 1,
    "userId": 1,
    "userEmail": "user@example.com",
    "userName": "Nguyễn Văn A",
    "displayName": "Nguyễn Văn A",
    "rating": 5,
    "content": "Ứng dụng rất tuyệt vời...",
    "status": "PENDING",
    "adminReply": null,
    "repliedAt": null,
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00"
  }
}
```

---

### 6. Admin - Phản hồi đánh giá
**PUT** `/admin/app-reviews/{id}/reply`

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "adminReply": "Cảm ơn bạn đã đánh giá! Chúng tôi sẽ tiếp tục cải thiện ứng dụng."
}
```

**Response:**
```json
{
  "message": "Phản hồi đánh giá thành công",
  "review": {
    "reviewId": 1,
    "status": "ANSWERED",
    "adminReply": "Cảm ơn bạn đã đánh giá!...",
    "repliedAt": "2024-01-01T11:00:00",
    ...
  }
}
```

**Lưu ý:**
- Tự động chuyển status sang `ANSWERED`
- Hệ thống tự động gửi thông báo cho user khi admin phản hồi

---

### 7. Admin - Xóa đánh giá
**DELETE** `/admin/app-reviews/{id}`

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "message": "Xóa đánh giá thành công"
}
```

**Lưu ý:** Xóa hoàn toàn khỏi database

---

### 8. Admin - Lấy thống kê đánh giá
**GET** `/admin/app-reviews/stats`

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "totalReviews": 15,
  "pendingCount": 3,
  "answeredCount": 12,
  "averageRating": 4.5,
  "repliedCount": 12
}
```

---

## 🔔 Notification APIs (Thông báo)

### 1. Lấy tất cả thông báo
**GET** `/notifications`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "notifications": [
    {
      "notificationId": 1,
      "type": "REVIEW_REPLIED",
      "title": "Admin đã phản hồi đánh giá của bạn",
      "message": "Admin đã phản hồi đánh giá ứng dụng của bạn. Nhấn để xem chi tiết.",
      "referenceId": 1,
      "referenceType": "APP_REVIEW",
      "isRead": false,
      "readAt": null,
      "createdAt": "2024-01-01T11:00:00"
    },
    {
      "notificationId": 2,
      "type": "BUDGET_WARNING",
      "title": "Ngân sách sắp hết",
      "message": "Ngân sách 'Ăn uống' đã sử dụng 85%. Còn lại: 750.000 VND",
      "referenceId": 1,
      "referenceType": "BUDGET",
      "isRead": true,
      "readAt": "2024-01-01T12:00:00",
      "createdAt": "2024-01-01T10:00:00"
    }
  ],
  "total": 2
}
```

**Lưu ý:**
- Tự động phân biệt user/admin dựa trên role trong token
- Admin nhận thông báo về đánh giá/feedback mới
- User nhận thông báo về phản hồi từ admin, cảnh báo ngân sách

---

### 2. Lấy thông báo chưa đọc
**GET** `/notifications/unread`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "notifications": [
    {
      "notificationId": 1,
      "type": "REVIEW_REPLIED",
      "title": "Admin đã phản hồi đánh giá của bạn",
      "message": "Admin đã phản hồi đánh giá ứng dụng của bạn...",
      "referenceId": 1,
      "referenceType": "APP_REVIEW",
      "isRead": false,
      "readAt": null,
      "createdAt": "2024-01-01T11:00:00"
    }
  ],
  "total": 1
}
```

---

### 3. Đếm số thông báo chưa đọc
**GET** `/notifications/unread-count`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "unreadCount": 5
}
```

**Lưu ý:**
- Dùng để hiển thị badge số trên icon thông báo
- Tự động phân biệt user/admin

---

### 4. Đánh dấu thông báo đã đọc
**PUT** `/notifications/{id}/read`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Đã đánh dấu đã đọc",
  "notification": {
    "notificationId": 1,
    "isRead": true,
    "readAt": "2024-01-01T12:00:00",
    ...
  }
}
```

---

### 5. Đánh dấu tất cả thông báo đã đọc
**PUT** `/notifications/mark-all-read`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Đã đánh dấu tất cả thông báo là đã đọc"
}
```

---

### 6. Xóa thông báo
**DELETE** `/notifications/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Xóa thông báo thành công"
}
```

**Lưu ý:** Chỉ có thể xóa thông báo của chính mình

---

## 📝 Lưu ý quan trọng

### Error Response Format
Tất cả API trả về lỗi theo format:
```json
{
  "error": "Thông báo lỗi"
}
```

### Status Codes
- `200 OK` - Thành công
- `400 Bad Request` - Dữ liệu không hợp lệ
- `401 Unauthorized` - Chưa đăng nhập hoặc token hết hạn
- `403 Forbidden` - Không có quyền truy cập
- `404 Not Found` - Không tìm thấy resource
- `500 Internal Server Error` - Lỗi server

### Currency Codes
Hỗ trợ các loại tiền tệ: `VND`, `USD`, `EUR`, `JPY`, `GBP`, `CNY`

### Transaction Types
- `1` - Chi tiêu
- `2` - Thu nhập

### Budget Status
- `PENDING` - Thời gian ngân sách chưa bắt đầu
- `ACTIVE` - Đang hoạt động và còn trong hạn mức
- `WARNING` - Đang hoạt động nhưng đã chạm ngưỡng cảnh báo
- `EXCEEDED` - Đã vượt hạn mức
- `COMPLETED` - Đã kết thúc (sau ngày kết thúc mà không vượt hạn mức)

### Schedule Type
- `ONCE` - Một lần
- `DAILY` - Hàng ngày
- `WEEKLY` - Hàng tuần
- `MONTHLY` - Hàng tháng
- `YEARLY` - Hàng năm

### Schedule Status
- `PENDING` - Đang chờ thực hiện
- `COMPLETED` - Đã thực hiện thành công
- `FAILED` - Thất bại (thường do không đủ tiền)
- `CANCELLED` - Đã hủy bởi user (không xóa, chỉ đổi status)

### Backup Status
- `PENDING` - Đang xử lý
- `SUCCESS` - Thành công
- `FAILED` - Thất bại

### Wallet Types
- `PERSONAL` - Ví cá nhân
- `GROUP` - Ví nhóm (chia sẻ)

### Wallet Roles
- `OWNER` - Chủ sở hữu
- `MEMBER` - Thành viên

### Feedback Types
- `FEEDBACK` - Phản hồi chung
- `BUG` - Báo lỗi
- `FEATURE` - Đề xuất tính năng
- `OTHER` - Khác

### Feedback Status
- `PENDING` - Đang chờ xử lý
- `REVIEWED` - Đã xem
- `RESOLVED` - Đã xử lý
- `CLOSED` - Đã đóng

### Fund Types
- `PERSONAL` - Quỹ cá nhân
- `GROUP` - Quỹ nhóm

### Fund Status
- `ACTIVE` - Đang hoạt động
- `CLOSED` - Đã đóng
- `COMPLETED` - Đã hoàn thành (đạt mục tiêu)

### Fund Frequency
- `DAILY` - Hàng ngày
- `WEEKLY` - Hàng tuần
- `MONTHLY` - Hàng tháng
- `YEARLY` - Hàng năm

### Reminder Type
- `DAILY` - Theo ngày
- `WEEKLY` - Theo tuần
- `MONTHLY` - Theo tháng
- `YEARLY` - Theo năm

### Auto Deposit Type
- `FOLLOW_REMINDER` - Nạp theo lịch nhắc nhở
- `CUSTOM_SCHEDULE` - Tự thiết lập lịch nạp

### Fund Member Role
- `OWNER` - Chủ quỹ
- `CONTRIBUTOR` - Được sử dụng (có thể nạp tiền)

### App Review Status
- `PENDING` - Chờ admin phản hồi
- `ANSWERED` - Admin đã phản hồi

### Notification Types
- `NEW_APP_REVIEW` - Admin nhận: có đánh giá ứng dụng mới
- `REVIEW_REPLIED` - User nhận: admin đã phản hồi đánh giá
- `NEW_FEEDBACK` - Admin nhận: có feedback mới
- `FEEDBACK_REPLIED` - User nhận: admin đã phản hồi feedback
- `BUDGET_WARNING` - User nhận: ngân sách sắp hết
- `BUDGET_EXCEEDED` - User nhận: ngân sách vượt hạn mức
- `SYSTEM_ANNOUNCEMENT` - Thông báo hệ thống

---

## 🔧 Cấu hình CORS

Backend đã cấu hình CORS cho các origin:
- `http://localhost:3000`
- `http://localhost:5173`
- `http://localhost:3001`

---

## 📞 Liên hệ

Nếu có vấn đề với API, vui lòng kiểm tra:
1. Token có còn hạn không
2. Request body format đúng chưa
3. Headers có đầy đủ không
4. User có quyền truy cập resource không

