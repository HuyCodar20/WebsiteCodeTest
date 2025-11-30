/* ==========================================================================
   1. SERVER CONFIGURATION & IMPORTS
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
   2. DATABASE CONNECTION
   ========================================================================== */
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Kết nối MongoDB Atlas thành công!"))
  .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

/* ==========================================================================
   3. MODELS & SCHEMAS (Định nghĩa dữ liệu)
   ========================================================================== */

// --- Model: User (Người dùng) ---
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

// --- Model: Category (Chủ đề) ---
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  icon: String,
  type: String,
  tags: [String],
  banner_image_url: String,
  long_description: String,
  theme_color: String
}, { collection: 'categories' });

const Category = mongoose.model('Category', categorySchema);

// --- Model: Question (Ngân hàng câu hỏi) ---
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
  Status: { type: String, default: 'Approved' }, // Approved, Pending, Deleted
  CreatedAt: { type: Date, default: Date.now },
  ReportCount: { type: Number, default: 0 },
  choices: [{
    choiceText: { type: String, required: true },
    isCorrect: { type: Boolean, required: true }
  }],
  ReportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { collection: 'Questions' }); 

const Question = mongoose.model('Question', questionSchema);

// --- Model: TestResults (Kết quả bài thi đã làm) ---
const TestResultsSchema = new mongoose.Schema({
    UserID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    Category: { 
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
        name: String
    },
    Mode: { type: String, enum: ['classic', 'paced'], default: 'classic' },
    TotalQuestions: { type: Number, required: true },
    CorrectCount: { type: Number, required: true },
    Score: { type: Number, required: true }, // Điểm (0-10)
    TimeTaken: { type: Number }, // Thời gian làm bài (giây)
    CompletedAt: { type: Date, default: Date.now },
    // Chi tiết đáp án
    details: [{
        questionId: mongoose.Schema.Types.ObjectId,
        userChoiceId: String,
        correctChoiceId: String,
        isCorrect: Boolean,
    }]
}, { collection: 'TestResults' });

const TestResult = mongoose.model('TestResult', TestResultsSchema);

/* ==========================================================================
   4. UTILITIES (Hàm hỗ trợ & Cấu hình upload)
   ========================================================================== */

// Cấu hình Multer để upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
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
   5. MIDDLEWARE
   ========================================================================== */
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ==========================================================================
   6. API ROUTES
   ========================================================================== */

/* --------------------------------------------------------------------------
   GROUP 1: AUTHENTICATION & USER (Đăng ký, Đăng nhập, Profile)
   -------------------------------------------------------------------------- */

// [POST] Đăng ký tài khoản
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

    // Tạo UserID tự tăng
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
    
    const userResponse = savedUser.toObject();
    delete userResponse.Password;

    res.status(201).json({ message: 'Đăng ký thành công!', user: userResponse });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
});

