/* ==========================================================================
   SERVER CONFIGURATION & IMPORTS
   ========================================================================== */
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");

const app = express();
const PORT = 3000;

// Cấu hình kết nối MongoDB Atlas
const MONGO_URI = "mongodb+srv://Admin01:Website123456@cluster0.ipbas5n.mongodb.net/DB_SWTesting?retryWrites=true&w=majority";

/* ==========================================================================
   DATABASE CONNECTION
   ========================================================================== */
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Kết nối MongoDB Atlas thành công!"))
  .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

/* ==========================================================================
   MODELS & SCHEMAS (Định nghĩa dữ liệu)
   ========================================================================== */

/**
 * 1. User Model
 * Quản lý thông tin người dùng
 */
const userSchema = new mongoose.Schema({
  UserID: { type: Number, required: true, unique: true },
  Username: { type: String, required: true, unique: true },
  Email: { type: String, required: true, unique: true },
  Password: { type: String, required: true }, // Lưu ý: Nên mã hóa password trong thực tế
  AvatarURL: { type: String, default: '/images/default-avatar.png' },
  Role: { type: String, default: 'user' },
  CreatedAt: { type: Date, default: Date.now }
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

/**
 * 2. Category Model
 * Quản lý các chủ đề (Topic)
 */
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  icon: String,
  type: String, // Ví dụ: 'framework', 'language', 'tool'
  tags: [String],
  banner_image_url: String,
  long_description: String,
  theme_color: String
}, { collection: 'categories' });

const Category = mongoose.model('Category', categorySchema);

/**
 * 3. Question Model
 * Quản lý ngân hàng câu hỏi và đáp án
 */
const questionSchema = new mongoose.Schema({
  QuestionText: { type: String, required: true },
  QuestionType: { 
    type: String, 
    enum: ['multiple_choice', 'true_false'], 
    default: 'multiple_choice' 
  },
  Image: { type: String, default: null },
  Explanation: String,
  CategoryID: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  Difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'], 
    default: 'easy' 
  },
  CreatorUserID: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  Status: { type: String, default: 'Approved' },
  CreatedAt: { type: Date, default: Date.now },
  ReportCount: { type: Number, default: 0 },
  
  choices: [{
    choiceText: { type: String, required: true },
    isCorrect: { type: Boolean, required: true }
  }]
}, { collection: 'Questions' }); 

const Question = mongoose.model('Question', questionSchema);

/* ==========================================================================
   UTILITIES (Hàm hỗ trợ)
   ========================================================================== */

// Cấu hình Multer để upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Đảm bảo thư mục này tồn tại trong project
    cb(null, 'public/images/uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Hàm xóa dấu Tiếng Việt (dùng cho tìm kiếm)
function removeDiacritics(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

// Hàm escape ký tự đặc biệt cho Regex
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ==========================================================================
   MIDDLEWARE
   ========================================================================== */
app.use(express.json());
// Cấu hình thư mục tĩnh (Public folder)
app.use(express.static(path.join(__dirname, 'public')));


/* ==========================================================================
   API ROUTES
   ========================================================================== */

// --------------------------------------------------------------------------
// AUTHENTICATION & USER (Đăng ký, Đăng nhập, Profile)
// --------------------------------------------------------------------------

// Đăng ký tài khoản
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

    // Tạo UserID tự tăng thủ công 
    let newUserID = 101;
    const lastUser = await User.findOne({}, {}, { sort: { 'UserID': -1 } });
    if (lastUser) {
      newUserID = lastUser.UserID + 1;
    }

    const avatarUrlPath = `/images/uploads/${avatarFile.filename}`;

    const newUser = new User({
      UserID: newUserID,
      Username: username,
      Email: email,
      Password: password,
      AvatarURL: avatarUrlPath
    });

    const savedUser = await newUser.save();
    console.log(`User mới: ${username}`);
    
    // Loại bỏ password trước khi trả về client
    const userResponse = savedUser.toObject();
    delete userResponse.Password;

    res.status(201).json({ message: 'Đăng ký thành công!', user: userResponse });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
});

