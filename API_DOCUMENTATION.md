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
    }
  ],
  "total": 1
}
```

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

### 1. Tạo giao dịch chi tiêu
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
    "wallet": {
      "walletId": 1,
      "balance": 950000.00
    }
  }
}
```

---

### 2. Tạo giao dịch thu nhập
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

### Wallet Types
- `PERSONAL` - Ví cá nhân
- `GROUP` - Ví nhóm (chia sẻ)

### Wallet Roles
- `OWNER` - Chủ sở hữu
- `MEMBER` - Thành viên

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

