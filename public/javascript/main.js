// public/javascript/main.js (CHỈNH SỬA CUỐI CÙNG)

document.addEventListener("DOMContentLoaded", function() {

    const initializeHeaderScripts = () => {
        const categoryBtn = document.getElementById('category-btn');
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const navWrapper = document.getElementById('nav-wrapper');
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const settingsOverlay = document.getElementById('settings-overlay');
        const closeModalBtn = document.getElementById('close-modal-btn');

        // ... (GIỮ NGUYÊN code xử lý dropdown, hamburger, modal, và window.addEventListener) ...

        // ==================================================
        // LOGIC KIỂM TRA USER VÀ HEADER
        // ==================================================
        const userContainer = document.getElementById('user-session-container');
        const storedUser = localStorage.getItem('currentUser');

        if (storedUser && userContainer) {
            try {
                const user = JSON.parse(storedUser);
                
                // ⚠️ BƯỚC CẦN THIẾT: TẠO URL AVATAR MỚI VỚI TIMESTAMP
                let avatarUrl = user.avatarUrl || '/images/default-avatar.png';
                // Thêm timestamp để buộc trình duyệt tải lại ảnh mới (tránh cache)
                avatarUrl += `?t=${new Date().getTime()}`;
                
                // Thay thế HTML bằng avatar và tên (LOẠI BỎ ĐĂNG XUẤT)
                userContainer.innerHTML = `
                    <a href="/profile" class="user-profile-link">
                        <img src="${avatarUrl}" alt="Avatar" class="header-avatar">
                        <span>${user.username}</span>
                    </a>
                    `;

            } catch (e) {
                console.error("Lỗi đọc user:", e);
                localStorage.removeItem('currentUser');
            }
        }
        // === KẾT THÚC LOGIC HEADER ===
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
                    if (callback) callback();
                }
            })
            .catch(error => console.error('Lỗi khi tải thành phần:', error));
    };

    // --- TẢI CÁC THÀNH PHẦN CHUNG ---
    loadComponent('/pages/header.html', 'header-placeholder', initializeHeaderScripts); 
    loadComponent('/pages/footer.html', 'footer-placeholder');

    // ... (GIỮ NGUYÊN code LOGIC CỦA TRANG CHỦ) ...
});