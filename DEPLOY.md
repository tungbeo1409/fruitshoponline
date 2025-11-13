# Hướng dẫn Deploy lên GitHub Pages

## Cách 1: Sử dụng GitHub Actions (Tự động)

1. **Tạo repository trên GitHub:**
   - Tạo một repository mới trên GitHub
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
   - Nếu repository tên là `username.github.io`: giữ `base: '/'`
   - Nếu repository tên khác (ví dụ: `fruit-shop`): đổi thành `base: '/fruit-shop/'`

4. **Push code lên GitHub:**
   - Mỗi lần push lên branch `main` hoặc `master`, GitHub Actions sẽ tự động build và deploy

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

