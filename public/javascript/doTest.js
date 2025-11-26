document.addEventListener('DOMContentLoaded', () => {
    // --- 1. LẤY THAM SỐ URL ---
    const urlParams = new URLSearchParams(window.location.search);
    
    // Tham số chung
    const categoryId = urlParams.get('categoryId');
    const limit = urlParams.get('limit') || 10;
    const difficulty = urlParams.get('difficulty') || 'all';
    
    // Tham số Mode
    const mode = urlParams.get('mode') || 'classic'; // 'classic' hoặc 'paced'
    const totalTime = parseInt(urlParams.get('totalTime')) || 900; // Giây (Classic)
    const timePerQuestion = parseInt(urlParams.get('timePerQuestion')) || 60; // Giây (Paced)

    // State Global
    let questionsData = [];
    let userAnswers = []; // Mảng object: [{ questionId, selectedChoiceId }]
    let currentQuestionIndex = 0;
    let timerInterval = null;
    let questionTimerInterval = null;

    // DOM Elements
    const testTitle = document.getElementById('test-title-display');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const questionNumDisplay = document.getElementById('question-number-display');
    const paletteContainer = document.getElementById('question-palette');
    const mainArea = document.querySelector('.question-area');
    const sidebar = document.querySelector('.sidebar-area');

    // Button Elements
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnSubmit = document.getElementById('btn-submit');
    const btnReview = document.getElementById('btn-review');

    // UI Elements đặc thù
    const classicTimerBox = document.getElementById('classic-timer-box');
    const classicLegend = document.getElementById('classic-legend');
    const pacedProgressBar = document.getElementById('paced-progress-bar-container');
    const pacedBarFill = document.getElementById('paced-progress-bar');
    const questionTimerBadge = document.getElementById('question-timer-badge');
    const qTimerVal = document.getElementById('q-timer-val');

    // --- HÀM HỖ TRỢ: CHUYỂN ĐỔI KÝ TỰ HTML (FIX LỖI HIỂN THỊ THẺ) ---
    function escapeHtml(text) {
        if (!text) return "";
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // --- 2. HÀM KHỞI TẠO (INIT) ---
    async function initTest() {
        if (!categoryId) {
            alert("Thiếu thông tin bài thi!");
            window.location.href = "/";
            return;
        }

        // Setup UI theo Mode
        setupUIMode();

        // Fetch Đề thi
        await generateTest();
    }

    function setupUIMode() {
        if (mode === 'paced') {
            testTitle.textContent = "Thử thách tốc độ";
            // Ẩn UI Classic
            if(classicTimerBox) classicTimerBox.style.display = 'none';
            if(classicLegend) classicLegend.style.display = 'none';
            if(btnPrev) btnPrev.style.display = 'none'; // Không cho quay lại
            if(btnReview) btnReview.style.display = 'none'; // Không review
            
            // Hiện UI Paced
            if(pacedProgressBar) pacedProgressBar.style.display = 'block';
            if(questionTimerBadge) questionTimerBadge.style.display = 'inline-block';
            
            // Đổi nút Next thành "Câu tiếp theo"
            if(btnNext) btnNext.textContent = "Câu tiếp >>";
        } else {
            testTitle.textContent = "Bài thi tiêu chuẩn";
            // Hiện UI Classic
            if(classicTimerBox) classicTimerBox.style.display = 'block';
            if(classicLegend) classicLegend.style.display = 'flex';
        }
    }

    // --- 3. SINH ĐỀ THI (API) ---
    async function generateTest() {
        try {
            const url = `/api/test/generate?categoryId=${categoryId}&limit=${limit}&difficulty=${difficulty}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Lỗi sinh đề thi");

            const data = await res.json();
            questionsData = data.questions;

            if (!questionsData || questionsData.length === 0) {
                alert("Không đủ câu hỏi trong kho!");
                window.location.href = "/";
                return;
            }

            // Init State
            userAnswers = questionsData.map(q => ({
                questionId: q._id,
                selectedChoiceId: null, 
                isFlagged: false 
            }));

            // Render giao diện
            renderPalette();
            loadQuestion(0);

            // Bắt đầu Timer
            if (mode === 'classic') {
                startClassicTimer(totalTime);
            } else {
                startPacedQuestionTimer(); // Bắt đầu timer cho câu 1
            }

        } catch (err) {
            console.error(err);
            questionText.textContent = "Lỗi tải đề thi. Vui lòng thử lại.";
        }
    }

    // --- 4. RENDER CÂU HỎI ---
    function loadQuestion(index) {
        if (index < 0 || index >= questionsData.length) return;
        currentQuestionIndex = index;

        const q = questionsData[index];
        questionNumDisplay.textContent = `Câu ${index + 1} / ${questionsData.length}`;
        
        // Sử dụng innerHTML với escapeHtml để hiển thị đúng các thẻ như <script>, <article>
        questionText.innerHTML = escapeHtml(q.QuestionText);

        // Render Options
        optionsContainer.innerHTML = '';
        q.choices.forEach(choice => {
            const item = document.createElement('div');
            item.className = 'option-item';
            
            // Check selected
            const currentAns = userAnswers[index].selectedChoiceId;
            if (currentAns === choice._id) item.classList.add('selected');

            // FIX LỖI: Dùng escapeHtml cho choiceText
            item.innerHTML = `
                <input type="radio" name="q_${q._id}" ${currentAns === choice._id ? 'checked' : ''}>
                <span>${escapeHtml(choice.choiceText)}</span>
            `;

            // Click Event
            item.addEventListener('click', () => {
                // Update Data
                userAnswers[index].selectedChoiceId = choice._id;
                
                // Update UI
                const all = optionsContainer.querySelectorAll('.option-item');
                all.forEach(el => {
                    el.classList.remove('selected');
                    el.querySelector('input').checked = false;
                });
                item.classList.add('selected');
                item.querySelector('input').checked = true;

                updatePalette();
            });

            optionsContainer.appendChild(item);
        });

        // Update Button State (Classic Mode)
        if (mode === 'classic') {
            if(btnPrev) btnPrev.disabled = index === 0;
            if(btnNext) btnNext.disabled = index === questionsData.length - 1;
            
            // Highlight Palette
            updatePalette();
        }

        updateReviewButtonState(index);
    }

    // --- 5. LOGIC TIMERS ---
    
    // Timer Tổng (Classic)
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

    // Timer Từng câu (Paced)
    function startPacedQuestionTimer() {
        let timeLeft = timePerQuestion;
        
        // Reset UI Timer
        if(qTimerVal) qTimerVal.textContent = timeLeft;
        if(pacedBarFill) {
            pacedBarFill.style.transition = 'none';
            pacedBarFill.style.width = '100%';
        }

        // Animation Bar (Chờ 1 frame để reset transition)
        setTimeout(() => {
            if(pacedBarFill) {
                pacedBarFill.style.transition = `width ${timePerQuestion}s linear`;
                pacedBarFill.style.width = '0%';
            }
        }, 50);

        // Clear timer cũ nếu có
        if (questionTimerInterval) clearInterval(questionTimerInterval);

        questionTimerInterval = setInterval(() => {
            timeLeft--;
            if(qTimerVal) qTimerVal.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(questionTimerInterval);
                // Hết giờ câu này -> Tự động Next
                handlePacedNext();
            }
        }, 1000);
    }

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

    // --- 6. PALETTE (Danh sách câu hỏi bên phải) ---
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
                // Paced mode: Không cho click nhảy câu lung tung
                item.style.cursor = 'default';
                item.style.pointerEvents = 'none';
            }
            
            paletteContainer.appendChild(item);
        });
        updatePalette();
    }

   function updatePalette() {
        const items = paletteContainer.querySelectorAll('.palette-item');
        items.forEach((item, idx) => {
            item.className = 'palette-item'; // Reset class
            
            // 1. Current (Đang chọn)
            if (idx === currentQuestionIndex) item.classList.add('current');
            
            // 2. Review (Đánh dấu - Ưu tiên hiện màu vàng)
            if (userAnswers[idx].isFlagged) {
                item.classList.add('review');
            } 
            // 3. Answered (Đã làm - Nếu chưa đánh dấu thì hiện màu xanh)
            else if (userAnswers[idx].selectedChoiceId) {
                item.classList.add('answered');
            }
        });
    }

    // --- 7. NỘP BÀI (SUBMIT) ---
    async function submitTest() {
        // Clear all timers
        if(timerInterval) clearInterval(timerInterval);
        if(questionTimerInterval) clearInterval(questionTimerInterval);

        // UI Loading
        mainArea.innerHTML = '<div class="loading-spinner"></div><h3 style="text-align:center;">Đang chấm điểm...</h3>';
        
        try {
            // Chuẩn bị payload đúng format server yêu cầu
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
            alert("Lỗi nộp bài!");
        }
    }

    // --- 8. HIỂN THỊ KẾT QUẢ (GIAO DIỆN MỚI 2 CỘT) ---
    function showResult(result) {
        const testContainer = document.querySelector('.test-container');
        
        // Tính toán màu sắc dựa trên điểm số
        let scoreColor = result.score >= 8 ? '#10b981' : (result.score >= 5 ? '#f59e0b' : '#ef4444');
        
        testContainer.style.height = 'auto';
        testContainer.style.overflow = 'visible';
        testContainer.style.display = 'block';
        
        // HTML Cấu trúc mới: Left (Sticky) + Right (Scroll)
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
                        const detail = result.details.find(d => d.questionId === q._id);
                        const userChoiceId = userAnswers[idx].selectedChoiceId;
                        const correctChoiceId = detail ? detail.correctChoiceId : null;
                        const isCorrect = detail ? detail.isCorrect : false;
                        
                        // Icon trạng thái câu hỏi
                        const statusIcon = isCorrect 
                            ? '<i class="fas fa-check" style="color:#10b981"></i>' 
                            : '<i class="fas fa-times" style="color:#ef4444"></i>';

                        return `
                        <div class="review-item-new ${isCorrect ? 'correct-border' : 'wrong-border'}">
                            <div class="review-header">
                                <span class="q-tag">Câu ${idx + 1}</span>
                                <span class="q-status">${statusIcon}</span>
                            </div>
                            <div class="q-text-new">${escapeHtml(q.QuestionText)}</div>
                            
                            <div class="options-review-new">
                                ${q.choices.map(c => {
                                    let cls = 'opt-review-simple';
                                    let icon = '';

                                    // Logic hiển thị màu đáp án
                                    if (c._id === correctChoiceId) {
                                        cls += ' is-correct-answer'; // Đáp án đúng (Luôn hiện xanh)
                                        icon = '<i class="fas fa-check"></i>';
                                    }
                                    
                                    if (c._id === userChoiceId) {
                                        if (c._id !== correctChoiceId) {
                                            cls += ' is-wrong-choice'; // Chọn sai (Hiện đỏ)
                                            icon = '<i class="fas fa-times"></i>';
                                        } else {
                                            cls += ' is-user-selected'; // Chọn đúng (Đậm hơn)
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

        // Replace toàn bộ nội dung container
        testContainer.innerHTML = html;
        
        // Scroll lên đầu trang
        window.scrollTo(0, 0);
    }
    // Cập nhật giao diện nút Review khi load câu hỏi
    function updateReviewButtonState(index) {
        if (!btnReview) return;
        const isFlagged = userAnswers[index].isFlagged;
        
        if (isFlagged) {
            btnReview.innerHTML = '<i class="fas fa-flag"></i> Bỏ đánh dấu';
            btnReview.classList.add('flagged-active'); // Class CSS mới
        } else {
            btnReview.innerHTML = '<i class="far fa-flag"></i> Đánh dấu';
            btnReview.classList.remove('flagged-active');
        }
    }

    // Sự kiện Click nút Đánh dấu
    if (btnReview) {
        btnReview.addEventListener('click', () => {
            // Đảo ngược trạng thái
            userAnswers[currentQuestionIndex].isFlagged = !userAnswers[currentQuestionIndex].isFlagged;
            
            // Cập nhật UI
            updateReviewButtonState(currentQuestionIndex);
            updatePalette(); // Cập nhật màu vàng bên sidebar
        });
    }

    // --- EVENTS ---
    if(btnPrev) btnPrev.addEventListener('click', () => loadQuestion(currentQuestionIndex - 1));
    
    if(btnNext) btnNext.addEventListener('click', () => {
        if (mode === 'paced') {
            // Paced: Next = Skip thời gian -> Qua câu mới ngay
            clearInterval(questionTimerInterval);
            handlePacedNext();
        } else {
            loadQuestion(currentQuestionIndex + 1);
        }
    });

    if(btnSubmit) btnSubmit.addEventListener('click', () => {
        if(confirm("Bạn muốn nộp bài ngay?")) submitTest();
    });

    // INIT
    initTest();
});