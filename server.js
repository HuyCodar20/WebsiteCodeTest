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
// API ĐĂNG NHẬP (DÙNG EMAIL)
// ===============================================
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body; 
    const identifier = username; 
    
    if (!identifier || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập Email và Password.' });
    }

    try {
        const user = await User.findOne({ Email: identifier }); 

        if (!user) {
            return res.status(404).json({ message: 'Email không tồn tại!' });
        }

        if (user.Password !== password) {
            return res.status(401).json({ message: 'Sai mật khẩu!' });
        }
        res.json({
            message: 'Đăng nhập thành công!',
            user: {
            userId: user.UserID,
            username: user.Username, 
            email: user.Email, 
            avatarUrl: user.AvatarURL, 
            role: user.Role,
            createdAt: user.CreatedAt 
            }
     });

    } catch (error) {
        console.error("Lỗi khi đăng nhập:", error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
});

// ===============================================
// API LẤY THÔNG TIN PROFILE CHI TIẾT
// ===============================================
app.get('/api/profile/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId); 
        
        const user = await User.findOne({ UserID: userId }).select('-Password'); 
        
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        }
        
        res.json({ user }); 
        
    } catch (error) {
        console.error("Lỗi khi lấy thông tin profile:", error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
});


// ===============================================
// 🛠️ API CẬP NHẬT PROFILE CHUNG (USERNAME)
// ===============================================
app.put('/api/profile/update', async (req, res) => {
    const { userId, username } = req.body; 
    
    if (!userId || !username) {
        return res.status(400).json({ message: 'Thiếu User ID hoặc Username mới.' });
    }
    
    try {
        // Kiểm tra xem Username mới có bị trùng không (trừ user hiện tại)
        const existingUser = await User.findOne({ Username: username, UserID: { $ne: userId } });
        if (existingUser) {
            return res.status(409).json({ message: 'Username này đã có người sử dụng.' });
        }

        // Cập nhật Username
        const updatedUser = await User.findOneAndUpdate(
            { UserID: userId },
            { Username: username },
            { new: true, select: '-Password' } // Trả về user mới, loại bỏ mật khẩu
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng để cập nhật.' });
        }

        res.json({ 
            message: 'Cập nhật tên người dùng thành công!', 
            user: updatedUser 
        });
    } catch (error) {
        console.error("Lỗi cập nhật profile:", error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
    }
});


// ===============================================
// 🛠️ API ĐỔI MẬT KHẨU
// ===============================================
app.put('/api/password/change', async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;
    
    if (!userId || !oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Thiếu thông tin mật khẩu.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    try {
        const user = await User.findOne({ UserID: userId });

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        }

        // 1. Kiểm tra mật khẩu cũ (Vì bạn đang lưu plaintext)
        if (user.Password !== oldPassword) {
            return res.status(401).json({ message: 'Mật khẩu cũ không chính xác.' });
        }

        // 2. Cập nhật mật khẩu mới 
        user.Password = newPassword;
        await user.save();

        res.json({ message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' });
    } catch (error) {
        console.error("Lỗi đổi mật khẩu:", error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
    }
});


// ===============================================
// 🛠️ API CẬP NHẬT AVATAR
// ===============================================
// Dùng upload.single('avatar') để xử lý file từ client
app.put('/api/avatar/update', upload.single('avatar'), async (req, res) => {
    const userId = req.body.userId;
    const avatarFile = req.file;

    if (!userId || !avatarFile) {
        return res.status(400).json({ message: 'Thiếu User ID hoặc file ảnh.' });
    }

    try {
        const newAvatarUrlPath = `/uploads/${avatarFile.filename}`;

        const updatedUser = await User.findOneAndUpdate(
            { UserID: userId },
            { AvatarURL: newAvatarUrlPath },
            { new: true, select: 'AvatarURL' }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        }
        
        res.json({ 
            message: 'Cập nhật ảnh đại diện thành công!', 
            newAvatarUrl: updatedUser.AvatarURL 
        });

    } catch (error) {
        console.error("Lỗi cập nhật Avatar:", error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
    }
});


// ===============================================
// ROUTES CƠ BẢN (Giữ nguyên)
// ===============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'MainPage.html'));
});

app.get('/profile', (req, res) => {
    // Trả về file profile.html
    res.sendFile(path.join(__dirname, 'public', 'pages', 'profile.html'));
});

// ===============================================
// KHỞI ĐỘNG SERVER (Giữ nguyên)
// ===============================================
app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});