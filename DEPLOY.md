# Hướng dẫn Deploy lên GitHub Pages

## Cách 1: Sử dụng GitHub Actions (Tự động) - Khuyến nghị

1. **Tạo repository trên GitHub:**
   - Tạo một repository mới trên GitHub (ví dụ: `fruitshoponline`)
   - Đẩy code lên repository:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin https://github.com/USERNAME/REPO_NAME.git
     git push -u origin main
     ```

2. **Bật GitHub Pages:**
   - Vào Settings > Pages trong repository
   - Source: chọn "GitHub Actions"
   - Lưu lại

3. **Cập nhật base path trong vite.config.ts:**
   - Nếu repository tên là `username.github.io`: đổi thành `base: '/'`
   - Nếu repository tên khác (ví dụ: `fruitshoponline`): giữ `base: '/fruitshoponline/'`
   - **Lưu ý:** Base path phải khớp với tên repository

4. **Push code lên GitHub:**
   - Mỗi lần push lên branch `main`, GitHub Actions sẽ tự động:
     - Build project (tự động tạo file `404.html`)
     - Deploy lên GitHub Pages
   - Xem tiến trình deploy tại tab "Actions" trong repository

## Cách 2: Deploy thủ công

1. **Build project:**
   ```bash
   npm run build
   ```

2. **Cập nhật base path trong vite.config.ts** (nếu cần)

3. **Tạo branch gh-pages:**
   ```bash
   git checkout -b gh-pages
   git add dist
   git commit -m "Deploy to GitHub Pages"
   git subtree push --prefix dist origin gh-pages
   ```

4. **Bật GitHub Pages:**
   - Vào Settings > Pages
   - Source: chọn branch `gh-pages` và folder `/ (root)`

## Lưu ý:

- Nếu repository không phải là `username.github.io`, cần cập nhật `base` trong `vite.config.ts` thành tên repository
- Đảm bảo Firebase config đã được cấu hình đúng
- File `.env` không nên được commit (đã có trong .gitignore)
- File `404.html` sẽ được tự động tạo khi build để xử lý SPA routing trên GitHub Pages
- Sau khi build, file `dist/404.html` sẽ được tự động copy từ `index.html` để GitHub Pages có thể xử lý các route không tồn tại

