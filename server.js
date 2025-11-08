const express = require("express");
const path = require("path");
const mongoose = require("mongoose"); 

const app = express();
const PORT = 3000;

app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));

// Kết nối MongoDB Atlas
const uri = "mongodb+srv://Admin01:Website123456@cluster0.ipbas5n.mongodb.net/DB_SWTesting?retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(() => console.log("✅ Kết nối MongoDB Atlas thành công!"))
  .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));



// API: Lấy dữ liệu topics từ MongoDB

// Hàm xóa dấu
function removeDiacritics(str) {
  if (!str) return ""; 
  return str
    .toLowerCase()
    .normalize("NFD") // Tách dấu và chữ
    .replace(/[\u00c0-\u036f]/g, "") // Xóa các ký tự dấu 
    .replace(/đ/g, "d"); // Chuyển 'đ' thành 'd'
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
}

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

    const Topic = mongoose.connection.collection('categories');
    const dataFromDB = await Topic.find(queryObject).toArray();

    let filteredData;

    if (search && search.trim() !== '') {

      const normalizedSearch = removeDiacritics(search.trim());

      const escapedSearch = escapeRegex(normalizedSearch);
      const searchRegex = new RegExp('\\b' + escapedSearch, 'i');

      filteredData = dataFromDB.filter(topic => {

        const topicName = removeDiacritics(topic.name);
        const topicDesc = removeDiacritics(topic.description);

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

// --- Lấy chi tiết MỘT Category theo ID ---
app.get('/api/category/:id', async (req, res) => {
    try {
        const categoryId = req.params.id; // Lấy ID từ URL

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ message: "ID danh mục không hợp lệ." });
        }

        // Kết nối tới collection 'categories'
        const CategoryCollection = mongoose.connection.collection('categories');
        const category = await CategoryCollection.findOne({ 
            _id: new mongoose.Types.ObjectId(categoryId) 
        });

        if (!category) {
            return res.status(404).json({ message: "Không tìm thấy danh mục này." });
        }

        // Trả về dữ liệu tìm được
        res.json(category);

    } catch (error) {
        console.error("Lỗi khi lấy chi tiết category:", error);
        res.status(500).json({ message: "Lỗi server khi lấy thông tin danh mục." });
    }
});

app.get('/api/tests', async (req, res) => {
    try {
        const { categoryId } = req.query; 

        if (!categoryId) {
             return res.status(400).json({ message: "Thiếu categoryId." });
        }

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ message: "categoryId không hợp lệ." });
        }
        
        const TestsCollection = mongoose.connection.collection('Tests'); 
        const tests = await TestsCollection.find({ 
            categoryId: new mongoose.Types.ObjectId(categoryId) 
        }).toArray();

        res.json(tests);

    } catch (error) {
        console.error("Lỗi khi lấy danh sách bài test:", error);
        res.status(500).json({ message: "Lỗi server khi lấy danh sách bài test." });
    }
});

//Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'topic.html'));
});

//Khởi động server
app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});