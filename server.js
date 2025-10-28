const express = require("express");
const path = require("path");
const mongoose = require("mongoose"); 

const app = express();
const PORT = 3000;

app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));

// Kết nối MongoDB Atlas
const uri = "mongodb+srv://DB_SWTesting:Huy123456@cluster0.ipbas5n.mongodb.net/DB_SWTesting?retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(() => console.log("✅ Kết nối MongoDB Atlas thành công!"))
  .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));



// API: Lấy dữ liệu topics từ MongoDB
function removeDiacritics(str) {
  if (!str) return ""; 
  return str
    .toLowerCase()
    .normalize("NFD") // Tách dấu và chữ
    .replace(/[\u0300-\u036f]/g, "") // Xóa các ký tự dấu
    .replace(/đ/g, "d"); // Chuyển 'đ' thành 'd'
}

app.get('/api/topics', async (req, res) => {
  try {
    const { types, tags, search } = req.query;

    // 1. Xây dựng queryObject CHỈ cho MongoDB (những gì nó làm được)
    const queryObject = {};

    if (types) {
      queryObject.type = { $in: types.split(',') };
    }

    if (tags) {
      queryObject.tags = { $in: tags.split(',') };
    }

    // 2. Lấy collection và LỌC SƠ BỘ bằng (types, tags)
    const Topic = mongoose.connection.collection('categories');
    
    // Lấy dữ liệu ĐÃ LỌC BỚT về server
    const dataFromDB = await Topic.find(queryObject).toArray();

    // 3. LỌC BẰNG JAVASCRIPT 
    let filteredData;

    if (search && search.trim() !== '') {
      // Chuẩn bị chuỗi search không dấu 1 lần
      const normalizedSearch = removeDiacritics(search.trim());

      filteredData = dataFromDB.filter(topic => {
        // Chuẩn bị name và description không dấu từ DB
        const topicName = removeDiacritics(topic.name);
        const topicDesc = removeDiacritics(topic.description);

        // Kiểm tra xem name HOẶC description có chứa chuỗi search không
        return topicName.includes(normalizedSearch) || topicDesc.includes(normalizedSearch);
      });

    } else {
      filteredData = dataFromDB;
    }

    // 4. Trả về kết quả cuối cùng
    res.json(filteredData);

  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
    res.status(500).json({ message: "Lỗi server khi lấy dữ liệu." });
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

