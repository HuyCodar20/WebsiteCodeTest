document.addEventListener("DOMContentLoaded", function() {

    // --- BIẾN TOÀN CỤC: Lưu file ảnh avatar cuối cùng ---
    let finalAvatarFile = null;

    // ===============================================
    // 1. KHỞI TẠO LOGIC MODAL (POPUP)
    // ===============================================
    function initAvatarModal() {
        const openModalBtn = document.getElementById('open-avatar-modal-btn');
        const modalOverlay = document.getElementById('avatar-modal');
        const avatarPreview = document.getElementById('avatar-preview');
        const closeModalBtn = document.querySelector('.close-modal');
        
        // Kiểm tra xem các phần tử có tồn tại không
        if (!openModalBtn || !modalOverlay) {
            return;
        }

        // Hàm mở modal
        const openModal = () => {
            modalOverlay.classList.add('show');
        };

        // Hàm đóng modal
        const closeModal = () => {
            modalOverlay.classList.remove('show');
        };

        // Gán sự kiện click
        openModalBtn.addEventListener('click', openModal);
        
        if (avatarPreview) {
            avatarPreview.addEventListener('click', openModal);
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeModal);
        }

        // Click ra ngoài vùng trắng thì đóng
        window.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });

        // --- XỬ LÝ LỰA CHỌN TRONG MODAL ---
        const triggerUploadBtn = document.getElementById('trigger-upload');
        const avatarInput = document.getElementById('avatar'); // Input ẩn
        const systemAvatars = document.querySelectorAll('.system-avatar');

        // 1. Chọn từ máy tính
        if (triggerUploadBtn && avatarInput) {
            triggerUploadBtn.addEventListener('click', () => {
                avatarInput.click(); // Kích hoạt input file ẩn
            });

            avatarInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    finalAvatarFile = file; // Lưu vào biến
                    // Hiển thị ảnh xem trước
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        if(avatarPreview) avatarPreview.src = ev.target.result;
                    };
                    reader.readAsDataURL(file);
                    closeModal();
                }
            });
        }

        // 2. Chọn ảnh có sẵn
        systemAvatars.forEach(img => {
            img.addEventListener('click', async () => {
                const imageUrl = img.src;
                if(avatarPreview) avatarPreview.src = imageUrl; // Cập nhật giao diện ngay
                closeModal();

                try {
                    // Tải ảnh về để giả lập thành File
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    finalAvatarFile = new File([blob], "system_avatar.png", { type: blob.type });
                } catch (error) {
                    console.error("❌ Lỗi tải ảnh hệ thống:", error);
                    alert("Không thể chọn ảnh này. Vui lòng thử lại.");
                }
            });
        });
    }

    // ===============================================
    // 2. LOGIC ĐĂNG KÝ
    // ===============================================
    function initRegisterForm() {
        const registerForm = document.getElementById('register-form');
        if (!registerForm) return; // Nếu không phải trang đăng ký thì thoát

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Validation
            if (password !== confirmPassword) {
                alert("Mật khẩu xác nhận không khớp!");
                return;
            }
            if (!finalAvatarFile) {
                alert("Vui lòng chọn ảnh đại diện!");
                // Tự động mở modal nếu quên chọn
                const modal = document.getElementById('avatar-modal');
                if(modal) modal.classList.add('show');
                return;
            }

            // Tạo FormData
            const formData = new FormData();
            formData.append('username', username);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('avatar', finalAvatarFile);

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (response.ok) {
                    alert(data.message);
                    window.location.replace('/pages/login.html');
                } else {
                    alert('Lỗi: ' + data.message);
                }
            } catch (error) {
                console.error("Lỗi register:", error);
                alert("Lỗi kết nối server.");
            }
        });
    }

    // ===============================================
    // 3. LOGIC ĐĂNG NHẬP 
    // ===============================================
    function initLoginForm() {
        const loginForm = document.getElementById('login-form');
        if (!loginForm) return;

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const identifier = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        username: identifier, 
                        email: identifier,   
                        password: password 
                    }),
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    alert(data.message);
                    if (data.user.role === 'admin') {
                        window.location.replace('/pages/admin.html');
                    } else {
                        window.location.replace('/');
                    }

                } else {
                    alert('Lỗi: ' + data.message);
                }
            } catch (error) {
                console.error(error);
                alert('Lỗi đăng nhập.');
            }
        });
    }

    // --- CHẠY CÁC HÀM KHỞI TẠO ---
    initAvatarModal();
    initRegisterForm();
    initLoginForm();

});