document.addEventListener("DOMContentLoaded", function() {

    const initializeHeaderScripts = () => {
        const categoryBtn = document.getElementById('category-btn');
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const navWrapper = document.getElementById('nav-wrapper');
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const settingsOverlay = document.getElementById('settings-overlay');
        const closeModalBtn = document.getElementById('close-modal-btn');

        // (Code xử lý dropdown, hamburger, modal của bạn giữ nguyên)
        if (categoryBtn) {
            // ... (giữ nguyên)
        }
        if (hamburgerBtn && navWrapper) {
            // ... (giữ nguyên)
        }
        const openSettingsModal = () => {
            // ... (giữ nguyên)
        };
        const closeSettingsModal = () => {
            // ... (giữ nguyên)
        };
        if (settingsBtn && settingsModal && settingsOverlay && closeModalBtn) {
            // ... (giữ nguyên)
        }
        window.addEventListener('click', function(event) {
            // ... (giữ nguyên)
        });

        // ==================================================
        // === CẬP NHẬT 1: THÊM LOGIC KIỂM TRA USER VÀO HEADER ===
        // ==================================================
        const userContainer = document.getElementById('user-session-container');
        const storedUser = localStorage.getItem('currentUser'); // Lấy user từ bộ nhớ

        if (storedUser && userContainer) {
            // 1. NẾU CÓ USER (Đã đăng nhập)
            try {
                const user = JSON.parse(storedUser); // Đọc user
                
                // Thay thế HTML bằng avatar và tên
                // (Hãy chắc chắn bạn có class .user-profile-link, .header-avatar...)
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
        // 2. NẾU KHÔNG CÓ USER -> không làm gì, giữ nguyên nút "Đăng nhập"
        // === KẾT THÚC CẬP NHẬT 1 ===
    };

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

    // (Code loadComponent của bạn giữ nguyên)
    loadComponent('/pages/header.html', 'header-placeholder', initializeHeaderScripts);
    loadComponent('/pages/footer.html', 'footer-placeholder');

    // (Code Slideshow và Tabs của bạn giữ nguyên)
    // --- Logic cho Slideshow ---
    // ... (giữ nguyên)
    // --- Logic cho Tabs ---
    // ... (giữ nguyên)
    
    // (Code Form Đăng Ký của bạn giữ nguyên)
    // --- Logic cho Form Đăng Ký ---
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        // ... (giữ nguyên)
    }

    // ==================================================
    // === CẬP NHẬT 2: SỬA LOGIC FORM ĐĂNG NHẬP ===
    // ==================================================
    const loginForm = document.getElementById('login-form');
    if (loginForm) { // Chỉ chạy nếu tìm thấy form đăng nhập
        const loginBtn = document.getElementById('login-btn');

        loginBtn.addEventListener('click', async () => {
            // 1. Lấy giá trị
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // 2. Gửi dữ liệu lên API /api/login
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json(); // Đọc data { message, user }

                if (response.ok) {
                    // --- BẮT ĐẦU SỬA ĐỔI ---
                    // 1. Lưu user (data.user) vào localStorage
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    
                    // 2. Thông báo và tải lại trang chủ
                    alert(data.message); // Thông báo từ server (Mocked)
                    window.location.href = '/'; // Chuyển về trang chủ
                    // --- KẾT THÚC SỬA ĐỔI ---
                } else {
                    alert('Lỗi: ' + data.message);
                }
            } catch (error) {
                console.error('Lỗi khi gọi API đăng nhập:', error);
                alert('Không thể kết nối đến server.');
            }
        });
    }
    // === KẾT THÚC CẬP NHẬT 2 ===

}); // Đóng DOMContentLoaded