// public/javascript/createQuestion.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. KIỂM TRA ĐĂNG NHẬP ---
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) {
        alert("Bạn cần đăng nhập để thực hiện chức năng này!");
        window.location.href = '/pages/login.html';
        return;
    }
    const currentUser = JSON.parse(userJson);

    // --- DOM ELEMENTS ---
    const step1Section = document.getElementById('step-1-select-topic');
    const step2Section = document.getElementById('step-2-form');
    const topicsGrid = document.getElementById('topics-grid');
    const loadingDiv = document.getElementById('loading-topics');
    
    // Form Elements
    const questionForm = document.getElementById('question-form');
    const answersContainer = document.getElementById('answers-container');
    const categoryIdInput = document.getElementById('category-id');
    const topicTitleDisplay = document.getElementById('selected-topic-title');
    const btnBack = document.getElementById('btn-back-topic');
    const radioTypeInputs = document.querySelectorAll('input[name="questionType"]');
    
    // Image Elements
    const imageInput = document.getElementById('question-image');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const btnRemoveImage = document.getElementById('btn-remove-image');

    // --- 2. LOAD DANH SÁCH CHỦ ĐỀ ---
    async function loadTopics() {
        try {
            const res = await fetch('/api/topics');
            const topics = await res.json();
            
            loadingDiv.style.display = 'none';
            topicsGrid.innerHTML = ''; // Clear cũ

            topics.forEach(topic => {
                const card = document.createElement('div');
                card.className = 'topic-card-select';
                card.innerHTML = `
                    <i class="${topic.icon || 'fas fa-book'}"></i>
                    <h3>${topic.name}</h3>
                `;
                // Sự kiện click vào topic
                card.addEventListener('click', () => {
                    selectTopic(topic);
                });
                topicsGrid.appendChild(card);
            });
        } catch (err) {
            console.error(err);
            loadingDiv.textContent = "Lỗi tải danh sách chủ đề.";
        }
    }

    // --- 3. XỬ LÝ CHUYỂN BƯỚC ---
    function selectTopic(topic) {
        // Lưu ID topic vào hidden input
        categoryIdInput.value = topic._id;
        topicTitleDisplay.textContent = `Chủ đề: ${topic.name}`;
        
        // Ẩn bước 1, hiện bước 2
        step1Section.classList.add('hidden');
        step2Section.classList.remove('hidden');

        // Mặc định render trắc nghiệm 4 đáp án
        renderAnswerInputs('multiple_choice');
    }

    btnBack.addEventListener('click', () => {
        step1Section.classList.remove('hidden');
        step2Section.classList.add('hidden');
        questionForm.reset();
        removeImage();
    });

    // --- 4. XỬ LÝ LOẠI CÂU HỎI & ĐÁP ÁN ---
    radioTypeInputs.forEach(radio => {
        radio.addEventListener('change', (e) => {
            renderAnswerInputs(e.target.value);
        });
    });

    function renderAnswerInputs(type) {
        answersContainer.innerHTML = '';
        
        if (type === 'multiple_choice') {
            // Render 4 ô input text
            for (let i = 0; i < 4; i++) {
                const row = document.createElement('div');
                row.className = 'answer-row';
                row.innerHTML = `
                    <input type="radio" name="correctChoice" value="${i}" class="answer-radio" required>
                    <input type="text" name="choiceText" placeholder="Đáp án ${String.fromCharCode(65 + i)}" required>
                `;
                answersContainer.appendChild(row);
            }
        } else if (type === 'true_false') {
            // Render 2 ô fixed (Đúng / Sai)
            const options = ["Đúng", "Sai"];
            options.forEach((opt, index) => {
                const row = document.createElement('div');
                row.className = 'answer-row';
                row.innerHTML = `
                    <input type="radio" name="correctChoice" value="${index}" class="answer-radio" required>
                    <input type="text" name="choiceText" value="${opt}" readonly style="background-color: #eee;">
                `;
                answersContainer.appendChild(row);
            });
        }
        
        // Highlight row khi chọn radio
        const radios = answersContainer.querySelectorAll('input[type="radio"]');
        radios.forEach(r => {
            r.addEventListener('change', () => {
                answersContainer.querySelectorAll('.answer-row').forEach(row => row.classList.remove('correct'));
                if (r.checked) r.parentElement.classList.add('correct');
            });
        });
    }

    // --- 5. XỬ LÝ ẢNH PREVIEW ---
    imageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreviewContainer.classList.remove('hidden');
            }
            reader.readAsDataURL(file);
        }
    });

    function removeImage() {
        imageInput.value = '';
        imagePreview.src = '';
        imagePreviewContainer.classList.add('hidden');
    }
    btnRemoveImage.addEventListener('click', removeImage);

    // --- 6. SUBMIT FORM ---
    questionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Thu thập dữ liệu
        const formData = new FormData();
        
        // Các trường cơ bản
        formData.append('questionText', document.getElementById('question-text').value);
        formData.append('categoryId', categoryIdInput.value);
        formData.append('difficulty', document.getElementById('difficulty').value);
        formData.append('questionType', document.querySelector('input[name="questionType"]:checked').value);
        formData.append('creatorId', currentUser._id); // Lấy từ localStorage
        formData.append('explanation', document.getElementById('explanation').value);
        
        // File ảnh (nếu có)
        if (imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        // Xử lý mảng Choices (Phức tạp nhất)
        const choiceTexts = document.querySelectorAll('input[name="choiceText"]');
        const correctRadios = document.querySelectorAll('input[name="correctChoice"]');
        
        const choicesArray = [];
        choiceTexts.forEach((input, index) => {
            choicesArray.push({
                choiceText: input.value,
                isCorrect: correctRadios[index].checked
            });
        });

        // Convert mảng object thành chuỗi JSON để gửi qua FormData
        formData.append('choices', JSON.stringify(choicesArray));

        // Gửi API
        try {
            const res = await fetch('/api/questions', {
                method: 'POST',
                body: formData // Không cần header Content-Type (Browser tự lo)
            });

            const data = await res.json();
            
            if (res.ok) {
                alert("Thành công! " + data.message);
                // Reset form hoặc quay lại chọn topic
                questionForm.reset();
                removeImage();
                step1Section.classList.remove('hidden');
                step2Section.classList.add('hidden');
            } else {
                alert("Lỗi: " + data.message);
            }
        } catch (err) {
            console.error(err);
            alert("Không thể kết nối đến máy chủ.");
        }
    });

    // Khởi chạy
    loadTopics();
});