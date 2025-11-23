# Hướng dẫn Deploy lên Netlify

1. Đảm bảo code đã được commit và push lên Git provider (GitHub/GitLab/Bitbucket).
2. Trên Netlify -> "New site from Git" -> chọn repository của bạn.
3. Trong phần Build settings, thiết lập:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Thêm các biến môi trường cần thiết trong Site settings -> Build & deploy -> Environment (ví dụ: `GEMINI_API_KEY`).
5. Deploy — Netlify sẽ chạy `npm run build` và xuất `dist`.

Các ghi chú hữu ích:
- File `netlify.toml` đã được thêm vào repo để Netlify biết command và thư mục publish.
- File `public/_redirects` đã được thêm để hỗ trợ SPA routing (chuyển tất cả requests về `index.html`).
- Nếu muốn deploy thủ công, chạy `npm run build` cục bộ rồi kéo-thả thư mục `dist` vào Netlify Deploys.
