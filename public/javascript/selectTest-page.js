document.addEventListener('DOMContentLoaded', () => {
    // --- 1. VARIABLES ---
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get('id');
    let currentCategoryData = null;
    
    // Browser State
    let browserPage = 1;
    let browserSearch = "";
    let browserDifficulty = "all";

    // DOM Elements - Config Inputs
    const limitInput = document.getElementById('config-limit');
    const difficultyInput = document.getElementById('config-difficulty');
    
    // Mode Elements
    const radioPaced = document.getElementById('mode-paced');
    const radioClassic = document.getElementById('mode-classic');
    const rowPaced = document.getElementById('mode-paced-row');
    const rowClassic = document.getElementById('mode-classic-row');
    
    // Time Inputs
    const inputTimePerQ = document.getElementById('config-time-per-question');
    const inputTotalCalc = document.getElementById('config-total-calc'); // Readonly
    const inputTotalTime = document.getElementById('config-total-time'); // Classic mode

    // Modal & Buttons
    const btnOpenConfig = document.getElementById('btn-open-config');
    const modalConfig = document.getElementById('config-modal');
    const btnCloseModal = document.querySelector('.close-modal-btn');
    const btnStartConfirm = document.getElementById('btn-start-game-confirm');
    
    // Search/Filter
    const searchForm = document.querySelector('.search-form-test');
    const filterSelect = document.getElementById('browser-filter-difficulty');

    const modalPractice = document.getElementById('practice-modal');
    const btnClosePractice = document.querySelector('.close-practice-btn');
    const practiceQText = document.getElementById('practice-question-text');
    const practiceOptions = document.getElementById('practice-options');
    const practiceResult = document.getElementById('practice-result');
    const btnCheckPractice = document.getElementById('btn-check-practice');

    const btnReport = document.getElementById('btn-report-question');
    
    let currentPracticeQID = null;
    let currentSelectedChoice = null;

    //Âm thanh
    let synth = null;
    let clickListenerAdded = false;

    // Định nghĩa các tần số đơn giản
    const SOUND_FREQS = {
        CORRECT: { freq: "C6", duration: "8n" }, // Cao, ngắn, phản hồi tích cực
        WRONG: { freq: "C3", duration: "4n" },   // Thấp, dài hơn, phản hồi tiêu cực
    };

    function initializeAudio() {
        if (!synth) {
            Tone.start();
            synth = new Tone.Synth({
                oscillator: {
                    type: "sine"
                }
            }).toDestination();
            console.log("Tone.js AudioContext đã khởi tạo.");
        }
    }

    function playFeedbackSound(isCorrect) {
        const isSfxOn = localStorage.getItem('devarena_sfx_enabled') === 'true';
        if (!isSfxOn) return;
        
        initializeAudio();
        const sound = isCorrect ? SOUND_FREQS.CORRECT : SOUND_FREQS.WRONG;
        if (synth) {
            synth.triggerAttackRelease(sound.freq, sound.duration);
        }
    }

    if (!categoryId) {
        alert("Thiếu ID chủ đề!");
        window.location.replace("/");
        return;
    }

    if (!clickListenerAdded) {
        document.body.addEventListener('click', initializeAudio, { once: true });
        clickListenerAdded = true;
    }

    // --- HÀM HỖ TRỢ: FIX LỖI HIỂN THỊ THẺ HTML ---
    function escapeHtml(text) {
        if (!text) return "";
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // --- 2. LOGIC UI CONFIG (Xử lý Mode) ---
    
    function updateConfigUI() {
        const isPaced = radioPaced.checked;

        // 1. Toggle Visual Class
        if (isPaced) {
            rowPaced.classList.add('active');
            rowClassic.classList.remove('active');
            
            // Enable/Disable Inputs
            inputTimePerQ.disabled = false;
            inputTotalTime.disabled = true;
            
            // Tính toán lại tổng thời gian hiển thị
            calculatePacedTotalTime();
        } else {
            rowClassic.classList.add('active');
            rowPaced.classList.remove('active');
            
            // Enable/Disable Inputs
            inputTimePerQ.disabled = true;
            inputTotalTime.disabled = false;
        }
    }

    function calculatePacedTotalTime() {
        // Logic: Tổng = Số câu * Giây/câu
        const limit = parseInt(limitInput.value);
        const secondsPerQ = parseInt(inputTimePerQ.value);
        
        const totalSeconds = limit * secondsPerQ;
        
        // Format ra phút giây cho đẹp
        const min = Math.floor(totalSeconds / 60);
        const sec = totalSeconds % 60;
        
        let text = "";
        if (min > 0) text += `${min} phút `;
        if (sec > 0) text += `${sec} giây`;
        if (text === "") text = "0 giây";

        inputTotalCalc.value = text;
    }

    // Gán sự kiện thay đổi Mode
    radioPaced.addEventListener('change', updateConfigUI);
    radioClassic.addEventListener('change', updateConfigUI);

    // Gán sự kiện thay đổi số liệu
    limitInput.addEventListener('change', calculatePacedTotalTime);
    inputTimePerQ.addEventListener('change', calculatePacedTotalTime);

    // --- 3. LOGIC START GAME (VALIDATION & START) ---
    if (btnStartConfirm) {
        // Chuyển sang async để gọi API kiểm tra số lượng
        btnStartConfirm.addEventListener('click', async () => {
            const limit = parseInt(limitInput.value);
            const difficulty = difficultyInput.value;
            const mode = radioPaced.checked ? 'paced' : 'classic';
            
            // [MỚI] Validate số lượng câu hỏi trước khi chuyển trang
            const confirmBtnText = btnStartConfirm.innerHTML;
            btnStartConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang kiểm tra...';
            btnStartConfirm.disabled = true;

            try {
                const checkUrl = `/api/questions?categoryId=${categoryId}&limit=1&difficulty=${difficulty}&excludeDeleted=true`;
                const res = await fetch(checkUrl);
                const data = await res.json();

                if (data.totalQuestions < limit) {
                    // Nếu không đủ câu hỏi -> Báo lỗi
                    let diffName = difficulty === 'all' ? 'Tổng hợp' 
                                 : (difficulty === 'easy' ? 'Dễ' : (difficulty === 'medium' ? 'Trung bình' : 'Khó'));
                    
                    alert(`Không đủ câu hỏi!\n\nBạn yêu cầu: ${limit} câu.\nKho dữ liệu (${diffName}) hiện có: ${data.totalQuestions} câu.\n\nVui lòng giảm số lượng câu hỏi hoặc chọn độ khó khác.`);
                    
                    // Reset nút
                    btnStartConfirm.innerHTML = confirmBtnText;
                    btnStartConfirm.disabled = false;
                    return; // Dừng, không chuyển trang
                }

                // Nếu ĐỦ câu hỏi -> Chuyển trang thi
                const params = new URLSearchParams();
                params.append('categoryId', categoryId);
                params.append('limit', limit);
                params.append('difficulty', difficulty);
                params.append('mode', mode);

                if (mode === 'paced') {
                    params.append('timePerQuestion', inputTimePerQ.value);
                } else {
                    params.append('totalTime', inputTotalTime.value);
                }

                window.location.replace(`/pages/doTest.html?${params.toString()}`);

            } catch (err) {
                console.error(err);
                alert("Lỗi khi kiểm tra dữ liệu. Vui lòng thử lại.");
                btnStartConfirm.innerHTML = confirmBtnText;
                btnStartConfirm.disabled = false;
            }
        });
    }

    // --- 4. LOGIC MODAL POPUP ---
   if (btnOpenConfig) {
        btnOpenConfig.addEventListener('click', (e) => { 
            const userLogged = localStorage.getItem('currentUser'); 

            if (!userLogged) {
                e.preventDefault(); 
                alert("Bạn cần đăng nhập để thực hiện bài thi!");
                window.location.replace("/pages/login.html"); 
                return;
            }

            modalConfig.classList.add('show'); 
            updateConfigUI(); 
        });
    }

    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => { 
            modalConfig.classList.remove('show'); 
        });
    }

    // Đóng khi click ra vùng tối bên ngoài
    window.addEventListener('click', (e) => {
        if (e.target === modalConfig) modalConfig.classList.remove('show');
    });

    // --- 5. CÁC HÀM FETCH DATA ---
    async function fetchCategoryInfo() {
        try {
            const res = await fetch(`/api/category/${categoryId}`);
            if (!res.ok) throw new Error('Lỗi tải category');
            const data = await res.json();
            currentCategoryData = data;
            
            document.getElementById('category-name').textContent = data.name;
            document.getElementById('category-description').textContent = data.long_description;
            
            const banner = document.querySelector('.topic-banner');
            if (banner && data.banner_image_url) {
                banner.style.backgroundImage = `url('${data.banner_image_url}')`;
            }
            fetchQuestions();
        } catch (err) { console.error(err); }
    }

    async function fetchQuestions() {
        const container = document.getElementById('question-list-container');
        container.innerHTML = '<div style="text-align:center; padding:20px;">Đang tải...</div>';
        try {
            const url = `/api/questions?categoryId=${categoryId}&page=${browserPage}&limit=10&search=${encodeURIComponent(browserSearch)}&difficulty=${browserDifficulty}&excludeDeleted=true`;
            const res = await fetch(url);
            const data = await res.json();
            renderQuestionList(data.questions, data.totalQuestions);
            updatePagination(data);
        } catch (err) { container.innerHTML = '<p style="text-align:center; color:red">Lỗi kết nối.</p>'; }
    }

    function renderQuestionList(questions, totalCount) {
        const container = document.getElementById('question-list-container');
        document.getElementById('modal-question-count').textContent = `${totalCount} câu hỏi`;
        container.innerHTML = '';
        if(!questions || questions.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#718096; padding:20px;">Không tìm thấy kết quả.</p>';
            return;
        }
        const color = currentCategoryData?.theme_color || '#3182ce';
        const categoryIcon = currentCategoryData?.icon || 'fas fa-question-circle';

        questions.forEach(q => {
            const item = document.createElement('div');
            item.className = 'test-item-horizontal' ;
            item.style.setProperty('--active-color', color);
            
            let diffText = q.Difficulty === 'easy' ? 'Dễ' : (q.Difficulty === 'medium' ? 'Trung bình' : 'Khó');
            let diffClass = q.Difficulty;
            
            item.innerHTML = `
                <div class="test-icon-wrapper" style="color:${color}">
                    <i class="${categoryIcon}"></i>
                </div>
                <div class="test-content-wrapper">
                    <h3 class="test-item-title">${escapeHtml(q.QuestionText)}</h3>
                    <div class="test-item-meta">
                        <span><i class="fas fa-user"></i> ${q.CreatorUserID?.Username || 'Admin'}</span>
                        <span style="margin:0 5px">•</span>
                        <span class="meta-difficulty ${diffClass}">${diffText}</span>
                    </div>
                </div>
            `;
            item.addEventListener('click', () => openPracticeModal(q));
            container.appendChild(item);
        });
    }

    function updatePagination(data) {
        const controls = document.getElementById('pagination-controls');
        const btnPrev = document.getElementById('btn-prev-page');
        const btnNext = document.getElementById('btn-next-page');
        const info = document.getElementById('page-info');

        if(data.totalPages <= 1) { controls.style.display = 'none'; return; }
        controls.style.display = 'flex';
        info.textContent = `Trang ${data.currentPage} / ${data.totalPages}`;
        
        btnPrev.disabled = data.currentPage === 1;
        btnNext.disabled = data.currentPage === data.totalPages;
        
        // Remove old listeners & add new
        btnPrev.onclick = () => { browserPage--; fetchQuestions(); };
        btnNext.onclick = () => { browserPage++; fetchQuestions(); };
    }

    // Search & Filter Events
    if(searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            browserSearch = document.getElementById('test-search-input').value.trim();
            browserPage = 1;
            fetchQuestions();
        });
    }
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            browserDifficulty = e.target.value;
            browserPage = 1;
            fetchQuestions();
        });
    }

    // --- [MỚI & ĐÃ SỬA CSS] LOGIC PRACTICE MODAL ---

    function openPracticeModal(q) {
        currentPracticeQID = q._id;
        currentSelectedChoice = null;
        if (btnReport) {
            btnReport.classList.remove('reported'); 
            btnReport.title = "Báo cáo câu hỏi lỗi";
        }

        // 1. Reset UI về trạng thái ban đầu
        practiceResult.style.display = 'none';
        // Xóa các class màu sắc kết quả cũ
        practiceResult.classList.remove('result-success', 'result-error');
        
        // Reset nút bấm
        btnCheckPractice.disabled = false;
        btnCheckPractice.textContent = "Kiểm tra đáp án";
        // Không cần reset backgroundColor inline nữa vì đã dùng CSS

        // 2. Render Nội dung
        practiceQText.innerHTML = escapeHtml(q.QuestionText);

        const imgEl = document.getElementById('practice-question-image');
        if (imgEl) {
            if (q.Image) {

                let imageUrl = q.Image.replace(/\\/g, '/'); 
                if (imageUrl.startsWith('public')) {
                    imageUrl = '/' + imageUrl.substring(6); 
                } else if (!imageUrl.startsWith('/')) {
                    imageUrl = '/' + imageUrl;
                }

                imgEl.src = imageUrl;
                imgEl.style.display = 'block';
            } else {
                imgEl.style.display = 'none';  
                imgEl.src = "";
            }
        }
        
        practiceOptions.innerHTML = '';

        q.choices.forEach(c => {
            const row = document.createElement('div');
            // SỬ DỤNG CLASS CSS MỚI
            row.className = 'practice-option-row'; 
            
            row.innerHTML = `
                <input type="radio" name="practice_opt" id="${c._id}" value="${c._id}">
                <label for="${c._id}">${escapeHtml(c.choiceText)}</label>
            `;
            
            // Click chọn đáp án
            row.addEventListener('click', () => {
                // Reset class 'selected' của các dòng khác
                Array.from(practiceOptions.children).forEach(el => el.classList.remove('selected'));
                
                // Chọn dòng hiện tại
                row.querySelector('input').checked = true;
                row.classList.add('selected'); // Thêm class để CSS tô màu
                currentSelectedChoice = c._id;
            });

            practiceOptions.appendChild(row);
        });

        // 3. Hiện Modal
        modalPractice.classList.add('show');
    }

    // Sự kiện nút Kiểm tra
    if (btnCheckPractice) {
        btnCheckPractice.addEventListener('click', async () => {
            if (!currentSelectedChoice) {
                alert("Vui lòng chọn một đáp án!");
                return;
            }

            // Gọi API Check
            btnCheckPractice.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang check...';
            // Disable tạm thời để tránh click đúp
            btnCheckPractice.disabled = true; 

            try {
                const res = await fetch('/api/check-single-answer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        questionId: currentPracticeQID,
                        selectedChoiceId: currentSelectedChoice
                    })
                });
                const data = await res.json();

                playFeedbackSound(data.isCorrect); 

                // Hiển thị kết quả
                practiceResult.style.display = 'block';
                const statusTitle = document.getElementById('practice-status');
                const explainText = document.getElementById('practice-explanation');
                
                // Xóa class cũ trước khi thêm class mới
                practiceResult.classList.remove('result-success', 'result-error');

                if (data.isCorrect) {
                    statusTitle.innerHTML = '<i class="fas fa-check-circle"></i> CHÍNH XÁC!';
                    // Thêm class CSS xanh
                    practiceResult.classList.add('result-success');
                } else {
                    statusTitle.innerHTML = '<i class="fas fa-times-circle"></i> SAI RỒI!';
                    // Thêm class CSS đỏ
                    practiceResult.classList.add('result-error');
                }
                
                explainText.innerHTML = escapeHtml(data.explanation);
                
                // Cập nhật trạng thái nút sau khi xong
                btnCheckPractice.textContent = "Đã kiểm tra";
                // CSS :disabled sẽ tự động làm nút xám đi và không click được nữa
                btnCheckPractice.disabled = true; 

            } catch (err) {
                console.error(err);
                alert("Lỗi server!");
                btnCheckPractice.textContent = "Kiểm tra đáp án";
                btnCheckPractice.disabled = false; // Mở lại nút nếu lỗi để thử lại
            }
        });
    }

    // Đóng Modal Practice
    if (btnClosePractice) {
        btnClosePractice.addEventListener('click', () => {
            modalPractice.classList.remove('show');
        });
    }
    // Đóng khi click ra ngoài
    window.addEventListener('click', (e) => {
        if (e.target === modalConfig) modalConfig.classList.remove('show');
        if (e.target === modalPractice) modalPractice.classList.remove('show');
    });

    // Đóng Modal Practice
    if (btnClosePractice) {
        btnClosePractice.addEventListener('click', () => {
            modalPractice.classList.remove('show');
        });
    }

    // --- LOGIC BUTTON REPORT ---
    if (btnReport) {
        btnReport.addEventListener('click', async () => {
            // 1. Kiểm tra đăng nhập
            const storedUser = localStorage.getItem('currentUser');
            if (!storedUser) {
                alert("Bạn cần đăng nhập để báo cáo!");
                return;
            }
            const currentUser = JSON.parse(storedUser);
            const userId = currentUser._id || currentUser.id; // Tùy vào cách bạn lưu object user

            // 2. Kiểm tra xem đã bấm chưa (Client side check visual)
            if (btnReport.classList.contains('reported')) {
                return; // Đã report rồi thì không làm gì
            }

            if (!confirm("Bạn có chắc muốn báo cáo câu hỏi này có vấn đề không?")) return;

            // 3. Gọi API
            try {
                const res = await fetch('/api/questions/report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        questionId: currentPracticeQID,
                        userId: userId
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    alert("✅ " + data.message);
                    // Đổi màu nút sang đỏ để biết đã report
                    btnReport.classList.add('reported');
                } else {
                    alert("⚠️ " + data.message); // Ví dụ: "Bạn đã báo cáo rồi"
                    if (data.message.includes("đã báo cáo")) {
                         btnReport.classList.add('reported');
                    }
                }

            } catch (err) {
                console.error(err);
                alert("Lỗi kết nối server.");
            }
        });
    }

    // Đóng khi click ra ngoài (Bổ sung vào event listener window click cũ)
    window.addEventListener('click', (e) => {
        if (e.target === modalConfig) modalConfig.classList.remove('show');
        if (e.target === modalPractice) modalPractice.classList.remove('show'); // Thêm dòng này
    });

    // Init
    fetchCategoryInfo();
    updateConfigUI(); // Init UI state
});