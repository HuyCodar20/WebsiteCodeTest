/* ==========================================================================
   PROFILE.JS - QUẢN LÝ TRANG CÁ NHÂN & POPUP AVATAR
   ========================================================================== */

let currentUserId = null; 
let originalUsername = ""; 

// ===============================================
// 1. CÁC HÀM API (Giao tiếp với Server)
// ===============================================

// Cập nhật Tên hiển thị
async function updateUsername(newUsername) {
    if (!currentUserId) return alert('Lỗi: Không tìm thấy User ID.');
    try {
        const response = await fetch('/api/profile/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, username: newUsername })
        });
        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            return true;
        } else {
            alert('Cập nhật thất bại: ' + data.message);
            return false;
        }
    } catch (error) {
        console.error('Lỗi updateUsername:', error);
        alert('Lỗi kết nối khi cập nhật Username.');
        return false;
    }
}

// Đổi mật khẩu
async function changePassword(oldPassword, newPassword) {
    if (!currentUserId) return alert('Lỗi: Không tìm thấy User ID.');
    try {
        const response = await fetch('/api/password/change', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, oldPassword, newPassword })
        });
        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            return true;
        } else {
            alert('Lỗi: ' + data.message);
            return false;
        }
    } catch (error) {
        console.error('Lỗi changePassword:', error);
        alert('Lỗi kết nối khi đổi mật khẩu.');
        return false;
    }
}

// Upload Avatar (Dùng chung cho cả chọn từ máy và chọn có sẵn)
async function updateAvatar(file) {
    if (!currentUserId) return alert('Lỗi: Không tìm thấy User ID.');
    
    // 1. Hiển thị ảnh tạm thời (Preview) ngay lập tức cho mượt
    const tempUrl = URL.createObjectURL(file);
    document.getElementById('profile-avatar').src = tempUrl;

    // 2. Chuẩn bị dữ liệu gửi đi
    const formData = new FormData();
    formData.append('userId', currentUserId);
    formData.append('avatar', file);

    try {
        const response = await fetch('/api/avatar/update', { method: 'PUT', body: formData });
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            
            // Thêm timestamp vào URL để trình duyệt không dùng cache cũ
            const newAvatarUrl = data.newAvatarUrl + '?' + new Date().getTime(); 
            document.getElementById('profile-avatar').src = newAvatarUrl; 
            
            // Cập nhật localStorage để Header cũng đổi theo
            let user = JSON.parse(localStorage.getItem('currentUser'));
            if (user) {
                user.avatarUrl = newAvatarUrl;
                localStorage.setItem('currentUser', JSON.stringify(user));
            }
        } else {
            alert('Cập nhật Avatar thất bại: ' + data.message);
            // Nếu lỗi thì nên reload lại để trả về ảnh cũ (hoặc xử lý thêm)
            window.location.reload();
        }
    } catch (error) {
        console.error('Lỗi updateAvatar:', error);
        alert('Lỗi kết nối khi cập nhật Avatar.');
    }
}


// ===============================================
// 2. UI LOGIC (Xử lý giao diện)
// ===============================================

