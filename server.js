const express = require("express");
const path = require("path");
const mongoose = require("mongoose"); 

const app = express();
const PORT = 3000;

app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = 'mongodb://localhost:27017/DB_SWTesting';

//Kết nối đến MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Đã kết nối MongoDB thành công!'))
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// API: Lấy dữ liệu topics từ MongoDB
app.get('/api/topics', async (req, res) => {
  try {
    const { types, tags } = req.query; 
    const queryObject = {};

    if (types) {
      queryObject.type = { $in: types.split(',') };
    }

    if (tags) {
      queryObject.tags = { $in: tags.split(',') };
    }
    const Topic = mongoose.connection.collection('categories'); 
    const data = await Topic.find(queryObject).toArray(); 
    res.json(data);

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
