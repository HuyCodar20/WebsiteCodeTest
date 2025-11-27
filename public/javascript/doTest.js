document.addEventListener('DOMContentLoaded', () => {
    /* =========================================
       PHẦN 1: CẤU HÌNH & KHỞI TẠO STATE
       ========================================= */
    
    // 1.1 Lấy tham số từ URL
    const urlParams = new URLSearchParams(window.location.search);
    
    // Tham số lọc câu hỏi
    const categoryId = urlParams.get('categoryId');
    const limit = urlParams.get('limit') || 10;
    const difficulty = urlParams.get('difficulty') || 'all';
    
    // Tham số chế độ thi (Mode)
    const mode = urlParams.get('mode') || 'classic'; // 'classic' (tính giờ tổng) hoặc 'paced' (tính giờ từng câu)
    const totalTime = parseInt(urlParams.get('totalTime')) || 900; // Mặc định 15 phút
    const timePerQuestion = parseInt(urlParams.get('timePerQuestion')) || 60; // Mặc định 60s/câu

    // 1.2 State Global (Biến lưu trạng thái)
    let questionsData = [];      // Chứa danh sách câu hỏi từ API
    let userAnswers = [];        // Lưu đáp án user: [{ questionId, selectedChoiceId, isFlagged }]
    let currentQuestionIndex = 0;// Chỉ số câu hỏi hiện tại
    let timerInterval = null;    // Biến giữ Interval của đồng hồ tổng
    let questionTimerInterval = null; // Biến giữ Interval của đồng hồ từng câu (Paced)

    // 1.3 DOM Elements (Các phần tử giao diện)
    const testTitle = document.getElementById('test-title-display');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const questionNumDisplay = document.getElementById('question-number-display');
    const paletteContainer = document.getElementById('question-palette');
    const mainArea = document.querySelector('.question-area');
    
    // Các nút điều hướng
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnSubmit = document.getElementById('btn-submit');
    const btnReview = document.getElementById('btn-review');

    // UI đặc thù cho từng mode
    const classicTimerBox = document.getElementById('classic-timer-box');
    const classicLegend = document.getElementById('classic-legend');
    const pacedProgressBar = document.getElementById('paced-progress-bar-container');
    const pacedBarFill = document.getElementById('paced-progress-bar');
    const questionTimerBadge = document.getElementById('question-timer-badge');
    const qTimerVal = document.getElementById('q-timer-val');

    /* =========================================
       PHẦN 2: CÁC HÀM HELPER (HỖ TRỢ)
       ========================================= */

    /**
     * Chuyển đổi ký tự đặc biệt để chống lỗi hiển thị HTML (XSS prevention basic)
     */
    function escapeHtml(text) {
        if (!text) return "";
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Xử lý đường dẫn ảnh để hiển thị đúng (loại bỏ public/ thừa)
     */
    function processImageUrl(rawUrl) {
        if (!rawUrl) return "";
        let imageUrl = rawUrl.replace(/\\/g, '/'); // Đổi backslash thành slash
        
        // Logic cắt chuỗi: nếu bắt đầu bằng public/ thì cắt bỏ
        if (imageUrl.startsWith('public/')) {
            imageUrl = '/' + imageUrl.substring(7); 
        } else if (imageUrl.startsWith('public')) {
            imageUrl = '/' + imageUrl.substring(6);
        } else if (!imageUrl.startsWith('/')) {
            imageUrl = '/' + imageUrl;
        }
        return imageUrl;
    }

    /* =========================================
       PHẦN 3: LOGIC KHỞI TẠO BÀI THI
       ========================================= */

    /**
     * Hàm Main: Chạy khi trang load xong
     */
    async function initTest() {
        if (!categoryId) {
            alert("Thiếu thông tin bài thi (CategoryId)!");
            window.location.href = "/";
            return;
        }

        // Cài đặt giao diện dựa trên Mode
        setupUIMode();

        // Gọi API lấy đề thi
        await generateTest();
    }

    /**
     * Ẩn/Hiện các thành phần UI dựa trên mode Classic hay Paced
     */
    function setupUIMode() {
        if (mode === 'paced') {
            testTitle.textContent = "Thử thách tốc độ";
            
            // Ẩn UI Classic
            if(classicTimerBox) classicTimerBox.style.display = 'none';
            if(classicLegend) classicLegend.style.display = 'none';
            if(btnPrev) btnPrev.style.display = 'none'; // Paced không được quay lại
            if(btnReview) btnReview.style.display = 'none'; // Paced không có review
            
            // Hiện UI Paced
            if(pacedProgressBar) pacedProgressBar.style.display = 'block';
            if(questionTimerBadge) questionTimerBadge.style.display = 'inline-block';
            
            // Đổi text nút Next
            if(btnNext) btnNext.textContent = "Câu tiếp >>";
        } else {
            testTitle.textContent = "Bài thi tiêu chuẩn";
            // Hiện UI Classic
            if(classicTimerBox) classicTimerBox.style.display = 'block';
            if(classicLegend) classicLegend.style.display = 'flex';
        }
    }

    /* =========================================
       PHẦN 4: LOGIC LẤY DATA VÀ RENDER
       ========================================= */

    /**
     * Gọi API tạo đề thi ngẫu nhiên
     */
    async function generateTest() {
        try {
            const url = `/api/test/generate?categoryId=${categoryId}&limit=${limit}&difficulty=${difficulty}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Lỗi tạo đề thi từ Server");

            const data = await res.json();
            questionsData = data.questions;

            if (!questionsData || questionsData.length === 0) {
                alert("Không đủ câu hỏi trong kho dữ liệu!");
                window.location.href = "/";
                return;
            }

            // Khởi tạo mảng câu trả lời của User
            userAnswers = questionsData.map(q => ({
                questionId: q._id,
                selectedChoiceId: null, 
                isFlagged: false 
            }));

            // Render Palette (Sidebar) và Câu hỏi đầu tiên
            renderPalette();
            loadQuestion(0);

            // Bắt đầu tính giờ
            if (mode === 'classic') {
                startClassicTimer(totalTime);
            } else {
                startPacedQuestionTimer(); // Timer cho câu 1
            }

        } catch (err) {
            console.error(err);
            questionText.textContent = "Lỗi tải đề thi. Vui lòng kiểm tra kết nối mạng.";
        }
    }

    /**
     * Hiển thị câu hỏi ra màn hình
     */
    function loadQuestion(index) {
        if (index < 0 || index >= questionsData.length) return;
        currentQuestionIndex = index;

        const q = questionsData[index];
        questionNumDisplay.textContent = `Câu ${index + 1} / ${questionsData.length}`;
        
        // 1. Hiển thị nội dung câu hỏi (Text)
        questionText.innerHTML = escapeHtml(q.QuestionText);

        // 2. Hiển thị Ảnh (nếu có)
        const imgEl = document.getElementById('question-image');
        if (imgEl) {
            if (q.Image) {
                const imageUrl = processImageUrl(q.Image); // Dùng hàm helper xử lý path
                imgEl.src = imageUrl;
                imgEl.style.display = 'block';
            } else {
                imgEl.style.display = 'none';  
                imgEl.src = "";
            }
        }

        // 3. Render các lựa chọn (Options)
        optionsContainer.innerHTML = '';
        q.choices.forEach(choice => {
            const item = document.createElement('div');
            item.className = 'option-item';
            
            // Kiểm tra xem user đã chọn đáp án này chưa
            const currentAns = userAnswers[index].selectedChoiceId;
            if (currentAns === choice._id) item.classList.add('selected');

            item.innerHTML = `
                <input type="radio" name="q_${q._id}" ${currentAns === choice._id ? 'checked' : ''}>
                <span>${escapeHtml(choice.choiceText)}</span>
            `;

            // Sự kiện click chọn đáp án
            item.addEventListener('click', () => {
                // Lưu vào state
                userAnswers[index].selectedChoiceId = choice._id;
                
                // Update UI (Xóa chọn cũ, thêm chọn mới)
                const all = optionsContainer.querySelectorAll('.option-item');
                all.forEach(el => {
                    el.classList.remove('selected');
                    el.querySelector('input').checked = false;
                });
                item.classList.add('selected');
                item.querySelector('input').checked = true;

                // Cập nhật màu sidebar ngay lập tức
                updatePalette();
            });

            optionsContainer.appendChild(item);
        });

        // 4. Cập nhật trạng thái nút bấm (Chỉ cho Classic Mode)
        if (mode === 'classic') {
            if(btnPrev) btnPrev.disabled = index === 0;
            if(btnNext) btnNext.disabled = index === questionsData.length - 1;
            updatePalette();
        }

        // Cập nhật nút Flag (Đánh dấu)
        updateReviewButtonState(index);
    }

    /* =========================================
       PHẦN 5: LOGIC TIMERS (ĐỒNG HỒ)
       ========================================= */
    
    // Timer Tổng (Dùng cho Classic Mode)
    function startClassicTimer(seconds) {
        let timeLeft = seconds;
        const minEl = document.getElementById('timer-minutes');
        const secEl = document.getElementById('timer-seconds');

        function display() {
            const m = Math.floor(timeLeft / 60);
            const s = timeLeft % 60;
            if(minEl) minEl.textContent = m.toString().padStart(2, '0');
            if(secEl) secEl.textContent = s.toString().padStart(2, '0');
        }

        display();
        timerInterval = setInterval(() => {
            timeLeft--;
            display();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                alert("Hết giờ làm bài!");
                submitTest();
            }
        }, 1000);
    }

    // Timer Từng câu (Dùng cho Paced Mode)
    function startPacedQuestionTimer() {
        let timeLeft = timePerQuestion;
        
        // Reset hiển thị số giây
        if(qTimerVal) qTimerVal.textContent = timeLeft;
        
        // Reset thanh progress bar
        if(pacedBarFill) {
            pacedBarFill.style.transition = 'none';
            pacedBarFill.style.width = '100%';
        }

        // Tạo animation trượt giảm dần
        setTimeout(() => {
            if(pacedBarFill) {
                pacedBarFill.style.transition = `width ${timePerQuestion}s linear`;
                pacedBarFill.style.width = '0%';
            }
        }, 50);

        // Clear timer cũ nếu tồn tại
        if (questionTimerInterval) clearInterval(questionTimerInterval);

        questionTimerInterval = setInterval(() => {
            timeLeft--;
            if(qTimerVal) qTimerVal.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(questionTimerInterval);
                // Hết giờ câu này -> Tự động chuyển câu
                handlePacedNext();
            }
        }, 1000);
    }

    // Xử lý chuyển câu tự động trong Paced Mode
    function handlePacedNext() {
        if (currentQuestionIndex < questionsData.length - 1) {
            loadQuestion(currentQuestionIndex + 1);
            startPacedQuestionTimer(); // Reset timer cho câu mới
        } else {
            // Hết câu hỏi -> Nộp bài
            clearInterval(questionTimerInterval);
            alert("Đã hoàn thành tất cả câu hỏi!");
            submitTest();
        }
    }

    /* =========================================
       PHẦN 6: PALETTE (DANH SÁCH CÂU HỎI SIDEBAR)
       ========================================= */
    
    function renderPalette() {
        if (!paletteContainer) return;
        paletteContainer.innerHTML = '';
        
        questionsData.forEach((q, idx) => {
            const item = document.createElement('div');
            item.className = 'palette-item';
            item.textContent = idx + 1;
            
            if (mode === 'classic') {
                item.addEventListener('click', () => loadQuestion(idx));
            } else {
                // Paced mode: Không cho click nhảy câu
                item.style.cursor = 'default';
                item.style.pointerEvents = 'none';
                item.style.opacity = '0.5';
            }
            
            paletteContainer.appendChild(item);
        });
        updatePalette();
    }

    // Cập nhật màu sắc của các ô số trong sidebar
    function updatePalette() {
        const items = paletteContainer.querySelectorAll('.palette-item');
        items.forEach((item, idx) => {
            item.className = 'palette-item'; // Reset class
            
            // 1. Current (Câu đang làm)
            if (idx === currentQuestionIndex) item.classList.add('current');
            
            // 2. Review (Được đánh dấu Flag - Ưu tiên hiện màu vàng)
            if (userAnswers[idx].isFlagged) {
                item.classList.add('review');
            } 
            // 3. Answered (Đã chọn đáp án - Hiện màu xanh)
            else if (userAnswers[idx].selectedChoiceId) {
                item.classList.add('answered');
            }
        });
    }

    /* =========================================
       PHẦN 7: NỘP BÀI & HIỂN THỊ KẾT QUẢ
       ========================================= */

    async function submitTest() {
        // Dừng tất cả đồng hồ
        if(timerInterval) clearInterval(timerInterval);
        if(questionTimerInterval) clearInterval(questionTimerInterval);

        // Hiển thị loading
        mainArea.innerHTML = '<div class="loading-spinner"></div><h3 style="text-align:center;">Đang chấm điểm...</h3>';
        
        try {
            // Payload gửi lên server
            const payload = { userAnswers: userAnswers };

            const res = await fetch('/api/test/submit-dynamic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Lỗi nộp bài");
            
            const result = await res.json();
            showResult(result);

        } catch (err) {
            console.error(err);
            alert("Có lỗi xảy ra khi nộp bài!");
        }
    }

    /**
     * Render trang kết quả (Thay thế toàn bộ nội dung cũ)
     */
    function showResult(result) {
        const testContainer = document.querySelector('.test-container');
        
        // Màu sắc điểm số: >=8 Xanh, >=5 Vàng, <5 Đỏ
        let scoreColor = result.score >= 8 ? '#10b981' : (result.score >= 5 ? '#f59e0b' : '#ef4444');
        
        // Reset style container để hiển thị full
        testContainer.style.height = 'auto';
        testContainer.style.overflow = 'visible';
        testContainer.style.display = 'block';
        
        const html = `
            <div class="result-layout-wrapper">
                
                <aside class="result-sidebar-sticky">
                    <div class="score-card">
                        <div class="score-circle-mini" style="background: ${scoreColor}">
                            <span>${result.score}</span>
                        </div>
                        <h3>Kết quả chung cuộc</h3>
                        <div class="stat-row">
                            <span><i class="fas fa-check-circle" style="color:#10b981"></i> Đúng:</span>
                            <strong>${result.correctCount} / ${result.totalQuestions}</strong>
                        </div>
                        <div class="stat-row">
                            <span><i class="fas fa-times-circle" style="color:#ef4444"></i> Sai:</span>
                            <strong>${result.totalQuestions - result.correctCount}</strong>
                        </div>
                        <hr>
                        <a href="/" class="btn-home-mini"><i class="fas fa-home"></i> Về trang chủ</a>
                        <button onclick="location.reload()" class="btn-retry-mini"><i class="fas fa-redo"></i> Làm lại</button>
                    </div>
                </aside>

                <main class="result-detail-list">
                    <h3 class="result-heading">Chi tiết đáp án</h3>
                    ${questionsData.map((q, idx) => {
                        // Lấy chi tiết kết quả cho câu này
                        const detail = result.details.find(d => d.questionId === q._id);
                        const userChoiceId = userAnswers[idx].selectedChoiceId;
                        const correctChoiceId = detail ? detail.correctChoiceId : null;
                        const isCorrect = detail ? detail.isCorrect : false;
                        
                        // Icon trạng thái
                        const statusIcon = isCorrect 
                            ? '<i class="fas fa-check" style="color:#10b981"></i>' 
                            : '<i class="fas fa-times" style="color:#ef4444"></i>';

                        // Xử lý hiển thị ảnh trong phần Review
                        let imageHtml = '';
                        if (q.Image) {
                            const imageUrl = processImageUrl(q.Image);
                            // QUAN TRỌNG: max-width 100% để không bị bé, object-fit để giữ tỷ lệ
                            imageHtml = `
                                <div class="review-image-wrapper" style="text-align: center; margin: 15px 0;">
                                    <img src="${imageUrl}" alt="Hình minh họa" 
                                         style="max-width: 100%; max-height: 300px; border-radius: 8px; border: 1px solid #ddd; object-fit: contain;">
                                </div>
                            `;
                        }

                        return `
                        <div class="review-item-new ${isCorrect ? 'correct-border' : 'wrong-border'}">
                            <div class="review-header">
                                <span class="q-tag">Câu ${idx + 1}</span>
                                <span class="q-status">${statusIcon}</span>
                            </div>

                            <div class="q-text-new">
                                ${escapeHtml(q.QuestionText)}
                            </div>
                            
                            ${imageHtml} <div class="options-review-new">
                                ${q.choices.map(c => {
                                    let cls = 'opt-review-simple';
                                    let icon = '';

                                    // Logic tô màu đáp án
                                    if (c._id === correctChoiceId) {
                                        cls += ' is-correct-answer'; // Luôn tô xanh đáp án đúng
                                        icon = '<i class="fas fa-check"></i>';
                                    }
                                    
                                    if (c._id === userChoiceId) {
                                        if (c._id !== correctChoiceId) {
                                            cls += ' is-wrong-choice'; // Tô đỏ nếu user chọn sai
                                            icon = '<i class="fas fa-times"></i>';
                                        } else {
                                            cls += ' is-user-selected'; // Tô đậm nếu user chọn đúng
                                        }
                                    }

                                    return `
                                        <div class="${cls}">
                                            ${icon} <span>${escapeHtml(c.choiceText)}</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            
                            ${q.Explanation ? `<div class="explanation-box"><i class="fas fa-lightbulb"></i> <strong>Giải thích:</strong> ${escapeHtml(q.Explanation)}</div>` : ''}
                        </div>
                        `;
                    }).join('')}
                </main>
            </div>
        `;

        // Inject HTML vào trang
        testContainer.innerHTML = html;
        window.scrollTo(0, 0);
    }

    /**
     * Cập nhật giao diện nút Review (Đánh dấu)
     */
    function updateReviewButtonState(index) {
        if (!btnReview) return;
        const isFlagged = userAnswers[index].isFlagged;
        
        if (isFlagged) {
            btnReview.innerHTML = '<i class="fas fa-flag"></i> Bỏ đánh dấu';
            btnReview.classList.add('flagged-active');
        } else {
            btnReview.innerHTML = '<i class="far fa-flag"></i> Đánh dấu';
            btnReview.classList.remove('flagged-active');
        }
    }

    /* =========================================
       PHẦN 8: EVENT LISTENERS (SỰ KIỆN)
       ========================================= */

    // Sự kiện nút Review
    if (btnReview) {
        btnReview.addEventListener('click', () => {
            userAnswers[currentQuestionIndex].isFlagged = !userAnswers[currentQuestionIndex].isFlagged;
            updateReviewButtonState(currentQuestionIndex);
            updatePalette();
        });
    }

    // Sự kiện nút Prev (Lùi)
    if(btnPrev) btnPrev.addEventListener('click', () => loadQuestion(currentQuestionIndex - 1));
    
    // Sự kiện nút Next (Tiến)
    if(btnNext) btnNext.addEventListener('click', () => {
        if (mode === 'paced') {
            // Paced: Next = Skip thời gian -> Qua câu mới ngay
            clearInterval(questionTimerInterval);
            handlePacedNext();
        } else {
            // Classic: Chỉ chuyển trang
            loadQuestion(currentQuestionIndex + 1);
        }
    });

    // Sự kiện nút Submit (Nộp bài)
    if(btnSubmit) btnSubmit.addEventListener('click', () => {
        if(confirm("Bạn có chắc chắn muốn nộp bài ngay không?")) submitTest();
    });

    // KHỞI CHẠY ỨNG DỤNG
    initTest();
});