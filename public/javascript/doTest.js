document.addEventListener('DOMContentLoaded', () => {
    // --- KHỞI TẠO TONE.JS VÀ ÂM THANH ---
    let synth = null;
    let clickListenerAdded = false;

    const SOUND_FREQ_NAV = { freq: "C4", duration: "32n" }; // Trầm hơn, nhẹ nhàng hơn

    function initializeAudio() {
        if (!synth) {
            Tone.start();
            
            synth = new Tone.Synth({
                oscillator: {
                    type: "sine" // Sóng Sine cho âm thanh mượt mà, dịu tai
                }
            }).toDestination();
            console.log("Tone.js AudioContext đã khởi tạo.");
        }
    }

    function playNavigationSound() {
        const isSfxOn = localStorage.getItem('devarena_sfx_enabled') === 'true';
        if (!isSfxOn) return;
        
        initializeAudio();
        if (synth) {
            synth.triggerAttackRelease(SOUND_FREQ_NAV.freq, SOUND_FREQ_NAV.duration);
        }
    }

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
    const mode = urlParams.get('mode') || 'classic'; // 'classic' hoặc 'paced'
    const totalTime = parseInt(urlParams.get('totalTime')) || 900; // Mặc định 15 phút
    const timePerQuestion = parseInt(urlParams.get('timePerQuestion')) || 60; // Mặc định 60s/câu

    // 1.2 State Global (Biến lưu trạng thái)
    let questionsData = [];      // Chứa danh sách câu hỏi
    let userAnswers = [];        // Lưu đáp án user
    let currentQuestionIndex = 0;// Chỉ số câu hiện tại
    let timerInterval = null;    // Timer tổng
    let questionTimerInterval = null; // Timer từng câu (Paced)
    
    // --- [NEW FEATURE from doTest2]: State thời gian & User ---
    let startTime = Date.now();  // Thời điểm bắt đầu
    let userId = null;
    let userName = "Thí sinh tự do"; // Tên mặc định

    // 1.3 Lấy thông tin User từ LocalStorage (Logic của doTest2)
    const userDataString = localStorage.getItem('currentUser');
    if (userDataString) {
        try {
            const userBasic = JSON.parse(userDataString);
            userId = userBasic._id;
            userName = userBasic.username || userBasic.email || "DevArena User";
            
            // Fix ID 20 ký tự (Logic từ doTest2)
            if (userId && userId.length === 20) {
                 userId = userId + "0000"; 
            }
        } catch (e) {
            console.error("Lỗi parse currentUser:", e);
        }
    }

    // 1.4 DOM Elements (Các phần tử giao diện)
    // --- CŨ ---
    const testTitle = document.getElementById('test-title-display');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const questionNumDisplay = document.getElementById('question-number-display');
    const paletteContainer = document.getElementById('question-palette');
    const mainArea = document.querySelector('.question-area');
    
    // Buttons nav
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnSubmit = document.getElementById('btn-submit');
    const btnReview = document.getElementById('btn-review');

    // UI Mode elements
    const classicTimerBox = document.getElementById('classic-timer-box');
    const classicLegend = document.getElementById('classic-legend');
    const pacedProgressBar = document.getElementById('paced-progress-bar-container');
    const pacedBarFill = document.getElementById('paced-progress-bar');
    const questionTimerBadge = document.getElementById('question-timer-badge');
    const qTimerVal = document.getElementById('q-timer-val');

    // --- [NEW UI ELEMENTS] ---
    const codeBlock = document.getElementById('question-code-block'); // Khu vực code
    const modalSubmit = document.getElementById('submit-confirm-modal'); // Modal nộp bài
    const btnModalConfirm = document.getElementById('btn-confirm-submit-modal'); // Nút OK trong modal
    const candidateNameEl = document.querySelector('.candidate-info h4'); // Tên thí sinh
    const candidateIdEl = document.querySelector('.candidate-info p'); // ID thí sinh
    const toolBtns = document.querySelectorAll('.tool-btn'); // Các nút toolbar

    const btnReport = document.getElementById('btn-icon-only');

    if (!clickListenerAdded) {
        document.body.addEventListener('click', initializeAudio, { once: true });
        clickListenerAdded = true;
    }

    /* =========================================
       PHẦN 2: CÁC HÀM HELPER (HỖ TRỢ)
       ========================================= */

    function escapeHtml(text) {
        if (!text) return "";
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function processImageUrl(rawUrl) {
        if (!rawUrl) return "";
        let imageUrl = rawUrl.replace(/\\/g, '/');
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

    async function initTest() {
        if (!categoryId) {
            alert("Thiếu thông tin bài thi (CategoryId)!");
            window.location.replace("/");
            return;
        }

        // Cập nhật thông tin thí sinh lên giao diện (New Logic)
        if (candidateNameEl) candidateNameEl.textContent = userName;
        if (candidateIdEl && userId) candidateIdEl.textContent = `ID: #${userId.substring(0, 6)}...`;

        setupUIMode();
        await generateTest();
    }

    function setupUIMode() {
        if (mode === 'paced') {
            testTitle.textContent = "Thử thách tốc độ";
            if(classicTimerBox) classicTimerBox.style.display = 'none';
            if(classicLegend) classicLegend.style.display = 'none';
            if(btnPrev) btnPrev.style.display = 'none'; 
            if(btnReview) btnReview.style.display = 'none'; 
            
            if(pacedProgressBar) pacedProgressBar.style.display = 'block';
            if(questionTimerBadge) questionTimerBadge.style.display = 'inline-block';
            if(btnNext) btnNext.textContent = "Câu tiếp >>";
        } else {
            testTitle.textContent = "Bài thi tiêu chuẩn";
            if(classicTimerBox) classicTimerBox.style.display = 'block';
            if(classicLegend) classicLegend.style.display = 'flex';
        }
    }

    /* =========================================
       PHẦN 4: LOGIC LẤY DATA VÀ RENDER
       ========================================= */

    async function generateTest() {
        try {
            const url = `/api/test/generate?categoryId=${categoryId}&limit=${limit}&difficulty=${difficulty}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Lỗi tạo đề thi từ Server");

            const data = await res.json();
            questionsData = data.questions;

            // Nếu server trả về Title, cập nhật luôn
            if (data.title) testTitle.textContent = data.title;

            if (!questionsData || questionsData.length === 0) {
                alert("Không đủ câu hỏi trong kho dữ liệu!");
                window.location.replace("/");
                return;
            }

            userAnswers = questionsData.map(q => ({
                questionId: q._id,
                selectedChoiceId: null, 
                isFlagged: false 
            }));

            renderPalette();
            loadQuestion(0);

            // [New Logic] Reset thời gian bắt đầu chính xác sau khi tải xong
            startTime = Date.now();

            if (mode === 'classic') {
                startClassicTimer(totalTime);
            } else {
                startPacedQuestionTimer();
            }

        } catch (err) {
            console.error(err);
            if(questionText) questionText.textContent = "Lỗi tải đề thi. Vui lòng kiểm tra kết nối mạng.";
        }
    }

    function loadQuestion(index) {
        if (index < 0 || index >= questionsData.length) return;
        currentQuestionIndex = index;

        const q = questionsData[index];
        questionNumDisplay.textContent = `Câu ${index + 1} / ${questionsData.length}`;
        
        // 1. Text
        questionText.innerHTML = escapeHtml(q.QuestionText);

        // 2. Image
        const imgEl = document.getElementById('question-image');
        if (imgEl) {
            if (q.Image) {
                const imageUrl = processImageUrl(q.Image);
                imgEl.src = imageUrl;
                imgEl.style.display = 'block';
            } else {
                imgEl.style.display = 'none';  
                imgEl.src = "";
            }
        }

        // 3. [NEW] Code Block (Nếu có trường Code snippet trong DB - mô phỏng)
        // Giả sử API trả về q.CodeSnippet. Nếu không có thì ẩn.
        if (codeBlock) {
            if (q.CodeSnippet) {
                codeBlock.style.display = 'block';
                codeBlock.querySelector('code').textContent = q.CodeSnippet;
            } else {
                codeBlock.style.display = 'none';
            }
        }

        // 4. Options
        optionsContainer.innerHTML = '';
        q.choices.forEach(choice => {
            const item = document.createElement('div');
            item.className = 'option-item';
            
            const currentAns = userAnswers[index].selectedChoiceId;
            if (currentAns === choice._id) item.classList.add('selected');

            item.innerHTML = `
                <input type="radio" name="q_${q._id}" ${currentAns === choice._id ? 'checked' : ''}>
                <span>${escapeHtml(choice.choiceText)}</span>
            `;

            item.addEventListener('click', () => {
                userAnswers[index].selectedChoiceId = choice._id;
                
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

        // 5. Buttons state
        if (mode === 'classic') {
            if(btnPrev) btnPrev.disabled = index === 0;
            if(btnNext) btnNext.disabled = index === questionsData.length - 1;
            updatePalette();
        }

        if (btnReport) {
            btnReport.classList.remove('reported'); 
            btnReport.disabled = false; 
            btnReport.title = "Báo cáo câu hỏi lỗi"; 
        }

        updateReviewButtonState(index);
    }

    /* =========================================
       PHẦN 5: LOGIC TIMERS
       ========================================= */
    
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

    function startPacedQuestionTimer() {
        let timeLeft = timePerQuestion;
        
        if(qTimerVal) qTimerVal.textContent = timeLeft;
        if(pacedBarFill) {
            pacedBarFill.style.transition = 'none';
            pacedBarFill.style.width = '100%';
        }

        setTimeout(() => {
            if(pacedBarFill) {
                pacedBarFill.style.transition = `width ${timePerQuestion}s linear`;
                pacedBarFill.style.width = '0%';
            }
        }, 50);

        if (questionTimerInterval) clearInterval(questionTimerInterval);

        questionTimerInterval = setInterval(() => {
            timeLeft--;
            if(qTimerVal) qTimerVal.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(questionTimerInterval);
                handlePacedNext();
            }
        }, 1000);
    }

    function handlePacedNext() {
        if (currentQuestionIndex < questionsData.length - 1) {
            loadQuestion(currentQuestionIndex + 1);
            startPacedQuestionTimer();
            playNavigationSound();

        } else {
            clearInterval(questionTimerInterval);
            alert("Đã hoàn thành tất cả câu hỏi!");
            submitTest();
        }
    }

    /* =========================================
       PHẦN 6: PALETTE
       ========================================= */
    
    function renderPalette() {
        if (!paletteContainer) return;
        paletteContainer.innerHTML = '';
        
        questionsData.forEach((q, idx) => {
            const item = document.createElement('div');
            item.className = 'palette-item';
            item.textContent = idx + 1;
            
            if (mode === 'classic') {
                item.addEventListener('click', () => {
                    if (idx !== currentQuestionIndex) {
                        loadQuestion(idx);
                        playNavigationSound(); 
                    }
                });
            } else {
                item.style.cursor = 'default';
                item.style.pointerEvents = 'none';
                item.style.opacity = '0.5';
            }
            
            paletteContainer.appendChild(item);
        });
        updatePalette();
    }

    function updatePalette() {
        const items = paletteContainer.querySelectorAll('.palette-item');
        items.forEach((item, idx) => {
            item.className = 'palette-item';
            if (idx === currentQuestionIndex) item.classList.add('current');
            if (userAnswers[idx].isFlagged) {
                item.classList.add('review');
            } else if (userAnswers[idx].selectedChoiceId) {
                item.classList.add('answered');
            }
        });
    }

    /* =========================================
       PHẦN 7: NỘP BÀI & XỬ LÝ KẾT QUẢ
       ========================================= */

    async function submitTest() {
        if(timerInterval) clearInterval(timerInterval);
        if(questionTimerInterval) clearInterval(questionTimerInterval);
        
        // Ẩn modal nếu đang mở
        if (modalSubmit) modalSubmit.style.display = 'none';

        // 1. [Updated from doTest2] Tính thời gian làm bài
        const endTime = Date.now();
        const timeSpent = Math.floor((endTime - startTime) / 1000);

        // Hiển thị loading
        mainArea.innerHTML = '<div class="loading-spinner"></div><h3 style="text-align:center;">Đang chấm điểm...</h3>';
        
        try {
            // 2. [Updated from doTest2] Payload đầy đủ hơn
            const payload = { 
                userAnswers: userAnswers,
                userId: userId,           
                categoryId: categoryId,   
                mode: mode,               
                timeTaken: timeSpent      
            };

            const res = await fetch('/api/test/submit-dynamic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Lỗi nộp bài");
            
            const result = await res.json();
            // Truyền thêm timeSpent vào hàm hiển thị
            showResult(result, timeSpent);

        } catch (err) {
            console.error(err);
            alert("Có lỗi xảy ra khi nộp bài: " + err.message);
        }
    }

    /**
     * Hiển thị kết quả (Kết hợp giao diện chi tiết cũ + stats mới từ doTest2)
     */
    function showResult(result, timeSpent) {
        const testContainer = document.querySelector('.test-container');
        
        // Màu sắc điểm số
        let scoreColor = result.score >= 8 ? '#10b981' : (result.score >= 5 ? '#f59e0b' : '#ef4444');
        
        // Tính toán phút giây hiển thị (Logic từ doTest2)
        const minutes = Math.floor(timeSpent / 60);
        const seconds = timeSpent % 60;

        // Reset style container
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
                        <div class="stat-row">
                            <span><i class="fas fa-clock" style="color:#3498db"></i> Thời gian:</span>
                            <strong>${minutes}p ${seconds}s</strong>
                        </div>
                        <hr>
                        ${userId ? `<a href="/profile" class="btn-home-mini" style="background-color: #3498db;"><i class="fas fa-user"></i> Lịch sử bài làm</a>` : ''}
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
                        
                        const statusIcon = isCorrect 
                            ? '<i class="fas fa-check" style="color:#10b981"></i>' 
                            : '<i class="fas fa-times" style="color:#ef4444"></i>';

                        let imageHtml = '';
                        if (q.Image) {
                            const imageUrl = processImageUrl(q.Image);
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
                            
                            ${imageHtml} 
                            
                            <div class="options-review-new">
                                ${q.choices.map(c => {
                                    let cls = 'opt-review-simple';
                                    let icon = '';

                                    if (c._id === correctChoiceId) {
                                        cls += ' is-correct-answer'; 
                                        icon = '<i class="fas fa-check"></i>';
                                    }
                                    
                                    if (c._id === userChoiceId) {
                                        if (c._id !== correctChoiceId) {
                                            cls += ' is-wrong-choice'; 
                                            icon = '<i class="fas fa-times"></i>';
                                        } else {
                                            cls += ' is-user-selected'; 
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

        testContainer.innerHTML = html;
        window.scrollTo(0, 0);
    }

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

    // 1. Navigation & Flag (Giữ nguyên)
    if (btnReview) {
        btnReview.addEventListener('click', () => {
            userAnswers[currentQuestionIndex].isFlagged = !userAnswers[currentQuestionIndex].isFlagged;
            updateReviewButtonState(currentQuestionIndex);
            updatePalette();
        });
    }

    if(btnPrev) btnPrev.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            loadQuestion(currentQuestionIndex - 1);
            playNavigationSound(); 
        }
    });
    
    if(btnNext) btnNext.addEventListener('click', () => {
        if (mode === 'paced') {
            clearInterval(questionTimerInterval);
            handlePacedNext();
        } else {
            loadQuestion(currentQuestionIndex + 1);
            playNavigationSound();
        }
    });

    // 2. Submit Logic [CHANGED: Use Modal instead of confirm()]
    if(btnSubmit) {
        btnSubmit.addEventListener('click', (e) => {
            e.preventDefault();
            // Nếu có modal thì hiện modal, không thì dùng confirm cũ
            if (modalSubmit) {
                modalSubmit.style.display = 'flex';
            } else {
                if(confirm("Bạn có chắc chắn muốn nộp bài ngay không?")) submitTest();
            }
        });
    }

    // [New] Sự kiện cho nút Confirm trong Modal
    if (btnModalConfirm) {
        btnModalConfirm.addEventListener('click', () => {
            submitTest();
        });
    }

    // 3. Toolbar Events [New]
    if (toolBtns && toolBtns.length > 0) {
        // Nút 0: Font Size (Demo)
        toolBtns[0].addEventListener('click', () => {
            const currentSize = parseFloat(window.getComputedStyle(document.body).fontSize);
            if (currentSize < 20) {
                document.body.style.fontSize = (currentSize + 1) + 'px';
            } else {
                document.body.style.fontSize = '16px'; // Reset logic đơn giản
            }
        });

        // Nút 2: Exit
        if(toolBtns[1]) {
            toolBtns[1].addEventListener('click', () => {
                if(confirm("Thoát bài thi? Kết quả sẽ không được lưu.")) {
                    window.location.href = "/";
                }
            });
        }
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

            if (btnReport.classList.contains('reported')) {
                return; 
            }

            if (!confirm("Bạn có chắc muốn báo cáo câu hỏi này có vấn đề không?")) return;

            // 3. Gọi API
            try {
                const currentQId = questionsData[currentQuestionIndex]._id;

                const res = await fetch('/api/questions/report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        questionId: currentQId, 
                        userId: userId
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    alert("✅ " + data.message);
                    btnReport.classList.add('reported');
                } else {
                    alert("⚠️ " + data.message);
                    if (data.message && data.message.includes("đã báo cáo")) {
                         btnReport.classList.add('reported');
                    }
                }

            } catch (err) {
                console.error(err);
                alert("Lỗi kết nối server.");
            }
        });
    }

    // KHỞI CHẠY ỨNG DỤNG
    initTest();
});