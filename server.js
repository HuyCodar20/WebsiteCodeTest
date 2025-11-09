const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer"); 
const fs = require("fs"); 

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const uploadsDir = path.join(__dirname, 'public/uploads');

if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Đã tạo thư mục: ${uploadsDir}`);
}

app.use('/uploads', express.static(uploadsDir));

// --- 1. KẾT NỐI MONGODB ATLAS (Giữ nguyên) ---
const uri = "mongodb+srv://Admin01:Website123456@cluster0.ipbas5n.mongodb.net/DB_SWTesting?retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(() => console.log("✅ Kết nối MongoDB Atlas thành công!"))
  .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

// --- 2. ĐỊNH NGHĨA USER SCHEMA (Giữ nguyên) ---
const userSchema = new mongoose.Schema({
    UserID: { type: Number, required: true, unique: true },
    Username: { type: String, required: true, unique: true },
    Email: { type: String, required: true, unique: true },
    Password: { type: String, required: true }, 
    AvatarURL: { type: String, default: '/images/default-avatar.png' },
    Role: { type: String, default: 'user' },
    CreatedAt: { type: Date, default: Date.now }
}, {
    collection: 'users' 
});

const User = mongoose.model('User', userSchema);


// --- CẤU HÌNH MULTER (Giữ nguyên) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/'); 
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });


// ===============================================
// API ĐĂNG KÝ (Giữ nguyên)
// ===============================================
app.post('/api/register', upload.single('avatar'), async (req, res) => {
    const { username, email, password } = req.body;
    const avatarFile = req.file;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
    }
    if (!avatarFile) {
        return res.status(400).json({ message: 'Vui lòng chọn ảnh đại diện.' });
    }

    try {
        const existingUser = await User.findOne({ 
            $or: [{ Username: username }, { Email: email }] 
        });

        if (existingUser) {
            return res.status(409).json({ message: 'Username hoặc Email đã tồn tại.' });
        }

        let newUserID = 101;
        const lastUser = await User.findOne({}, {}, { sort: { 'UserID': -1 } });
        if (lastUser) {
            newUserID = lastUser.UserID + 1;
        }
        const avatarUrlPath = `/uploads/${avatarFile.filename}`;

        const newUser = new User({
            UserID: newUserID,
            Username: username,
            Email: email,
            Password: password, 
            AvatarURL: avatarUrlPath 
        });

        const savedUser = await newUser.save();
        console.log(`Đã đăng ký (không mã hóa) user: ${username} với ảnh: ${avatarUrlPath}`);
        
        const userResponse = savedUser.toObject(); 
        delete userResponse.Password; 

        res.status(201).json({ 
            message: 'Đăng ký thành công!', 
            user: userResponse 
        });

    } catch (error) {
        console.error("Lỗi khi đăng ký:", error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
});

// ===============================================
// API ĐĂNG NHẬP (ĐÃ SỬA LỖI)
// ===============================================
app.post('/api/login', async (req, res) => {
    // --- BẮT ĐẦU SỬA LỖI ---
    // (Đã xóa dòng "AIPost('/api/login', ...)" bị lỗi ở đây)
    // --- KẾT THÚC SỬA LỖI ---

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập Username và Password.' });
    }

    try {
        const user = await User.findOne({ Username: username });

        if (!user) {
            return res.status(404).json({ message: 'Tài khoản không tồn tại!' });
        }

        if (user.Password !== password) {
            return res.status(401).json({ message: 'Sai mật khẩu!' });
        }

        res.json({
            message: 'Đăng nhập thành công!',
            user: {
                userId: user.UserID,
                username: user.Username,
                avatarUrl: user.AvatarURL, // Gửi kèm avatarUrl
                role: user.Role
            }
        });

    } catch (error) {
        console.error("Lỗi khi đăng nhập:", error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
});
// (Dòng "});" bị thừa đã được xóa)

// ===============================================
// ROUTES CƠ BẢN (Giữ nguyên)
// ===============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'MainPage.html'));
});

// ===============================================
// KHỞI ĐỘNG SERVER (Giữ nguyên)
// ===============================================
app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});