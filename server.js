const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");

const app = express();
const PORT = 3000;

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- KẾT NỐI MONGODB ATLAS ---
const uri = "mongodb+srv://Admin01:Website123456@cluster0.ipbas5n.mongodb.net/DB_SWTesting?retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(() => console.log("✅ Kết nối MongoDB Atlas thành công!"))
  .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));


// --- DEFINITIONS: SCHEMAS & MODELS ---

// 1. User Model
const userSchema = new mongoose.Schema({
  UserID: { type: Number, required: true, unique: true },
  Username: { type: String, required: true, unique: true },
  Email: { type: String, required: true, unique: true },
  Password: { type: String, required: true },
  AvatarURL: { type: String, default: '/images/default-avatar.png' },
  Role: { type: String, default: 'user' },
  CreatedAt: { type: Date, default: Date.now }
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

// 2. Category (Topic) Model
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  icon: String,
  type: String, // 'framework', 'language', 'tool', etc.
  tags: [String],
  banner_image_url: String,
  long_description: String,
  theme_color: String
}, { collection: 'categories' }); // Map đúng vào collection 'categories' trong DB

const Category = mongoose.model('Category', categorySchema);

// 3. Test Model
const questionSchema = new mongoose.Schema({
  questionText: String,
  choices: [{
    choiceText: String,
    isCorrect: Boolean
  }]
});

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, default: 'pending' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
  numQuestions: Number,
  createdAt: { type: Date, default: Date.now },
  endDate: Date,
  questions: [questionSchema]
}, { collection: 'Tests' }); // Map đúng vào collection 'Tests'

const Test = mongoose.model('Test', testSchema);

// 4. Review Model
const reviewSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'TestReviews' }); // Map đúng vào collection 'TestReviews'

const Review = mongoose.model('Review', reviewSchema);


// --- CẤU HÌNH MULTER (UPLOAD FILE) ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Đảm bảo thư mục public/uploads đã tồn tại
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });


// --- SUPPORT FUNCTIONS ---

// Hàm xóa dấu tiếng Việt
function removeDiacritics(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD") // Tách dấu và chữ
    .replace(/[\u00c0-\u036f]/g, "") // Xóa các ký tự dấu 
    .replace(/đ/g, "d"); // Chuyển 'đ' thành 'd'
}

// Hàm escape Regex cho tìm kiếm
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


// --- API ROUTES ---

// 1. API: Lấy danh sách Topics (có lọc và tìm kiếm)
app.get('/api/topics', async (req, res) => {
  try {
    const { types, tags, search } = req.query;
    const queryObject = {};

    // Lọc theo type và tags ngay tại Database
    if (types) {
      queryObject.type = { $in: types.split(',') };
    }

    if (tags) {
      queryObject.tags = { $in: tags.split(',') };
    }

    // Sử dụng Model Category để find
    const dataFromDB = await Category.find(queryObject);

    let filteredData;

    // Logic tìm kiếm (Search) giữ nguyên: Xử lý phía Server sau khi lấy data
    if (search && search.trim() !== '') {
      const normalizedSearch = removeDiacritics(search.trim());
      const escapedSearch = escapeRegex(normalizedSearch);
      const searchRegex = new RegExp('\\b' + escapedSearch, 'i');

      filteredData = dataFromDB.filter(topic => {
        const topicName = removeDiacritics(topic.name);
        const topicDesc = removeDiacritics(topic.description || ""); // Handle null description
        return searchRegex.test(topicName) || searchRegex.test(topicDesc);
      });
    } else {
      filteredData = dataFromDB;
    }

    res.json(filteredData);

  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
    res.status(500).json({ message: "Lỗi server khi lấy dữ liệu." });
  }
});

// 2. API: Lấy chi tiết MỘT Category theo ID
app.get('/api/category/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "ID danh mục không hợp lệ." });
    }

    // Sử dụng Model Category để findById
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy danh mục này." });
    }

    res.json(category);

  } catch (error) {
    console.error("Lỗi khi lấy chi tiết category:", error);
    res.status(500).json({ message: "Lỗi server khi lấy thông tin danh mục." });
  }
});

// 3. API: Lấy danh sách bài Test theo Category ID
app.get('/api/tests', async (req, res) => {
  try {
    const { categoryId } = req.query;

    if (!categoryId) {
      return res.status(400).json({ message: "Thiếu categoryId." });
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "categoryId không hợp lệ." });
    }

    // Sử dụng Model Test để find
    const tests = await Test.find({ categoryId: categoryId });

    res.json(tests);

  } catch (error) {
    console.error("Lỗi khi lấy danh sách bài test:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách bài test." });
  }
});

// 4. API: Lấy danh sách Reviews cho một bài Test
app.get('/api/reviews', async (req, res) => {
  try {
    const { testId } = req.query;

    if (!testId || !mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ message: "testId không hợp lệ." });
    }

    // Sử dụng Model Review để find và sort
    const reviews = await Review.find({ testId: testId })
      .sort({ createdAt: -1 });

    res.json(reviews);

  } catch (error) {
    console.error("Lỗi khi lấy reviews:", error);
    res.status(500).json({ message: "Lỗi server khi lấy reviews." });
  }
});

// 5. API: Đăng ký User (Logic cũ, dùng Model User)
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
      Password: password, // Lưu ý: Nên mã hóa mật khẩu trong thực tế
      AvatarURL: avatarUrlPath
    });

    const savedUser = await newUser.save();
    console.log(`Đã đăng ký user: ${username} với ảnh: ${avatarUrlPath}`);

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

// 6. API: Đăng nhập (Logic cũ, dùng Model User)
app.post('/api/login', async (req, res) => {
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
        avatarUrl: user.AvatarURL,
        role: user.Role
      }
    });

  } catch (error) {
    console.error("Lỗi khi đăng nhập:", error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
});


// --- ROUTES GIAO DIỆN ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'MainPage.html'));
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});