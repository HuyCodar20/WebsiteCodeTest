const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs"); // Vẫn giữ lại để sau này dùng
const app = express();
const PORT = 3000;

// Middleware để đọc JSON và Form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ các file tĩnh trong thư mục 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Route cho trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'MainPage.html'));
});

// ===============================================
// API ĐĂNG KÝ (Giữ nguyên, không cần SQL)
// ===============================================
app.post('/api/register', async (req, res) => {
  const { username } = req.body;
  console.log('Đã nhận request đăng ký cho:', username);
  
  // (Các bước kiểm tra DB, băm mật khẩu... sẽ làm sau)
  
  res.status(201).json({ message: 'Đăng ký thành công!' });
});

// ===============================================
// API ĐĂNG NHẬP (ĐÃ CẬP NHẬT ĐỂ TEST)
// ===============================================
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`Đã nhận request đăng nhập cho: ${username}`);

  // (Các bước tìm user, so sánh mật khẩu... sẽ làm sau)

  // -- BƯỚC QUAN TRỌNG NHẤT --
  // Tạo một USER GIẢ LẬP (Mock User) dựa trên ERD của bạn
  // Chúng ta không cần SQL vì chúng ta tự tạo user ở đây
  const mockUser = {
      UserID: 123, // Giả lập
      Username: 'baoanvnp2004', // Tên user bạn muốn hiển thị
      Avatar_URL: '/images/default-avatar.png', // Đường dẫn avatar (bạn phải có file này)
      Role: 'user'
  };

  // Luôn trả về thành công và gửi kèm user giả lập
  res.json({ 
      message: 'Đăng nhập thành công! (Mocked)', 
      user: {
          userId: mockUser.UserID,
          username: mockUser.Username,
          avatarUrl: mockUser.Avatar_URL, // Dùng avatarUrl như main.js mong đợi
          role: mockUser.Role
      }
  });
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log("CHẾ ĐỘ TEST: API Đăng nhập sẽ luôn trả về user 'baoanvnp2004'.");
});