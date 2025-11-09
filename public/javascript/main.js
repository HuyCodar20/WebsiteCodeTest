// public/javascript/main.js (ĐÃ DỌN DẸP)

document.addEventListener("DOMContentLoaded", function() {

    /**
     * Hàm này sẽ được gọi SAU KHI header.html được tải xong
     * Nó chứa TẤT CẢ logic của header (dropdown, modal, check login)
     */
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
        // ... (giữ nguyên code xử lý modal settings) ...
        if (settingsBtn && settingsModal && settingsOverlay && closeModalBtn) {
            // ... (giữ nguyên)
        }
        // ... (giữ nguyên code window.addEventListener('click', ...))
        window.addEventListener('click', function(event) {
            // ... (giữ nguyên)
 });

        // ==================================================
        // LOGIC KIỂM TRA USER VÀ ĐĂNG XUẤT (VẪN GIỮ Ở ĐÂY)
        // Vì header được tải trên MỌI trang
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
        // 2. NẾU KHÔNG CÓ USER -> không làm gì, giữ nguyên nút "Đăng nhập"
        // === KẾT THÚC CẬP NHẬT 1 ===
    };

    /**
     * Hàm tải các thành phần HTML (header, footer)
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
                    if (callback) callback(); // Chạy hàm callback (initializeHeaderScripts)
                }
            })
            .catch(error => console.error('Lỗi khi tải thành phần:', error));
    };

    // --- TẢI CÁC THÀNH PHẦN CHUNG ---
    // Tải header, VÀ SAU ĐÓ chạy initializeHeaderScripts
    loadComponent('/pages/header.html', 'header-placeholder', initializeHeaderScripts); 
    loadComponent('/pages/footer.html', 'footer-placeholder');

    // --- LOGIC CỦA TRANG CHỦ (Slideshow, Tabs...) ---
    // (Code Slideshow và Tabs của bạn giữ nguyên)
    // --- Logic cho Slideshow ---
    // ... (giữ nguyên)
    // --- Logic cho Tabs ---
    // ... (giữ nguyên)
    

    // (PHẦN FORM ĐĂNG KÝ ĐÃ BỊ XÓA)

    // (PHẦN FORM ĐĂNG NHẬP ĐÃ BỊ XÓA)


}); // Đóng DOMContentLoaded