// Đăng nhập
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập Username và Password.' });
  }
  try {
    const user = await User.findOne({ Username: username });
    if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại!' });
    if (user.Password !== password) return res.status(401).json({ message: 'Sai mật khẩu!' });

    res.json({
      message: 'Đăng nhập thành công!',
      user: {
        _id: user._id,
        userId: user.UserID,
        username: user.Username,
        avatarUrl: user.AvatarURL,
        role: user.Role
      }
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
});

// Lấy thông tin Profile
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await User.findOne({ UserID: userId }).select('-Password');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
});

// Cập nhật Username
app.put('/api/profile/update', async (req, res) => {
  const { userId, username } = req.body;

  if (!userId || !username)
    return res.status(400).json({ message: 'Thiếu User ID hoặc Username mới.' });

  try {
    const existing = await User.findOne({ Username: username, UserID: { $ne: userId } });
    if (existing)
      return res.status(409).json({ message: 'Username này đã có người sử dụng.' });

    const updated = await User.findOneAndUpdate(
      { UserID: userId },
      { Username: username },
      { new: true, select: '-Password' }
    );

    if (!updated)
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    res.json({ message: 'Cập nhật tên người dùng thành công!', user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
});

// Đổi mật khẩu
app.put('/api/password/change', async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;

  if (!userId || !oldPassword || !newPassword)
    return res.status(400).json({ message: 'Thiếu thông tin mật khẩu.' });
  if (newPassword.length < 6)
    return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });

  try {
    const user = await User.findOne({ UserID: userId });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    if (user.Password !== oldPassword)
      return res.status(401).json({ message: 'Mật khẩu cũ không chính xác.' });

    user.Password = newPassword;
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
});

// Cập nhật Avatar
app.put('/api/avatar/update', upload.single('avatar'), async (req, res) => {
  const userId = req.body.userId;
  const avatarFile = req.file;

  if (!userId || !avatarFile)
    return res.status(400).json({ message: 'Thiếu User ID hoặc file ảnh.' });

  try {
    // Sửa lại đường dẫn cho khớp với logic Register: /images/uploads/...
    const newAvatar = `/images/uploads/${avatarFile.filename}`;

    const updated = await User.findOneAndUpdate(
      { UserID: userId },
      { AvatarURL: newAvatar },
      { new: true, select: 'AvatarURL' }
    );

    if (!updated) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    res.json({ message: 'Cập nhật ảnh đại diện thành công!', newAvatarUrl: updated.AvatarURL });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
});


// --------------------------------------------------------------------------
// CATEGORIES / TOPICS (Chủ đề bài học)
// --------------------------------------------------------------------------

// Lấy danh sách Topics (có lọc và tìm kiếm)
app.get('/api/topics', async (req, res) => {
  try {
    const { types, tags, search } = req.query;
    const queryObject = {};

    if (types) queryObject.type = { $in: types.split(',') };
    if (tags) queryObject.tags = { $in: tags.split(',') };

    const dataFromDB = await Category.find(queryObject);
    let filteredData;

    if (search && search.trim() !== '') {
      const normalizedSearch = removeDiacritics(search.trim());
      const escapedSearch = escapeRegex(normalizedSearch);
      const searchRegex = new RegExp(escapedSearch, 'i');

      filteredData = dataFromDB.filter(topic => {
        const topicName = removeDiacritics(topic.name);
        const topicDesc = removeDiacritics(topic.description || "");
        return searchRegex.test(topicName) || searchRegex.test(topicDesc);
      });
    } else {
      filteredData = dataFromDB;
    }
    res.json(filteredData);
  } catch (error) {
    console.error("Lỗi lấy Topics:", error);
    res.status(500).json({ message: "Lỗi server khi lấy dữ liệu." });
  }
});

// Lấy chi tiết MỘT Category
app.get('/api/category/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "ID danh mục không hợp lệ." });
    }
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy danh mục này." });
    }
    res.json(category);
  } catch (error) {
    console.error("Lỗi lấy chi tiết category:", error);
    res.status(500).json({ message: "Lỗi server." });
  }
});


