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
}, { collection: 'categories' });

const Category = mongoose.model('Category', categorySchema);

// 3. Question Model (Ngân hàng câu hỏi)
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
  
  // Mảng lựa chọn đáp án
  choices: [{
    choiceText: { type: String, required: true },
    isCorrect: { type: Boolean, required: true }
  }]
}, { collection: 'Questions' }); 

const Question = mongoose.model('Question', questionSchema);


// --- CẤU HÌNH MULTER (UPLOAD FILE) ---
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


// --- SUPPORT FUNCTIONS ---

// Hàm xóa dấu tiếng Việt
function removeDiacritics(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
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

    if (types) {
      queryObject.type = { $in: types.split(',') };
    }
    if (tags) {
      queryObject.tags = { $in: tags.split(',') };
    }

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

// 3. API: Đăng ký User
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
    console.log(`Đã đăng ký user: ${username}`);
    const userResponse = savedUser.toObject();
    delete userResponse.Password;

    res.status(201).json({ message: 'Đăng ký thành công!', user: userResponse });
  } catch (error) {
    console.error("Lỗi khi đăng ký:", error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
});

// 4. API: Đăng nhập
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

// 5. API: Lấy danh sách câu hỏi (Browser)
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

            totalQuestions = await Question.countDocuments(dbFilter);
            
            resultQuestions = await Question.find(dbFilter)
                .populate('CreatorUserID', 'Username')
                .select('-choices.isCorrect')
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

// 6. API: SINH ĐỀ THI NGẪU NHIÊN (Generate Test)
// Dùng cho nút "Bắt đầu làm bài"
app.get('/api/test/generate', async (req, res) => {
    try {
        const { categoryId, limit = 10, difficulty } = req.query;

        if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ message: "ID chủ đề không hợp lệ." });
        }

        // Tạo pipeline cho Aggregation để lấy ngẫu nhiên ($sample)
        const pipeline = [
            { $match: { CategoryID: new mongoose.Types.ObjectId(categoryId) } }
        ];

        // Nếu có chọn độ khó cụ thể (không phải 'all')
        if (difficulty && difficulty !== 'all') {
            pipeline.push({ $match: { Difficulty: difficulty } });
        }

        // Lấy ngẫu nhiên số lượng câu hỏi yêu cầu
        pipeline.push({ $sample: { size: parseInt(limit) } });

        const questions = await Question.aggregate(pipeline);

        if (!questions || questions.length === 0) {
            return res.status(404).json({ message: "Không đủ câu hỏi để tạo đề thi." });
        }

        // Ẩn đáp án đúng trước khi trả về Client
        const sanitizedQuestions = questions.map(q => {
            if (q.choices) {
                q.choices = q.choices.map(c => ({
                    _id: c._id,
                    choiceText: c.choiceText
                    // Không copy isCorrect
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

// 7. API: NỘP BÀI & CHẤM ĐIỂM (Dynamic Test Submit)
app.post('/api/test/submit-dynamic', async (req, res) => {
    try {
        const { userAnswers } = req.body; 
        // userAnswers = [{ questionId: "...", selectedChoiceId: "..." }, ...]

        if (!userAnswers || !Array.isArray(userAnswers)) {
            return res.status(400).json({ message: "Dữ liệu bài làm không hợp lệ." });
        }

        let correctCount = 0;
        let details = [];

        // Lấy danh sách ID các câu hỏi user đã làm
        const questionIds = userAnswers.map(ans => ans.questionId);

        // Query DB để lấy thông tin gốc (bao gồm đáp án đúng) của các câu hỏi đó
        const originalQuestions = await Question.find({ _id: { $in: questionIds } });

        // Duyệt qua bài làm của user để chấm
        userAnswers.forEach(ans => {
            const questionId = ans.questionId;
            const userChoiceId = ans.selectedChoiceId;

            // Tìm câu hỏi gốc tương ứng
            const originalQ = originalQuestions.find(q => q._id.toString() === questionId);

            if (originalQ) {
                // Tìm đáp án đúng trong DB
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
            details // Trả về chi tiết để hiển thị đáp án đúng/sai
        });

    } catch (error) {
        console.error("Lỗi chấm bài:", error);
        res.status(500).json({ message: "Lỗi server khi chấm bài." });
    }
});

// 8. API: KIỂM TRA NHANH 1 CÂU (Practice Mode)
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

        // Tìm đáp án đúng
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


// --- ROUTES GIAO DIỆN ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'MainPage.html'));
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});