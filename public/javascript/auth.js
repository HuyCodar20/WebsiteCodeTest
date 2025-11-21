document.addEventListener("DOMContentLoaded", function() {

    console.log("auth.js đã được tải!"); 

    // ===============================================
    // LOGIC FORM ĐĂNG NHẬP (ĐÃ CẬP NHẬT DÙNG EMAIL)
    // ===============================================
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) { 
        console.log("Đã tìm thấy form đăng nhập."); 
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            // ⚠️ THAY ĐỔI 1: Lấy giá trị từ ID 'email' thay vì 'username'
            const email = document.getElementById('email').value; 
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // ⚠️ THAY ĐỔI 2: Gửi giá trị email dưới key 'username'
                    // để khớp với route API tìm kiếm bằng Email trong server.js
                    body: JSON.stringify({ username: email, password }), 
                });
                const data = await response.json(); 
                if (response.ok) {
                    // Giữ nguyên key 'currentUser'
                    localStorage.setItem('currentUser', JSON.stringify(data.user)); 
                    alert(data.message); 
                    window.location.href = '/'; 
                } else {
                    alert('Lỗi: ' + data.message);
                }
            } catch (error) {
                console.error('Lỗi mạng khi gọi API đăng nhập:', error);
                alert('Không thể kết nối đến máy chủ.');
            }
        });
    } else {
        console.log("Không tìm thấy login-form trên trang này.");
    }

    // ===============================================
    // LOGIC FORM ĐĂNG KÝ (Giữ nguyên)
    // ===============================================
    const registerForm = document.getElementById('register-form');
    
    // --- BẮT ĐẦU THAY ĐỔI (Thêm phần Avatar) ---
    const avatarInput = document.getElementById('avatar');
    const avatarPreview = document.getElementById('avatar-preview');

    // Logic xem trước ảnh (Giữ nguyên)
    if (avatarInput && avatarPreview) {
        avatarInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    avatarPreview.src = event.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
        // Cho phép bấm vào ảnh để chọn file
        avatarPreview.addEventListener('click', () => avatarInput.click());
    }
    // --- KẾT THÚC THAY ĐỔI ---


    if (registerForm) {
        console.log("Đã tìm thấy form đăng ký."); 

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Form đăng ký đã được submit."); 
            
            // 1. Lấy giá trị
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Lấy file từ input
            const avatarFile = avatarInput.files[0]; 
            
            // 2. Validation (Kiểm tra)
            if (password !== confirmPassword) {
                alert("Lỗi: Mật khẩu xác nhận không khớp!");
                return;
            }
            if (password.length < 6) {
                alert("Lỗi: Mật khẩu phải có ít nhất 6 ký tự.");
                return;
            }
            if (!email.includes('@') || !email.includes('.')) {
                alert("Lỗi: Vui lòng nhập email hợp lệ.");
                return;
            }
            // Bắt buộc chọn ảnh
            if (!avatarFile) {
                alert("Lỗi: Vui lòng chọn ảnh đại diện.");
                return;
            }

            // 3. Dùng FormData thay vì JSON
            const formData = new FormData();
            formData.append('username', username);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('avatar', avatarFile); // Tên 'avatar' phải khớp với server
            
            // 4. Gửi API với FormData
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    // KHÔNG set 'Content-Type'
                    body: formData, 
                });

                const data = await response.json();

                if (response.ok) {
                    console.log("Đăng ký thành công, user data:", data.user);
                    alert(data.message + "\nChào mừng " + data.user.Username + "!");
                    window.location.href = '/pages/login.html'; 
                } else {
                    alert('Lỗi: ' + data.message); 
                }
            } catch (error) {
                console.error('Lỗi mạng khi gọi API đăng ký:', error);
                alert('Không thể kết nối đến máy chủ.');
            }
        });
    } else {
        console.log("Không tìm thấy register-form trên trang này.");
    }

}); // Đóng DOMContentLoaded