// --------------------------------------------------------------------------
// QUESTIONS & TESTS (Ngân hàng câu hỏi & Thi)
// --------------------------------------------------------------------------

// Lấy danh sách câu hỏi (phân trang, tìm kiếm)
app.get('/api/questions', async (req, res) => {
  try {
    const { categoryId, page = 1, limit = 10, search, difficulty } = req.query;

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "categoryId không hợp lệ." });
    }

    const dbFilter = { CategoryID: categoryId };
    if (difficulty && difficulty !== 'all') {
      dbFilter.Difficulty = difficulty;
    }

    let resultQuestions = [];
    let totalQuestions = 0;

    if (search && search.trim() !== '') {
      // Tìm kiếm thủ công (do cần xử lý tiếng Việt không dấu)
      const allQuestions = await Question.find(dbFilter)
        .populate('CreatorUserID', 'Username')
        .select('-choices.isCorrect')
        .sort({ CreatedAt: -1 });

      const searchKey = removeDiacritics(search.trim()).toLowerCase();

      const filteredQuestions = allQuestions.filter(q => {
        const textNoAccent = removeDiacritics(q.QuestionText).toLowerCase();
        return textNoAccent.includes(searchKey);
      });

      totalQuestions = filteredQuestions.length;
      const startIndex = (page - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      resultQuestions = filteredQuestions.slice(startIndex, endIndex);
    } else {
      // Query trực tiếp DB
      totalQuestions = await Question.countDocuments(dbFilter);
      resultQuestions = await Question.find(dbFilter)
        .populate('CreatorUserID', 'Username')
        .select('-choices.isCorrect') // Ẩn đáp án đúng
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ CreatedAt: -1 });
    }

    res.json({
      questions: resultQuestions,
      totalPages: Math.ceil(totalQuestions / limit),
      currentPage: parseInt(page),
      totalQuestions
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách câu hỏi:", error);
    res.status(500).json({ message: "Lỗi server." });
  }
});

// Tạo câu hỏi mới (Có hỗ trợ Upload ảnh)
app.post('/api/questions', upload.single('image'), async (req, res) => {
  try {
    const { 
      questionText, 
      questionType, 
      categoryId, 
      difficulty, 
      creatorId, 
      explanation,
      choices // JSON string
    } = req.body;

    if (!questionText || !categoryId || !choices) {
      return res.status(400).json({ message: "Vui lòng nhập đủ thông tin." });
    }

    let imageUrl = null;
    if (req.file) {
      // Chuẩn hóa đường dẫn ảnh
      imageUrl = `/images/uploads/${req.file.filename}`;
    }

    let parsedChoices;
    try {
      parsedChoices = JSON.parse(choices);
    } catch (e) {
      return res.status(400).json({ message: "Dữ liệu đáp án lỗi." });
    }

    if (questionType === 'multiple_choice' && parsedChoices.length < 2) {
      return res.status(400).json({ message: "Cần ít nhất 2 đáp án." });
    }
    
    if (!parsedChoices.some(c => c.isCorrect === true)) {
      return res.status(400).json({ message: "Phải có ít nhất một đáp án đúng." });
    }

    const newQuestion = new Question({
      QuestionText: questionText,
      QuestionType: questionType || 'multiple_choice',
      CategoryID: categoryId,
      Difficulty: difficulty || 'easy',
      CreatorUserID: creatorId,
      Image: imageUrl,
      Status: 'Pending',
      Explanation: explanation,
      choices: parsedChoices
    });

    await newQuestion.save();

    res.status(201).json({ 
      message: "Gửi câu hỏi thành công!",
      question: newQuestion 
    });
  } catch (error) {
    console.error("Lỗi tạo câu hỏi:", error);
    res.status(500).json({ message: "Lỗi server khi lưu câu hỏi." });
  }
});