// [POST] Đăng nhập
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập Username/Email và Password.' });
  }

  try {
    const user = await User.findOne({
      $or: [
        { Username: username },
        { Email: username }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại!' });
    }

    if (user.Password !== password) {
      return res.status(401).json({ message: 'Sai mật khẩu!' });
    }

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

// [GET] Lấy thông tin Profile
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

// [PUT] Cập nhật Username
app.put('/api/profile/update', async (req, res) => {
  const { userId, username } = req.body;
  if (!userId || !username) return res.status(400).json({ message: 'Thiếu User ID hoặc Username mới.' });

  try {
    const existing = await User.findOne({ Username: username, UserID: { $ne: userId } });
    if (existing) return res.status(409).json({ message: 'Username này đã có người sử dụng.' });

    const updated = await User.findOneAndUpdate(
      { UserID: userId },
      { Username: username },
      { new: true, select: '-Password' }
    );

    if (!updated) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    res.json({ message: 'Cập nhật tên người dùng thành công!', user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
});

// [PUT] Đổi mật khẩu
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

// [PUT] Cập nhật Avatar
app.put('/api/avatar/update', upload.single('avatar'), async (req, res) => {
  const userId = req.body.userId;
  const avatarFile = req.file;           // File upload (nếu có)
  const avatarUrlStr = req.body.avatarUrl; // URL avatar hệ thống (nếu có)

  // Kiểm tra: Phải có UserId VÀ (có File upload HOẶC có URL ảnh)
  if (!userId || (!avatarFile && !avatarUrlStr)) {
      return res.status(400).json({ message: 'Thiếu User ID hoặc dữ liệu ảnh.' });
  }

  try {
    // Ưu tiên lấy file upload, nếu không thì lấy đường dẫn string
    let newAvatarPath = '';
    
    if (avatarFile) {
        newAvatarPath = `/images/uploads/${avatarFile.filename}`;
    } else {
        newAvatarPath = avatarUrlStr;
    }

    const updated = await User.findOneAndUpdate(
      { UserID: userId },
      { AvatarURL: newAvatarPath },
      { new: true, select: 'AvatarURL' }
    );

    if (!updated) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    
    res.json({ message: 'Cập nhật ảnh đại diện thành công!', newAvatarUrl: updated.AvatarURL });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
});

/* --------------------------------------------------------------------------
   GROUP 2: CATEGORIES / TOPICS (Chủ đề bài học)
   -------------------------------------------------------------------------- */

// [GET] Lấy danh sách Topics (có lọc và tìm kiếm)
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

// [GET] Lấy chi tiết MỘT Category
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

/* --------------------------------------------------------------------------
   GROUP 3: QUESTIONS (Ngân hàng câu hỏi: CRUD)
   -------------------------------------------------------------------------- */

// [GET] Lấy danh sách câu hỏi (ĐÃ FIX: Cho phép không có categoryId)
app.get('/api/questions', async (req, res) => {
  try {
    const { categoryId, page = 1, limit = 10, search, difficulty, excludeDeleted, hasReport } = req.query;

    const dbFilter = {}; // Mặc định là lọc rỗng (lấy tất cả)

    // FIX QUAN TRỌNG: Chỉ lọc theo Category nếu có truyền ID hợp lệ
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      dbFilter.CategoryID = categoryId;
    }

    // Lọc theo độ khó
    if (difficulty && difficulty !== 'all') {
      dbFilter.Difficulty = difficulty;
    }

    if (hasReport === 'true') {
        dbFilter.ReportCount = { $gt: 0 };
    }

    // Admin muốn xem cả câu đã xóa hay không?
    if (excludeDeleted === 'true') {
        dbFilter.Status = { $ne: 'Deleted' };
    }

    let resultQuestions = [];
    let totalQuestions = 0;

    if (search && search.trim() !== '') {
      // --- LOGIC TÌM KIẾM (Search) ---
      const allQuestions = await Question.find(dbFilter)
        .populate('CreatorUserID', 'Username')
        .populate('CategoryID', 'name') // Populate tên chủ đề
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
      // --- LOGIC BÌNH THƯỜNG (Phân trang) ---
      totalQuestions = await Question.countDocuments(dbFilter);
      resultQuestions = await Question.find(dbFilter)
        .populate('CreatorUserID', 'Username')
        .populate('CategoryID', 'name') // Populate tên chủ đề
        .select('-choices.isCorrect')
        .skip((page - 1) * parseInt(limit))
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

// [POST] Tạo câu hỏi mới
app.post('/api/questions', upload.single('image'), async (req, res) => {
  try {
    const { 
      questionText, questionType, categoryId, difficulty, creatorId, explanation, choices 
    } = req.body;

    if (!questionText || !categoryId || !choices) {
      return res.status(400).json({ message: "Vui lòng nhập đủ thông tin." });
    }

    let imageUrl = null;
    if (req.file) {
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

    res.status(201).json({ message: "Gửi câu hỏi thành công!", question: newQuestion });
  } catch (error) {
    console.error("Lỗi tạo câu hỏi:", error);
    res.status(500).json({ message: "Lỗi server khi lưu câu hỏi." });
  }
});

app.put('/api/questions/:id/reset-report', async (req, res) => {
  try {
    const questionId = req.params.id;
    const updated = await Question.findByIdAndUpdate(
        questionId, 
        { 
            ReportCount: 0, 
            ReportedBy: [] 
        }, 
        { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Không tìm thấy câu hỏi." });

    res.json({ message: "Đã reset báo cáo về 0.", question: updated });
  } catch (error) {
    console.error("Lỗi reset report:", error);
    res.status(500).json({ message: "Lỗi server." });
  }
});

// [PUT] Cập nhật câu hỏi
app.put('/api/questions/:id', upload.single('image'), async (req, res) => {
  try {
    const questionId = req.params.id;
    const { questionText, difficulty, explanation, choices, categoryId } = req.body;

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: "Không tìm thấy câu hỏi." });

    if (questionText) question.QuestionText = questionText;
    if (difficulty) question.Difficulty = difficulty;
    if (explanation) question.Explanation = explanation;
    if (categoryId) question.CategoryID = categoryId;

    if (req.file) {
      question.Image = `/images/uploads/${req.file.filename}`;
    }

    if (choices) {
        try {
            const parsedChoices = JSON.parse(choices);
            if (parsedChoices.length < 2) return res.status(400).json({ message: "Cần ít nhất 2 đáp án." });
            question.choices = parsedChoices;
        } catch (e) {
            return res.status(400).json({ message: "Dữ liệu đáp án lỗi." });
        }
    }

    await question.save();
    res.json({ message: "Cập nhật câu hỏi thành công!", question });
  } catch (error) {
    console.error("Lỗi update:", error);
    res.status(500).json({ message: "Lỗi server." });
  }
});

// [PATCH] Khôi phục câu hỏi
app.patch('/api/questions/:id/restore', async (req, res) => {
  try {
    const questionId = req.params.id;
    const updated = await Question.findByIdAndUpdate(
        questionId, 
        { Status: 'Approved' }, 
        { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Không tìm thấy câu hỏi." });
    res.json({ message: "Đã khôi phục câu hỏi thành công." });
  } catch (error) {
    console.error("Lỗi khôi phục:", error);
    res.status(500).json({ message: "Lỗi server." });
  }
});


// API: Lấy chi tiết MỘT câu hỏi (Để điền vào form Sửa)
app.get('/api/questions/:id', async (req, res) => {
  try {
    const questionId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
        return res.status(400).json({ message: "ID không hợp lệ." });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Không tìm thấy câu hỏi." });
    }
    res.json(question);
  } catch (error) {
    console.error("Lỗi lấy chi tiết câu hỏi:", error);
    res.status(500).json({ message: "Lỗi server." });
  }
});

// API: Xóa mềm (Soft Delete) - Chuyển Status thành 'Deleted'
// [DELETE] Xóa câu hỏi (Hỗ trợ cả Soft Delete và Hard Delete)
app.delete('/api/questions/:id', async (req, res) => {
  try {
    const questionId = req.params.id;
    const { type } = req.query; // Lấy tham số type từ URL (VD: ?type=permanent)
    
    // TRƯỜNG HỢP 1: XÓA VĨNH VIỄN (Hard Delete) - Dành cho Admin
    if (type === 'permanent') {
        const deleted = await Question.findByIdAndDelete(questionId);

        if (!deleted) {
            return res.status(404).json({ message: "Không tìm thấy câu hỏi để xóa." });
        }
        return res.json({ message: "Đã xóa VĨNH VIỄN câu hỏi khỏi hệ thống." });
    }

    // TRƯỜNG HỢP 2: XÓA MỀM (Soft Delete) - Mặc định
    const updated = await Question.findByIdAndUpdate(
        questionId, 
        { Status: 'Deleted' }, 
        { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Không tìm thấy câu hỏi." });

    res.json({ message: "Đã xóa câu hỏi (Soft Delete - Đã ẩn)." });

  } catch (error) {
    console.error("Lỗi xóa câu hỏi:", error);
    res.status(500).json({ message: "Lỗi server." });
  }
});

app.post('/api/questions/report', async (req, res) => {
  try {
    const { questionId, userId } = req.body;

    if (!questionId || !userId) {
      return res.status(400).json({ message: "Thiếu thông tin." });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Không tìm thấy câu hỏi." });
    }

    // Kiểm tra xem user này đã report chưa
    if (question.ReportedBy.includes(userId)) {
      return res.status(400).json({ message: "Bạn đã báo cáo câu hỏi này rồi!" });
    }

    // Nếu chưa, thêm UserID vào mảng và tăng ReportCount
    question.ReportedBy.push(userId);
    question.ReportCount = (question.ReportCount || 0) + 1;
    
    await question.save();

    res.json({ message: "Cảm ơn bạn đã báo cáo. Admin sẽ xem xét!", newCount: question.ReportCount });

  } catch (error) {
    console.error("Lỗi report:", error);
    res.status(500).json({ message: "Lỗi server." });
  }
});


/* --------------------------------------------------------------------------
   GROUP 4: TESTS (Tạo đề thi & Chấm điểm)
   -------------------------------------------------------------------------- */

app.get('/api/test/generate', async (req, res) => {
  try {
    const { categoryId, limit = 10, difficulty } = req.query;

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: 'ID chủ đề lỗi.' });
    }

    // [MỚI] Lấy tên Category cho tiêu đề bài thi
    let categoryName = "Bài thi trắc nghiệm";
    const category = await Category.findById(categoryId).select('name');
    if(category) categoryName = category.name;

    const pipeline = [
      { 
        $match: { 
          CategoryID: new mongoose.Types.ObjectId(categoryId),
          Status: { $ne: 'Deleted' } 
        } 
      }
    ];

    if (difficulty && difficulty !== 'all') {
      pipeline.push({ $match: { Difficulty: difficulty } });
    }

    pipeline.push({ $sample: { size: parseInt(limit) } });
    const questions = await Question.aggregate(pipeline);

    if (!questions || questions.length === 0) {
      return res.status(404).json({ message: 'Không đủ câu hỏi để tạo đề thi.' });
    }

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
      title: categoryName, // [MỚI] Trả về tên Category
      questions: sanitizedQuestions,
      totalQuestions: sanitizedQuestions.length
    });
  } catch (error) {
    console.error('Lỗi sinh đề thi:', error);
    res.status(500).json({ message: 'Lỗi server khi tạo đề thi.' });
  }
});

// [POST] Nộp bài & Chấm điểm
app.post('/api/test/submit-dynamic', async (req, res) => {
    try {
       // [MỚI] Nhận thêm userId, categoryId, mode, timeTaken
       const { userAnswers, userId, categoryId, mode, timeTaken } = req.body; 

       if (!userAnswers || !Array.isArray(userAnswers) || !userId || !categoryId) {
           return res.status(400).json({ message: 'Dữ liệu bài làm không hợp lệ hoặc thiếu thông tin user/category.' });
       }
       
       if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ message: 'ID người dùng hoặc Chủ đề không hợp lệ.' });
       }

       let correctCount = 0;
       let details = [];
       
       const questionIds = userAnswers.map(ans => ans.questionId);
       const originalQuestions = await Question.find({ _id: { $in: questionIds } });
       const categoryInfo = await Category.findById(categoryId).select('name');

       userAnswers.forEach(ans => {
           const questionId = ans.questionId;
           const userChoiceId = ans.selectedChoiceId;
           const originalQ = originalQuestions.find(q => q._id.toString() === questionId);

           if (originalQ) {
               const correctChoice = originalQ.choices.find(c => c.isCorrect === true);
               const correctChoiceId = correctChoice ? correctChoice._id.toString() : null;

               let isCorrect = false;
               if (userChoiceId && correctChoiceId && String(userChoiceId) === correctChoiceId) {
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

       // LƯU KẾT QUẢ VÀO DB (TestResult)
       const newReview = new TestResult({
           UserID: userId,
           Category: {
               id: categoryId,
               name: categoryInfo ? categoryInfo.name : 'Chủ đề không xác định'
           },
           Mode: mode || 'classic',
           TotalQuestions: totalQuestions,
           CorrectCount: correctCount,
           Score: parseFloat(score.toFixed(1)),
           TimeTaken: timeTaken, 
           details: details
       });
       await newReview.save();
       
       res.json({
           message: 'Chấm điểm và lưu review thành công!',
           score: score.toFixed(1),
           correctCount,
           totalQuestions,
           reviewId: newReview._id,
           details: details
       });
    } catch (error) {
      console.error('Lỗi chấm bài và lưu review:', error);
      res.status(500).json({ message: 'Lỗi server khi chấm bài.' });
    }
});

// [POST] Kiểm tra nhanh 1 câu (Practice Mode)
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


/* ==========================================================================
   BỔ SUNG VÀO GROUP 2: CATEGORIES (CRUD CHO ADMIN - ĐÃ KIỂM TRA)
   ========================================================================== */

// [POST] Tạo Topic mới
app.post('/api/topics', async (req, res) => {
    try {
        const { name, description, icon, type, tags, banner_image_url, long_description, theme_color } = req.body;

        // Xử lý tags: Chuyển chuỗi "tag1, tag2" thành mảng ["tag1", "tag2"]
        let tagsArray = [];
        if (typeof tags === 'string') {
            tagsArray = tags.split(',').map(t => t.trim()).filter(t => t !== "");
        } else if (Array.isArray(tags)) {
            tagsArray = tags;
        }

        const newTopic = new Category({
            name, description, icon, type,
            tags: tagsArray,
            banner_image_url, long_description, theme_color
        });

        await newTopic.save();
        res.status(201).json({ message: "Tạo chủ đề thành công!", topic: newTopic });
    } catch (error) {
        console.error("Lỗi tạo topic:", error);
        res.status(500).json({ message: "Lỗi server: " + error.message });
    }
});

// [PUT] Cập nhật Topic
app.put('/api/topics/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, icon, type, tags, banner_image_url, long_description, theme_color } = req.body;

        let tagsArray = [];
        if (typeof tags === 'string') {
            tagsArray = tags.split(',').map(t => t.trim()).filter(t => t !== "");
        } else if (Array.isArray(tags)) {
            tagsArray = tags;
        }

        const updatedTopic = await Category.findByIdAndUpdate(id, {
            name, description, icon, type, 
            tags: tagsArray, 
            banner_image_url, long_description, theme_color
        }, { new: true });

        if (!updatedTopic) return res.status(404).json({ message: "Không tìm thấy chủ đề." });

        res.json({ message: "Cập nhật thành công!", topic: updatedTopic });
    } catch (error) {
        console.error("Lỗi update topic:", error);
        res.status(500).json({ message: "Lỗi server." });
    }
});

// [DELETE] Xóa Topic (Lưu ý: Chỉ xóa được nếu không có câu hỏi)
app.delete('/api/topics/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra xem Topic này có đang chứa câu hỏi nào không
        // Lưu ý: Cần đảm bảo CategoryID trong Question là ObjectId
        const countQuestions = await Question.countDocuments({ CategoryID: id, Status: { $ne: 'Deleted' } });
        
        if (countQuestions > 0) {
            return res.status(400).json({ message: `Không thể xóa! Chủ đề này đang chứa ${countQuestions} câu hỏi.` });
        }

        const deleted = await Category.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: "Chủ đề không tồn tại." });

        res.json({ message: "Đã xóa chủ đề thành công." });
    } catch (error) {
        console.error("Lỗi xóa topic:", error);
        res.status(500).json({ message: "Lỗi server." });
    }
});

// [GET] Lấy danh sách lịch sử bài làm (Test Reviews) theo UserID (Dạng ObjectId)
app.get('/api/profile/:userId/reviews', async (req, res) => {
    try {
        const userId = req.params.userId; 
        
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "ID người dùng không hợp lệ." });
        }

        const reviews = await TestResult.find({ UserID: userId })
            .select('_id Category Mode TotalQuestions CorrectCount Score TimeTaken CompletedAt') 
            .sort({ CompletedAt: -1 }) 
            .limit(50); 

        res.json({ reviews });
    } catch (err) {
        console.error("Lỗi lấy lịch sử bài làm:", err);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
});

/* --------------------------------------------------------------------------
   GROUP 5: REVIEW (Chi tiết bài làm)
   -------------------------------------------------------------------------- */
// [GET] Lấy chi tiết một bài Review theo ID
app.get('/api/reviews/:reviewId', async (req, res) => {
    try {
        const reviewId = req.params.reviewId;
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({ message: 'ID Review không hợp lệ.' });
        }

        const review = await TestResult.findById(reviewId).lean();
        if (!review) {
            return res.status(404).json({ message: 'Không tìm thấy bài làm chi tiết này.' });
        }

        const questionIds = review.details.map(d => d.questionId);
        const questions = await Question.find({ _id: { $in: questionIds } }).lean();

        const combinedDetails = review.details.map(detail => {
            const question = questions.find(q => q._id.toString() === detail.questionId.toString());
            
            if (question) {
                return {
                    ...detail,
                    QuestionText: question.QuestionText,
                    Image: question.Image,
                    Explanation: question.Explanation,
                    Difficulty: question.Difficulty,
                    QuestionType: question.QuestionType,
                    AllChoices: question.choices 
                };
            }
            return detail;
        });

        res.json({ ...review, details: combinedDetails });

    } catch (error) {
        console.error("Lỗi lấy chi tiết Review:", error);
        res.status(500).json({ message: 'Lỗi server khi lấy chi tiết Review.' });
    }
});

/* ==========================================================================
   7. MAIN ROUTES & START SERVER
   ========================================================================== */

   // Route cho trang doTest
app.get('/doTest', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'doTest.html'));
});

// Route cho trang Chi tiết Review
app.get('/test-review', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'testResults.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'profile.html')); 
});

// Route trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'MainPage.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});