// Chuyển đổi chế độ Xem <-> Sửa
function setEditMode(isEditing) {
    const usernameDisplay = document.getElementById('profile-username-display');
    const usernameInput = document.getElementById('profile-username-input');
    
    const editBtn = document.getElementById('edit-profile-btn');
    const changePassBtn = document.getElementById('change-password-trigger'); // Nút đổi pass
    
    const saveBtn = document.getElementById('save-profile-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    
    // Cái lớp phủ đen trên avatar (để bấm vào đổi ảnh)
    // Lưu ý: Trong HTML mới, ID của nó là 'trigger-avatar-modal' hoặc class 'change-avatar-overlay'
    const changeAvatarOverlay = document.querySelector('.change-avatar-overlay');

    if (isEditing) {
        // --- CHẾ ĐỘ SỬA ---
        usernameDisplay.classList.add('hidden-input');
        usernameInput.classList.remove('hidden-input');
        
        editBtn.classList.add('hidden-input');
        changePassBtn.classList.add('hidden-input'); // Ẩn nút đổi pass cho đỡ rối
        
        saveBtn.classList.remove('hidden-input');
        cancelBtn.classList.remove('hidden-input');
        
        if(changeAvatarOverlay) {
            changeAvatarOverlay.classList.add('active'); 
        }
        
        originalUsername = usernameInput.value; // Lưu giá trị cũ
    } else {
        // --- CHẾ ĐỘ XEM ---
        usernameDisplay.classList.remove('hidden-input');
        usernameInput.classList.add('hidden-input');
        
        editBtn.classList.remove('hidden-input');
        changePassBtn.classList.remove('hidden-input');
        
        saveBtn.classList.add('hidden-input');
        cancelBtn.classList.add('hidden-input');
        
        if(changeAvatarOverlay) {
            changeAvatarOverlay.classList.remove('active');
        }

        usernameInput.value = originalUsername; // Reset về cũ
        usernameDisplay.textContent = originalUsername;
    }
}

// ===============================================
// 3. MAIN EVENT LISTENER (Chạy khi trang tải xong)
// ===============================================
document.addEventListener('DOMContentLoaded', async function() {
    
    // --- A. KIỂM TRA ĐĂNG NHẬP ---
    const userDataString = localStorage.getItem('currentUser');
    if (!userDataString) {
        alert('Vui lòng đăng nhập để xem Profile.');
        window.location.href = '/pages/login.html'; 
        return;
    }

    const userBasic = JSON.parse(userDataString);
    currentUserId = userBasic.userId || userBasic.UserID; 

    // --- B. LOAD DỮ LIỆU TỪ SERVER ---
    try {
        const response = await fetch(`/api/profile/${currentUserId}`);
        const data = await response.json();
        
        if (response.ok && data.user) {
            const userFull = data.user;
            
            // 1. Avatar
            const avatarImg = document.getElementById('profile-avatar');
            avatarImg.src = userFull.AvatarURL || '/images/user_icon.png';
            
            // 2. Thông tin Text
            const displayUsername = userFull.Username || userBasic.username;
            document.getElementById('profile-username-display').textContent = displayUsername;
            document.getElementById('profile-username-input').value = displayUsername;
            originalUsername = displayUsername;
            
            document.getElementById('profile-userid').textContent = userFull.UserID;
            document.getElementById('profile-email').textContent = userFull.Email; 
            document.getElementById('profile-role').textContent = userFull.Role;
            
            // 3. Format Ngày tham gia
            if (userFull.CreatedAt) {
                const date = new Date(userFull.CreatedAt);
                document.getElementById('profile-createdat').textContent = date.toLocaleDateString('vi-VN');
            } else {
                document.getElementById('profile-createdat').textContent = 'N/A';
            }
        }
    } catch (error) {
        console.error('Lỗi tải profile:', error);
    }

    // --- C. XỬ LÝ CÁC NÚT BẤM (Sửa, Lưu, Hủy, Đăng xuất) ---
    const editBtn = document.getElementById('edit-profile-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const saveBtn = document.getElementById('save-profile-btn');
    const logoutBtn = document.getElementById('logout-profile-btn');
    
    if (editBtn) editBtn.addEventListener('click', () => setEditMode(true));
    if (cancelBtn) cancelBtn.addEventListener('click', () => setEditMode(false));

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const newUsername = document.getElementById('profile-username-input').value.trim();
            
            // Chỉ gọi API nếu tên thay đổi và không rỗng
            if (newUsername !== originalUsername && newUsername !== '') {
                const success = await updateUsername(newUsername);
                if (success) {
                    originalUsername = newUsername; 
                    document.getElementById('profile-username-display').textContent = newUsername;
                    
                    // Cập nhật localStorage
                    let user = JSON.parse(localStorage.getItem('currentUser'));
                    if (user) {
                        user.username = newUsername;
                        localStorage.setItem('currentUser', JSON.stringify(user));
                    }
                } else {
                    return; // Lỗi thì giữ nguyên chế độ sửa
                }
            }
            setEditMode(false);
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if(confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                localStorage.removeItem('currentUser'); 
                window.location.href = '/pages/login.html'; 
            }
        });
    }

    // ============================================================
    // D. LOGIC MODAL AVATAR (CODE MỚI - GIỐNG REGISTER)
    // ============================================================
    
    // Các phần tử liên quan đến Modal Avatar
    // Lưu ý: ID 'trigger-avatar-modal' là cái overlay hình tròn trên ảnh đại diện
    const avatarTrigger = document.getElementById('trigger-avatar-modal') || document.querySelector('.change-avatar-overlay');
    const avatarModal = document.getElementById('avatar-modal');
    const closeAvatarModalBtn = document.querySelector('.close-avatar-modal'); // Nút X
    
    // Nút "Tải từ máy" trong Modal
    const btnUploadDevice = document.getElementById('btn-upload-from-device');
    // Input file ẩn (đã có sẵn trong HTML cũ)
    const avatarInput = document.getElementById('avatar-file-input');
    // Các ảnh avatar có sẵn
    const systemAvatars = document.querySelectorAll('.system-avatar');

    // Hàm bật/tắt Modal
    const toggleAvatarModal = (show) => {
        if (!avatarModal) return;
        if (show) avatarModal.classList.add('show');
        else avatarModal.classList.remove('show');
    };

    // 1. Sự kiện mở Modal (Khi bấm vào overlay ảnh đại diện)
    if (avatarTrigger) {
        avatarTrigger.addEventListener('click', () => {
            // Chỉ mở được khi đang ở chế độ Sửa (Edit Mode) 
            // Kiểm tra xem overlay có class 'active' hay không (do setEditMode thêm vào)
            if (avatarTrigger.classList.contains('active')) {
                toggleAvatarModal(true);
            } else {
                // Nếu muốn cho phép đổi ảnh ngay cả khi không bấm "Chỉnh sửa", bỏ dòng if check ở trên đi
                // alert('Vui lòng bấm nút "Chỉnh sửa" để đổi ảnh đại diện.'); 
                toggleAvatarModal(true); // Cho phép mở luôn cho tiện
            }
        });
    }

    // 2. Sự kiện đóng Modal
    if (closeAvatarModalBtn) {
        closeAvatarModalBtn.addEventListener('click', () => toggleAvatarModal(false));
    }
    // Bấm ra ngoài vùng trắng thì đóng
    window.addEventListener('click', (e) => {
        if (e.target === avatarModal) toggleAvatarModal(false);
    });

    // 3. Xử lý nút "Tải từ máy"
    if (btnUploadDevice && avatarInput) {
        btnUploadDevice.addEventListener('click', () => {
            avatarInput.click(); // Kích hoạt input file ẩn
        });
    }

    // Khi người dùng chọn file từ máy xong
    if (avatarInput) {
        avatarInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                toggleAvatarModal(false); // Đóng modal
                updateAvatar(this.files[0]); // Gọi hàm upload
            }
        });
    }

    // 4. Xử lý chọn Avatar có sẵn (System Avatar)
    systemAvatars.forEach(img => {
        img.addEventListener('click', async () => {
            toggleAvatarModal(false); // Đóng modal ngay cho mượt
            
            const imageUrl = img.src;
            try {
                // Tải ảnh về dưới dạng Blob để giả lập thành File object
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                
                // Tạo file giả
                const file = new File([blob], "system_avatar.png", { type: blob.type });
                
                // Gọi hàm upload như bình thường
                updateAvatar(file);
                
            } catch (error) {
                console.error("Lỗi chọn avatar hệ thống:", error);
                alert("Không thể chọn ảnh này. Vui lòng thử lại.");
            }
        });
    });

    // ============================================================
    // E. LOGIC MODAL ĐỔI MẬT KHẨU (CODE CŨ GIỮ NGUYÊN)
    // ============================================================
    const passModal = document.getElementById('password-modal');
    const openPassModalBtn = document.getElementById('change-password-trigger');
    const closePassModalBtn = document.querySelector('#password-modal .close-btn');
    const passForm = document.getElementById('change-password-form');

    if (openPassModalBtn) {
        openPassModalBtn.addEventListener('click', () => {
            if(passModal) passModal.style.display = 'block';
        });
    }
    
    if (closePassModalBtn) {
        closePassModalBtn.addEventListener('click', () => {
            if(passModal) passModal.style.display = 'none';
            if(passForm) passForm.reset(); 
        });
    }
    
    // Click outside cho password modal (Xử lý riêng vì modal này dùng display:block thay vì class show)
    window.addEventListener('click', (event) => {
        if (event.target == passModal) {
            passModal.style.display = "none";
        }
    });

    if (passForm) {
        passForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldPass = document.getElementById('old-password').value;
            const newPass = document.getElementById('new-password').value;
            const confirmPass = document.getElementById('confirm-new-password').value;

            if (newPass !== confirmPass) return alert('Mật khẩu xác nhận không khớp.');
            if (newPass.length < 6) return alert('Mật khẩu phải trên 6 ký tự.');

            const success = await changePassword(oldPass, newPass);
            if (success) {
                passModal.style.display = 'none';
                passForm.reset();
            }
        });
    }
});