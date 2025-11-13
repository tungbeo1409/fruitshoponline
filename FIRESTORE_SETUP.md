# Hướng dẫn cấu hình Firestore

## Bước 1: Tạo Firestore Database

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project `fruit-shop-8b83a`
3. Vào **Firestore Database** ở menu bên trái
4. Click **Create database**
5. Chọn chế độ:
   - **Production mode** (khuyến nghị cho production)
   - **Test mode** (chỉ để test, sẽ hết hạn sau 30 ngày)
6. Chọn location (ví dụ: `asia-southeast1` cho Việt Nam)
7. Click **Enable**

## Bước 2: Cấu hình Firestore Security Rules

1. Vào tab **Rules** trong Firestore Database
2. Thay thế rules hiện tại bằng code sau:

### Rules cho Production (An toàn hơn)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cho phép user đọc và ghi thông tin cửa hàng của chính họ
    match /shopInfo/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
        // Cho phép user quản lý products, categories, suppliers, units, customers của chính họ
        match /users/{userId} {
          match /products/{productId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
          match /categories/{categoryId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
          match /suppliers/{supplierId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
          match /units/{unitId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
          match /customers/{customerId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
          match /promotions/{promotionId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
          match /vouchers/{voucherId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
          match /invoices/{invoiceId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
        }
  }
}
```

### Rules cho Test (Dễ dàng hơn, nhưng kém an toàn)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish** để lưu rules

## Bước 3: Kiểm tra

Sau khi cấu hình xong, thử:
1. Đăng nhập vào ứng dụng
2. Vào "Thông Tin Cửa Hàng"
3. Điền thông tin và lưu
4. Nếu không còn lỗi, đã cấu hình thành công!

## Lưu ý

- **Test mode rules** chỉ nên dùng trong giai đoạn phát triển
- **Production rules** nên được sử dụng khi deploy ứng dụng thực tế
- Đảm bảo Authentication đã được bật (Email/Password)

