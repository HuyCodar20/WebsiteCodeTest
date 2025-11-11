document.addEventListener("DOMContentLoaded", function() {

    /**
     * Tải một thành phần HTML từ một URL và chèn vào một element.
     * @param {string} url - Đường dẫn đến file HTML.
     * @param {string} elementId - ID của element để chèn nội dung vào.
     * @param {Function} [callback] - Hàm sẽ được gọi sau khi tải thành công.
     */
    const loadComponent = (url, elementId, callback) => {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Không thể tải ${url}. Trạng thái: ${response.status}`);
                return response.text();
            })
            .then(data => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.innerHTML = data;
                    if (callback) callback();
                }
            })
            .catch(error => console.error('Lỗi khi tải thành phần:', error));
    };

    /**
     * Khởi tạo các script cho header (dropdown, menu mobile, modal settings).
     */
    const initializeHeaderScripts = () => {
        // --- Các biến và logic cũ ---
        const categoryBtn = document.getElementById('category-btn');
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const navWrapper = document.getElementById('nav-wrapper');
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const settingsOverlay = document.getElementById('settings-overlay');
        const closeModalBtn = document.getElementById('close-modal-btn');

        if (categoryBtn) {
            const dropdown = categoryBtn.closest('.dropdown');
            categoryBtn.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                dropdown.classList.toggle('active');
            });
        }

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
            const activeDropdown = document.querySelector('.dropdown.active');
            if (activeDropdown && !activeDropdown.contains(event.target)) {
                activeDropdown.classList.remove('active');
            }

            if (navWrapper && navWrapper.classList.contains('active') && !navWrapper.contains(event.target) && !hamburgerBtn.contains(event.target)) {
                navWrapper.classList.remove('active');
            }
        });
    };

    /**
     * Khởi tạo slideshow.
     */
    const initializeSlideshow = () => {
        const slides = document.getElementsByClassName("slide");
        if (slides.length === 0) return;

        let slideIndex = 1; // Bắt đầu từ slide đầu tiên
        let slideInterval;

        const showSlide = (n) => {
            // Xử lý vòng lặp index
            if (n > slides.length) { slideIndex = 1; } 
            else if (n < 1) { slideIndex = slides.length; } 
            else { slideIndex = n; }

            // Ẩn tất cả các slide
            for (let i = 0; i < slides.length; i++) {
                slides[i].style.display = "none";
            }

            // Hiển thị slide hiện tại
            slides[slideIndex - 1].style.display = "block";
        };

        const startSlideShow = () => {
            clearInterval(slideInterval); // Xóa interval cũ trước khi tạo mới
            slideInterval = setInterval(() => {
                showSlide(slideIndex + 1);
            }, 5000);
        };
        
        // Gán hàm plusSlides ra window để HTML có thể gọi
        window.plusSlides = (n) => {
            showSlide(slideIndex + n);
            startSlideShow(); // Khởi động lại timer sau khi người dùng nhấn
        };
        
        // Bắt đầu slideshow
        showSlide(slideIndex);
        startSlideShow();
    };

    /**
     * Khởi tạo chức năng chuyển tab.
     */
    const initializeTabs = () => {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');

                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));

                button.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
            });
        });
    };
    
    /**
     * Khởi tạo các thanh trượt âm lượng.
     */
    const initializeVolumeSliders = () => {
        const setupSlider = (sliderId, valueId) => {
            const slider = document.getElementById(sliderId);
            const valueDisplay = document.getElementById(valueId);
            if (slider && valueDisplay) {
                slider.addEventListener('input', function() {
                    valueDisplay.textContent = this.value;
                });
            }
        };

        setupSlider('bg-music-volume', 'bg-music-value');
        setupSlider('sound-effects-volume', 'sound-effects-value');
    };
    
    /**
     * Lắng nghe các sự kiện click toàn cục để đóng menu/dropdown.
     */
    const initializeGlobalClickListeners = () => {
        const navWrapper = document.getElementById('nav-wrapper');
        const hamburgerBtn = document.getElementById('hamburger-btn');

        window.addEventListener('click', function(event) {
            // Đóng dropdown khi click ra ngoài
            const activeDropdown = document.querySelector('.dropdown.active');
            if (activeDropdown && !activeDropdown.contains(event.target)) {
                activeDropdown.classList.remove('active');
            }

            // Đóng nav-wrapper (menu mobile) khi click ra ngoài
            if (navWrapper && navWrapper.classList.contains('active') && 
                !navWrapper.contains(event.target) && 
                !hamburgerBtn.contains(event.target)) {
                navWrapper.classList.remove('active');
            }
        });
    };


    // --- KHỞI CHẠY CÁC CHỨC NĂNG ---

    loadComponent('/pages/header.html', 'header-placeholder', () => {
        initializeHeaderScripts();
        initializeGlobalClickListeners();
        initializeVolumeSliders();
    });
    loadComponent('/pages/footer.html', 'footer-placeholder');

    initializeSlideshow();
    initializeTabs();
    
});

window.addEventListener("scroll", function() {
  const header = document.querySelector(".main-header");
  if (window.scrollY > 50) { // scroll 50px thì dính
    header.classList.add("sticky");
  } else {
    header.classList.remove("sticky");
  }
});