// Đề tạo thi ngẫu nhiên (Start Test)
app.get('/api/test/generate', async (req, res) => {
  try {
    const { categoryId, limit = 10, difficulty } = req.query;

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "ID chủ đề không hợp lệ." });
    }

    const pipeline = [
      { $match: { CategoryID: new mongoose.Types.ObjectId(categoryId) } }
    ];

    if (difficulty && difficulty !== 'all') {
      pipeline.push({ $match: { Difficulty: difficulty } });
    }

    // Lấy ngẫu nhiên câu hỏi
    pipeline.push({ $sample: { size: parseInt(limit) } });

    const questions = await Question.aggregate(pipeline);

    if (!questions || questions.length === 0) {
      return res.status(404).json({ message: "Không đủ câu hỏi để tạo đề thi." });
    }

    // Ẩn đáp án đúng
    const sanitizedQuestions = questions.map(q => {
      if (q.choices) {
        q.choices = q.choices.map(c => ({
          _id: c._id,
          choiceText: c.choiceText
        }));
      }
      return q;
    });

    res.json({
      title: "Bài thi trắc nghiệm",
      questions: sanitizedQuestions,
      totalQuestions: sanitizedQuestions.length
    });
  } catch (error) {
    console.error("Lỗi sinh đề thi:", error);
    res.status(500).json({ message: "Lỗi server khi tạo đề thi." });
  }
});

// Nộp bài & Chấm điểm (Submit Test)
app.post('/api/test/submit-dynamic', async (req, res) => {
  try {
    const { userAnswers } = req.body; 
    // Format: [{ questionId: "...", selectedChoiceId: "..." }, ...]

    if (!userAnswers || !Array.isArray(userAnswers)) {
      return res.status(400).json({ message: "Dữ liệu bài làm không hợp lệ." });
    }

    let correctCount = 0;
    let details = [];
    
    // Lấy thông tin các câu hỏi từ DB
    const questionIds = userAnswers.map(ans => ans.questionId);
    const originalQuestions = await Question.find({ _id: { $in: questionIds } });

    userAnswers.forEach(ans => {
      const questionId = ans.questionId;
      const userChoiceId = ans.selectedChoiceId;

      const originalQ = originalQuestions.find(q => q._id.toString() === questionId);

      if (originalQ) {
        const correctChoice = originalQ.choices.find(c => c.isCorrect === true);
        const correctChoiceId = correctChoice ? correctChoice._id.toString() : null;

        let isCorrect = false;
        if (correctChoiceId && String(userChoiceId) === correctChoiceId) {
          isCorrect = true;
          correctCount++;
        }

        details.push({
          questionId: questionId,
          isCorrect: isCorrect,
          correctChoiceId: correctChoiceId,
          userChoiceId: userChoiceId
        });
      }
    });

    const totalQuestions = userAnswers.length;
    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 10 : 0;

    res.json({
      message: "Chấm điểm thành công!",
      score: score.toFixed(1),
      correctCount,
      totalQuestions,
      details
    });
  } catch (error) {
    console.error("Lỗi chấm bài:", error);
    res.status(500).json({ message: "Lỗi server khi chấm bài." });
  }
});

// Kiểm tra nhanh 1 câu (Practice Mode)
app.post('/api/check-single-answer', async (req, res) => {
  try {
    const { questionId, selectedChoiceId } = req.body;

    if (!questionId || !selectedChoiceId) {
      return res.status(400).json({ message: "Thiếu dữ liệu." });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Không tìm thấy câu hỏi." });
    }

    const correctChoice = question.choices.find(c => c.isCorrect === true);
    const isCorrect = (correctChoice && correctChoice._id.toString() === selectedChoiceId);

    res.json({
      isCorrect: isCorrect,
      correctChoiceId: correctChoice ? correctChoice._id : null,
      explanation: question.Explanation || "Chưa có giải thích cho câu này."
    });
  } catch (error) {
    console.error("Lỗi check câu hỏi:", error);
    res.status(500).json({ message: "Lỗi server." });
  }
});

// --------------------------------------------------------------------------

// Route trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'MainPage.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});