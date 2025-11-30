document.addEventListener('DOMContentLoaded', () => {
    
    // --- 0. AUTHENTICATION ---
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) {
        alert("Bạn cần đăng nhập để thực hiện chức năng này!");
        window.location.href = '/pages/login.html';
        return;
    }
    const currentUser = JSON.parse(userJson);

    // --- 1. DOM ELEMENTS ---
    
    // Sections
    const dashboardSection = document.getElementById('dashboard-selection');
    const createFlowSection = document.getElementById('create-flow');
    const manageFlowSection = document.getElementById('manage-flow');
    
    // Nav Buttons
    const btnGotoCreate = document.getElementById('btn-goto-create');
    const btnGotoManage = document.getElementById('btn-goto-manage');
    const btnsBackDashboard = document.querySelectorAll('.btn-back-dashboard');

    // Create/Edit Elements
    const step1Section = document.getElementById('step-1-select-topic');
    const step2Section = document.getElementById('step-2-form');
    const topicsGrid = document.getElementById('topics-grid');
    const loadingTopicsDiv = document.getElementById('loading-topics');
    const btnBackTopic = document.getElementById('btn-back-topic');
    const topicTitleDisplay = document.getElementById('selected-topic-title');

    // Form Inputs
    const questionForm = document.getElementById('question-form');
    const editingIdInput = document.getElementById('editing-question-id'); // Hidden input
    const categoryIdInput = document.getElementById('category-id');
    const questionTextInput = document.getElementById('question-text');
    const explanationInput = document.getElementById('explanation');
    const answersContainer = document.getElementById('answers-container');
    const radioTypeInputs = document.querySelectorAll('input[name="questionType"]');
    const btnSubmit = document.getElementById('btn-submit-form');
    
    // Image Upload
    const imageInput = document.getElementById('question-image');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const btnRemoveImage = document.getElementById('btn-remove-image');

    // Manage Elements
    const myQuestionsList = document.getElementById('my-questions-list');
    const btnRefreshList = document.getElementById('btn-refresh-list');
    const filterStatus = document.getElementById('filter-status');

    // --- 2. NAVIGATION LOGIC ---

    function showSection(sectionId) {
        dashboardSection.classList.add('hidden');
        createFlowSection.classList.add('hidden');
        manageFlowSection.classList.add('hidden');
        document.getElementById(sectionId).classList.remove('hidden');
    }

    // Vào trang Tạo mới
    btnGotoCreate.addEventListener('click', () => {
        showSection('create-flow');
        resetFormState(); 
        step1Section.classList.remove('hidden');
        step2Section.classList.add('hidden');
        loadTopics();
    });

    // Vào trang Quản lý
    btnGotoManage.addEventListener('click', () => {
        showSection('manage-flow');
        loadUserQuestions();
    });

    // Quay lại Dashboard
    btnsBackDashboard.forEach(btn => {
        btn.addEventListener('click', () => {
            dashboardSection.classList.remove('hidden');
            createFlowSection.classList.add('hidden');
            manageFlowSection.classList.add('hidden');
        });
    });

    btnBackTopic.addEventListener('click', () => {
        step1Section.classList.remove('hidden');
        step2Section.classList.add('hidden');
    });

    // --- 3. LOGIC ĐẾM KÍ TỰ (CHARACTER COUNTER) ---
    
    function updateCharCounter(inputElement, displayElement) {
        if(inputElement && displayElement) {
            displayElement.textContent = inputElement.value.length;
        }
    }

    questionTextInput.addEventListener('input', () => {
        updateCharCounter(questionTextInput, document.getElementById('count-question'));
    });
    explanationInput.addEventListener('input', () => {
        updateCharCounter(explanationInput, document.getElementById('count-explanation'));
    });

    // --- 4. CREATE FLOW: LOAD TOPICS & RENDER FORM ---

    async function loadTopics() {
        try {
            const res = await fetch('/api/topics');
            const topics = await res.json();
            
            loadingTopicsDiv.style.display = 'none';
            topicsGrid.innerHTML = '';

            topics.forEach(topic => {
                const card = document.createElement('div');
                card.className = 'topic-card-select';
                card.innerHTML = `
                    <i class="${topic.icon || 'fas fa-book'}"></i>
                    <h3>${topic.name}</h3>
                `;
                card.addEventListener('click', () => selectTopic(topic));
                topicsGrid.appendChild(card);
            });
        } catch (err) {
            console.error(err);
            loadingTopicsDiv.textContent = "Lỗi tải danh sách chủ đề.";
        }
    }

    function selectTopic(topic) {
        categoryIdInput.value = topic._id;
        topicTitleDisplay.textContent = `Chủ đề: ${topic.name}`;
        
        step1Section.classList.add('hidden');
        step2Section.classList.remove('hidden');

        // Nếu không phải chế độ sửa thì render mặc định
        if (!editingIdInput.value) {
            renderAnswerInputs('multiple_choice');
        }
    }

    radioTypeInputs.forEach(radio => {
        radio.addEventListener('change', (e) => {
            renderAnswerInputs(e.target.value);
        });
    });

    function renderAnswerInputs(type, existingChoices = null) {
        answersContainer.innerHTML = '';
        
        if (type === 'multiple_choice') {
            for (let i = 0; i < 4; i++) {
                const choiceData = existingChoices ? existingChoices[i] : { choiceText: '', isCorrect: false };
                
                const row = document.createElement('div');
                row.className = 'answer-row';
                if (choiceData.isCorrect) row.classList.add('correct');

                row.innerHTML = `
                    <div class="radio-wrap">
                        <input type="radio" name="correctChoice" value="${i}" class="answer-radio" required ${choiceData.isCorrect ? 'checked' : ''}>
                    </div>
                    <div class="input-wrap">
                        <input type="text" name="choiceText" 
                               placeholder="Đáp án ${String.fromCharCode(65 + i)}" 
                               value="${choiceData.choiceText || ''}"
                               maxlength="200" required>
                        <div class="char-counter">
                            <span class="choice-count">${choiceData.choiceText ? choiceData.choiceText.length : 0}</span>/200
                        </div>
                    </div>
                `;
                answersContainer.appendChild(row);
            }
            // Gán sự kiện đếm cho input đáp án
            const inputs = answersContainer.querySelectorAll('input[name="choiceText"]');
            inputs.forEach(input => {
                input.addEventListener('input', function() {
                    const counter = this.nextElementSibling.querySelector('.choice-count');
                    if(counter) counter.textContent = this.value.length;
                });
            });

        } else if (type === 'true_false') {
            const options = ["Đúng", "Sai"];
            options.forEach((opt, index) => {
                const isCorrect = existingChoices ? existingChoices[index]?.isCorrect : false;
                const row = document.createElement('div');
                row.className = 'answer-row';
                if (isCorrect) row.classList.add('correct');

                row.innerHTML = `
                    <div class="radio-wrap">
                        <input type="radio" name="correctChoice" value="${index}" class="answer-radio" required ${isCorrect ? 'checked' : ''}>
                    </div>
                    <div class="input-wrap">
                        <input type="text" name="choiceText" value="${opt}" readonly style="background-color: #eee;">
                    </div>
                `;
                answersContainer.appendChild(row);
            });
        }
        
        // Highlight row selected
        const radios = answersContainer.querySelectorAll('input[type="radio"]');
        radios.forEach(r => {
            r.addEventListener('change', () => {
                answersContainer.querySelectorAll('.answer-row').forEach(row => row.classList.remove('correct'));
                if (r.checked) r.parentElement.parentElement.classList.add('correct');
            });
        });
    }

    // Image Handlers
    imageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
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

    // --- 5. MANAGE FLOW: LOAD LIST & ACTIONS ---

    async function loadUserQuestions() {
    myQuestionsList.innerHTML = '<tr><td colspan="5" style="text-align: center;">Đang tải dữ liệu...</td></tr>';
    
    try {
        const topicsRes = await fetch('/api/topics');
        const topics = await topicsRes.json();
        
        let allQuestions = [];
        const fetchPromises = topics.map(topic => 
            fetch(`/api/questions?categoryId=${topic._id}&limit=100`)
                .then(res => res.json())
                .then(data => data.questions.map(q => ({...q, CategoryName: topic.name})))
        );

        const results = await Promise.all(fetchPromises);
        results.forEach(arr => allQuestions.push(...arr));

        // [THAY ĐỔI]: KHÔNG lọc q.Status !== 'Deleted' nữa để hiện ra hết
        const myQuestions = allQuestions.filter(q => 
            q.CreatorUserID && 
            (q.CreatorUserID._id === currentUser._id || q.CreatorUserID === currentUser._id)
        );

        renderQuestionsTable(myQuestions);
    } catch (err) {
        console.error(err);
        myQuestionsList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Lỗi kết nối!</td></tr>';
    }
}

    function renderQuestionsTable(questions) {
    const statusVal = filterStatus.value; // Nếu user chọn filter, vẫn filter theo dropdown
    
    // Logic filter dropdown: Nếu chọn "Approved/Pending" thì ẩn Deleted, chọn All thì hiện hết
    const filtered = statusVal === 'all' 
        ? questions 
        : questions.filter(q => q.Status === statusVal);

    if (filtered.length === 0) {
        myQuestionsList.innerHTML = '<tr><td colspan="5" style="text-align: center;">Không có dữ liệu.</td></tr>';
        return;
    }

    myQuestionsList.innerHTML = filtered.map(q => {
        const isDeleted = q.Status === 'Deleted';
        
        // CSS Style cho dòng đã xóa (Xám, mờ)
        const rowStyle = isDeleted ? 'background-color: #f8f9fa; color: #999;' : '';
        
        // Badge Status
        let badgeClass = 'status-pending';
        if (q.Status === 'Approved') badgeClass = 'status-approved';
        if (isDeleted) badgeClass = 'status-deleted'; 

        // Nút Sửa: Nếu đã xóa thì disable
        const editDisabled = isDeleted ? 'disabled' : `onclick="handleEdit('${q._id}')"`;
        const editClass = isDeleted ? 'btn-disabled' : 'btn-edit';
        
        // Nút Hành động: Nếu đã xóa -> Hiện nút Khôi phục. Nếu chưa -> Hiện nút Xóa
        let actionBtnHTML = '';
        if (isDeleted) {
            actionBtnHTML = `
                <button class="action-btn" style="background-color: #28a745;" onclick="handleRestore('${q._id}')" title="Khôi phục câu hỏi">
                    <i class="fas fa-trash-restore"></i>
                </button>
            `;
        } else {
            actionBtnHTML = `
                <button class="action-btn btn-delete" onclick="handleDelete('${q._id}')" title="Xóa tạm thời">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }

        return `
            <tr style="${rowStyle}">
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${q.QuestionText} ${isDeleted ? '(Đã xóa)' : ''}
                </td>
                <td>${q.CategoryName}</td>
                <td>${q.UsageCount || 0}</td>
                <td><span class="status-badge ${badgeClass}">${q.Status}</span></td>
                <td>
                    <button class="action-btn ${editClass}" ${editDisabled} title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${actionBtnHTML}
                </td>
            </tr>
        `;
    }).join('');
}
    btnRefreshList.addEventListener('click', loadUserQuestions);
    filterStatus.addEventListener('change', loadUserQuestions);

    // --- 6. HANDLE ACTIONS (EDIT & DELETE) ---

    // Xóa mềm (Global function)
    window.handleDelete = async function(id) {
        if (!confirm("Bạn có chắc muốn xóa? Câu hỏi sẽ bị ẩn khỏi hệ thống.")) return;

        try {
            const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert("Đã xóa thành công.");
                loadUserQuestions(); // Reload list
            } else {
                alert("Lỗi khi xóa.");
            }
        } catch (e) {
            console.error(e);
            alert("Lỗi kết nối.");
        }
    };

    // Sửa câu hỏi (Dùng API mới GET /:id)
    window.handleEdit = async function(id) {
        try {
            // Gọi API lấy chi tiết
            const res = await fetch(`/api/questions/${id}`);
            if (!res.ok) {
                alert("Không thể tải thông tin câu hỏi.");
                return;
            }
            const questionData = await res.json();
            
            fillFormToEdit(questionData);
        } catch (e) {
            console.error("Lỗi edit:", e);
        }
    };

    function fillFormToEdit(q) {
        // Chuyển view
        showSection('create-flow');
        step1Section.classList.add('hidden');
        step2Section.classList.remove('hidden');

        // Điền dữ liệu vào form
        editingIdInput.value = q._id;
        document.getElementById('selected-topic-title').textContent = "Đang chỉnh sửa câu hỏi";
        btnSubmit.textContent = "Cập nhật";

        categoryIdInput.value = q.CategoryID;
        questionTextInput.value = q.QuestionText;
        explanationInput.value = q.Explanation || '';
        document.getElementById('difficulty').value = q.Difficulty;
        
        // Update counters
        updateCharCounter(questionTextInput, document.getElementById('count-question'));
        updateCharCounter(explanationInput, document.getElementById('count-explanation'));

        // Check Radio Type
        const typeRadio = document.querySelector(`input[name="questionType"][value="${q.QuestionType}"]`);
        if(typeRadio) typeRadio.checked = true;

        // Render Answer List
        renderAnswerInputs(q.QuestionType, q.choices);

        // Load Image Preview
        if(q.Image) {
            imagePreview.src = q.Image;
            imagePreviewContainer.classList.remove('hidden');
        } else {
            removeImage();
        }
    }

    function resetFormState() {
        questionForm.reset();
        editingIdInput.value = ''; 
        btnSubmit.textContent = "Gửi câu hỏi";
        removeImage();
        document.getElementById('selected-topic-title').textContent = "Chủ đề: ...";
        document.getElementById('count-question').textContent = '0';
        document.getElementById('count-explanation').textContent = '0';
    }

    // --- 7. SUBMIT FORM (CREATE & UPDATE) ---
    
    questionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        const isEditMode = !!editingIdInput.value;

        formData.append('questionText', questionTextInput.value);
        formData.append('categoryId', categoryIdInput.value);
        formData.append('difficulty', document.getElementById('difficulty').value);
        formData.append('questionType', document.querySelector('input[name="questionType"]:checked').value);
        formData.append('explanation', explanationInput.value);
        
        // Chỉ gửi CreatorId khi tạo mới
        if(!isEditMode) {
             formData.append('creatorId', currentUser._id);
        }

        if (imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        // Gom nhóm Choices
        const choiceTexts = document.querySelectorAll('input[name="choiceText"]');
        const correctRadios = document.querySelectorAll('input[name="correctChoice"]');
        
        const choicesArray = [];
        choiceTexts.forEach((input, index) => {
            choicesArray.push({
                choiceText: input.value,
                isCorrect: correctRadios[index].checked
            });
        });
        formData.append('choices', JSON.stringify(choicesArray));

        // Gọi API (POST hoặc PUT)
        try {
            let url = '/api/questions';
            let method = 'POST';

            if (isEditMode) {
                url = `/api/questions/${editingIdInput.value}`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method: method,
                body: formData
            });

            const data = await res.json();
            
            if (res.ok) {
                alert(isEditMode ? "Cập nhật thành công!" : "Tạo câu hỏi thành công!");
                
                if(isEditMode) {
                    showSection('manage-flow');
                    loadUserQuestions();
                } else {
                    resetFormState();
                    // Optional: Quay lại chọn topic hoặc giữ nguyên để nhập tiếp
                    // step1Section.classList.remove('hidden');
                    // step2Section.classList.add('hidden');
                }
            } else {
                alert("Lỗi: " + data.message);
            }
        } catch (err) {
            console.error(err);
            alert("Không thể kết nối đến máy chủ.");
        }
    });

    window.handleRestore = async function(id) {
    if (!confirm("Bạn muốn khôi phục câu hỏi này để sử dụng lại?")) return;

    try {
        const res = await fetch(`/api/questions/${id}/restore`, { method: 'PATCH' });
        if (res.ok) {
            alert("Đã khôi phục thành công.");
            loadUserQuestions(); // Tải lại danh sách
        } else {
            alert("Lỗi khi khôi phục.");
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối.");
    }
    };
    
});