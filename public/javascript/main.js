document.addEventListener("DOMContentLoaded", function() {

    // --- KIỂM TRA QUYỀN ADMIN ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (currentUser && currentUser.role === 'admin') {
        window.location.replace('/pages/admin.html'); 
    }

    // --- CẤU HÌNH NHẠC & DATABASE ---
    const BACKGROUND_MUSIC_KEY = 'devarena_bg_music_enabled';
    const BACKGROUND_MUSIC_TIME_KEY = 'devarena_bg_music_current_time';

    const backgroundMusic = new Audio('../audio/background_quiz.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.5;

    const savedTime = sessionStorage.getItem(BACKGROUND_MUSIC_TIME_KEY);
    if (savedTime) {
        backgroundMusic.currentTime = parseFloat(savedTime);
    }

    let isMusicEnabled;
    const storedMusicState = localStorage.getItem(BACKGROUND_MUSIC_KEY);

    if (storedMusicState === null) {
        isMusicEnabled = false;
        localStorage.setItem(BACKGROUND_MUSIC_KEY, "false");
    } else {
        isMusicEnabled = storedMusicState === "true";
    }

    if (isMusicEnabled) {
        const playPromise = backgroundMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                console.log("Auto-play blocked, waiting for interaction.");
            });
        }
    }

    window.addEventListener("beforeunload", () => {
        if (isMusicEnabled) {
            localStorage.setItem(BACKGROUND_MUSIC_TIME_KEY, backgroundMusic.currentTime);
        } else {
            localStorage.removeItem(BACKGROUND_MUSIC_TIME_KEY);
        }
    });

    // Mock User ID & DB
    let CURRENT_USER_ID = 106;

    const mockUserSettings = [
        { UserID: 101, BackgroundMusic: true, SoundEffects: true, TimerPerQuestion: false, DefaultNumQuestions: 10, TestTimer: 15 },
        { UserID: 106, BackgroundMusic: true, SoundEffects: true, TimerPerQuestion: false, DefaultNumQuestions: 10, TestTimer: 15 }
    ];

    function fetchUserSettings(userId) {
        return new Promise(resolve => {
            setTimeout(() => {
                const settings = mockUserSettings.find(s => s.UserID === userId);
                resolve(settings || { BackgroundMusic: true, SoundEffects: true, TimerPerQuestion: false, DefaultNumQuestions: 10, TestTimer: 15 });
            }, 100);
        });
    }

    function saveUserSettings(userId, settings) {
        console.log(`[DB] Settings saved for User ${userId}:`, settings);
        const index = mockUserSettings.findIndex(s => s.UserID === userId);
        if (index > -1) Object.assign(mockUserSettings[index], settings);
        return Promise.resolve();
    }

    function toggleBackgroundMusic(isEnabled) {
        isMusicEnabled = isEnabled;
        localStorage.setItem(BACKGROUND_MUSIC_KEY, isEnabled ? "true" : "false");

        if (isEnabled) {
            const savedTime = localStorage.getItem(BACKGROUND_MUSIC_TIME_KEY);
            if (savedTime) backgroundMusic.currentTime = parseFloat(savedTime);
            
            const play = backgroundMusic.play();
            if (play) play.catch(() => console.warn("Waiting for interaction"));
        } else {
            backgroundMusic.pause();
        }
    }

    function getCurrentSettingsFromUI() {
        return {
            BackgroundMusic: document.getElementById('bg-music')?.checked ?? isMusicEnabled,
            SoundEffects: document.getElementById('sound-effects')?.checked ?? true,
            TimerPerQuestion: document.getElementById('question-timer')?.checked ?? false,
            DefaultNumQuestions: parseInt(document.getElementById('num-questions')?.value ?? 10),
            TestTimer: parseInt(document.getElementById('total-time')?.value ?? 15)
        };
    }

    document.addEventListener("click", function once() {
        if (isMusicEnabled && backgroundMusic.paused) {
            toggleBackgroundMusic(true);
        }
        document.removeEventListener("click", once);
    });

    // --- CÁC HÀM UI CHÍNH ---

    const loadComponent = (url, elementId, callback) => {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Status: ${response.status}`);
                return response.text();
            })
            .then(data => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.innerHTML = data;
                    if (callback) callback();
                }
            })
            .catch(error => console.error('Load Error:', error));
    };

    const initializeHeaderScripts = () => {
       
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const navWrapper = document.getElementById('nav-wrapper');
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const settingsOverlay = document.getElementById('settings-overlay');
        const closeModalBtn = document.getElementById('close-modal-btn');

        // Logic Hamburger Menu cho Mobile
        if (hamburgerBtn && navWrapper) {
            hamburgerBtn.addEventListener('click', function(event) {
                event.stopPropagation();
                navWrapper.classList.toggle('active');
            });
        }

        const openSettingsModal = () => {
            if (settingsModal && settingsOverlay) {
                settingsModal.classList.add('active');
                settingsOverlay.classList.add('active');
            }
        };

        const closeSettingsModal = () => {
            if (settingsModal && settingsOverlay) {
                settingsModal.classList.remove('active');
                settingsOverlay.classList.remove('active');
            }
        };

        if (settingsBtn && settingsModal && settingsOverlay && closeModalBtn) {
            settingsBtn.addEventListener('click', function(event) {
                event.preventDefault();
                openSettingsModal();
            });
            closeModalBtn.addEventListener('click', closeSettingsModal);
            settingsOverlay.addEventListener('click', closeSettingsModal);
        }

        window.addEventListener('click', function(event) {
            if (navWrapper && navWrapper.classList.contains('active') && !navWrapper.contains(event.target) && hamburgerBtn && !hamburgerBtn.contains(event.target)) {
                navWrapper.classList.remove('active');
            }
        });

        // User Session & Logout
        const userContainer = document.getElementById('user-session-container');
        const storedUser = localStorage.getItem('currentUser'); 

        if (storedUser && userContainer) {
            try {
                const user = JSON.parse(storedUser);
                if (user.UserID) CURRENT_USER_ID = user.UserID;

                // Cấu trúc HTML khi đã đăng nhập
                userContainer.innerHTML = `
                    <a href="/pages/profile.html" class="user-profile-link">
                        <img src="${user.avatarUrl || '/images/user_icon.png'}" alt="Avatar" class="header-avatar">
                        <span>${user.username}</span>
                    </a>
                    <a href="#" id="logout-btn">Đăng xuất</a>
                `;

                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        localStorage.removeItem('currentUser');
                        localStorage.removeItem(BACKGROUND_MUSIC_KEY);
                        localStorage.removeItem(BACKGROUND_MUSIC_TIME_KEY);
                        alert('Bạn đã đăng xuất.');
                        window.location.replace('/');
                    });
                }
            } catch (e) {
                console.error("User parse error:", e);
                localStorage.removeItem('currentUser');
            }
        }
    };

    const initializeUserSettings = () => {
        const ids = [ "bg-music", "sound-effects", "question-timer", "num-questions", "total-time" ];

        const handleSettingChange = function () {
            const allSettings = getCurrentSettingsFromUI();
            saveUserSettings(CURRENT_USER_ID, allSettings);
            if (this.id === "bg-music") toggleBackgroundMusic(this.checked);
        };

        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener("change", handleSettingChange);
        });

        const applySettingsToUI = (settings) => {
            const bgMusicEl = document.getElementById('bg-music');
            if(bgMusicEl) bgMusicEl.checked = isMusicEnabled;
            
            const soundEffectsEl = document.getElementById('sound-effects');
            if(soundEffectsEl) soundEffectsEl.checked = settings.SoundEffects;
            
            const questionTimerEl = document.getElementById('question-timer');
            if(questionTimerEl) questionTimerEl.checked = settings.TimerPerQuestion;
            
            const numQuestionsEl = document.getElementById('num-questions');
            if(numQuestionsEl) numQuestionsEl.value = settings.DefaultNumQuestions;
            
            const totalTimeEl = document.getElementById('total-time');
            if(totalTimeEl) totalTimeEl.value = settings.TestTimer;
        };

        const loadUserSettings = async () => {
            const settings = await fetchUserSettings(CURRENT_USER_ID);
            applySettingsToUI(settings);
        };

        loadUserSettings();
    };

    const initializeSlideshow = () => {
        const slides = document.getElementsByClassName("slide");
        if (slides.length === 0) return;

        let slideIndex = 1;
        let slideInterval;

        const showSlide = (n) => {
            if (n > slides.length) slideIndex = 1;
            else if (n < 1) slideIndex = slides.length;
            else slideIndex = n;

            for (let i = 0; i < slides.length; i++) slides[i].style.display = "none";
            slides[slideIndex - 1].style.display = "block";
        };

        const startSlideShow = () => {
            clearInterval(slideInterval);
            slideInterval = setInterval(() => showSlide(slideIndex + 1), 5000);
        };

        window.plusSlides = (n) => {
            showSlide(slideIndex + n);
            startSlideShow();
        };

        showSlide(slideIndex);
        startSlideShow();
    };

    const initializeTabs = () => {
        const tabButtons = document.querySelectorAll('.tab-btn');
        if (tabButtons.length === 0) return;

        const tabPanes = document.querySelectorAll('.tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                button.classList.add('active');
                const targetPane = document.getElementById(targetTab);
                if (targetPane) targetPane.classList.add('active');
            });
        });
    };

    const initializeVolumeSliders = () => {
        const setupSlider = (sliderId, valueId) => {
            const slider = document.getElementById(sliderId);
            const valueDisplay = document.getElementById(valueId);
            if (slider && valueDisplay) {
                valueDisplay.textContent = slider.value;
                slider.addEventListener('input', function() {
                    valueDisplay.textContent = this.value;
                });
            }
        };
        setupSlider('bg-music-volume', 'bg-music-value');
        setupSlider('sound-effects-volume', 'sound-effects-value');
    };

     //Thay đổi đường dẫn khi đã đăng nhập
    const updateHeroButton = () => {
        const heroBtn = document.getElementById('hero-cta-btn');
        const storedUser = localStorage.getItem('currentUser'); // Kiểm tra xem đã đăng nhập chưa

        if (heroBtn && storedUser) {
            heroBtn.href = '/pages/topic.html'; 
            heroBtn.innerHTML = 'Khám phá ngay <i class="fa-solid fa-chevron-right"></i>';
        }
        
    };

    updateHeroButton();

    // --- KHỞI CHẠY ---
    loadComponent('/pages/header.html', 'header-placeholder', () => {
        initializeHeaderScripts();
        initializeUserSettings();
        initializeVolumeSliders();
    });

    loadComponent('/pages/footer.html', 'footer-placeholder');
    initializeSlideshow();
    initializeTabs();
     
});

window.addEventListener("scroll", function() {
    const header = document.querySelector(".main-header");
    if (header) {
        if (window.scrollY > 50) header.classList.add("sticky");
        else header.classList.remove("sticky");
    }
});



