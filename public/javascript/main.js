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
     * Khởi tạo các script cho header (dropdown, menu mobile, modal, logic user).
     */
    const initializeHeaderScripts = () => {
        // --- Các biến và logic cho menu/modal ---
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

        // --- Logic đóng menu/dropdown khi click ra ngoài ---
        window.addEventListener('click', function(event) {
            const activeDropdown = document.querySelector('.dropdown.active');
            if (activeDropdown && !activeDropdown.contains(event.target)) {
                activeDropdown.classList.remove('active');
            }

            if (navWrapper && navWrapper.classList.contains('active') && !navWrapper.contains(event.target) && hamburgerBtn && !hamburgerBtn.contains(event.target)) {
                navWrapper.classList.remove('active');
            }
        });

        // ==================================================
        // LOGIC KIỂM TRA USER VÀ ĐĂNG XUẤT (GỘP TỪ MAIN 2)
        // ==================================================
        const userContainer = document.getElementById('user-session-container');
        const storedUser = localStorage.getItem('currentUser'); // Lấy user từ bộ nhớ

        if (storedUser && userContainer) {
            // 1. NẾU CÓ USER (Đã đăng nhập)
            try {
                const user = JSON.parse(storedUser); // Đọc user
                
                // Thay thế HTML bằng avatar và tên
                userContainer.innerHTML = `
                    <a href="/pages/profile.html" class="user-profile-link">
                        <img src="${user.avatarUrl || '/images/default-avatar.png'}" alt="Avatar" class="header-avatar">
                        <span>${user.username}</span>
                    </a>
                    <a href="#" id="logout-btn" class="nav-link">Đăng xuất</a>
                `;

                // Gắn sự kiện cho nút Đăng xuất
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        localStorage.removeItem('currentUser'); // Xóa user
                        alert('Bạn đã đăng xuất.');
                        window.location.href = '/'; // Tải lại trang chủ
                    });
                }
            } catch (e) {
                console.error("Lỗi đọc user:", e);
                localStorage.removeItem('currentUser'); // Xóa data lỗi
            }
        }
    };

    /**
     * Khởi tạo slideshow.
     */
    const initializeSlideshow = () => {
        const slides = document.getElementsByClassName("slide");
        if (slides.length === 0) return; // Không làm gì nếu không có slide

        let slideIndex = 1; 
        let slideInterval;

        const showSlide = (n) => {
            if (n > slides.length) { slideIndex = 1; } 
            else if (n < 1) { slideIndex = slides.length; } 
            else { slideIndex = n; }

            for (let i = 0; i < slides.length; i++) {
                slides[i].style.display = "none";
            }

            slides[slideIndex - 1].style.display = "block";
        };

        const startSlideShow = () => {
            clearInterval(slideInterval); 
            slideInterval = setInterval(() => {
                showSlide(slideIndex + 1);
            }, 5000);
        };
        
        window.plusSlides = (n) => {
            showSlide(slideIndex + n);
            startSlideShow(); 
        };
        
        showSlide(slideIndex);
        startSlideShow();
    };

    /**
     * Khởi tạo chức năng chuyển tab.
     */
    const initializeTabs = () => {
        const tabButtons = document.querySelectorAll('.tab-btn');
        if (tabButtons.length === 0) return; // Không làm gì nếu không có tab

        const tabPanes = document.querySelectorAll('.tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');

                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));

                button.classList.add('active');
                const targetPane = document.getElementById(targetTab);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });
    };
    
    /**
     * Khởi tạo các thanh trượt âm lượng (trong modal settings).
     */
    const initializeVolumeSliders = () => {
        const setupSlider = (sliderId, valueId) => {
            const slider = document.getElementById(sliderId);
            const valueDisplay = document.getElementById(valueId);
            if (slider && valueDisplay) {
                // Hiển thị giá trị ban đầu
                valueDisplay.textContent = slider.value;
                // Cập nhật khi trượt
                slider.addEventListener('input', function() {
                    valueDisplay.textContent = this.value;
                });
            }
        };

        setupSlider('bg-music-volume', 'bg-music-value');
        setupSlider('sound-effects-volume', 'sound-effects-value');
    };
    

    // --- KHỞI CHẠY CÁC CHỨC NĂNG ---

    // 1. Tải Header, SAU ĐÓ chạy các script liên quan đến header
    loadComponent('/pages/header.html', 'header-placeholder', () => {
        initializeHeaderScripts();   // Chứa menu, modal, VÀ logic user
        initializeVolumeSliders();   // Chạy sau khi modal settings được tải
    });
    
    // 2. Tải Footer
    loadComponent('/pages/footer.html', 'footer-placeholder');

    // 3. Khởi tạo các script CHỈ DÀNH CHO TRANG CHỦ
    // (Những hàm này sẽ tự kiểm tra xem element có tồn tại hay không)
    initializeSlideshow();
    initializeTabs();
    
}); // Hết DOMContentLoaded

window.addEventListener("scroll", function() {
    const header = document.querySelector(".main-header");
    // Cần kiểm tra header có tồn tại không, vì nó được load bất đồng bộ
    if (header) { 
        if (window.scrollY > 50) { // scroll 50px thì dính
            header.classList.add("sticky");
        } else {
            header.classList.remove("sticky");
        }
    }
});