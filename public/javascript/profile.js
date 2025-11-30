// Biến toàn cục lưu trữ ID
let profileUserId = null;  // Dùng cho API Profile
let reviewUserId = null;   // Dùng cho API Reviews
let originalUsername = ""; 

// ===============================================
// 1. CÁC HÀM API CỐT LÕI
// ===============================================

// Cập nhật Tên hiển thị
async function updateUsername(newUsername) {
    if (!profileUserId) return alert('Lỗi: Không tìm thấy User ID.');
    try {
        const response = await fetch('/api/profile/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: profileUserId, username: newUsername })
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
    if (!profileUserId) return alert('Lỗi: Không tìm thấy User ID.');
    try {
        const response = await fetch('/api/password/change', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: profileUserId, oldPassword, newPassword })
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

// [QUAN TRỌNG] Hàm Update Avatar mới - Xử lý cả File và String URL
async function updateAvatar(source) {
    if (!profileUserId) return alert('Lỗi: Không tìm thấy User ID.');
    
    const formData = new FormData();
    formData.append('userId', profileUserId);

    const imgElement = document.getElementById('profile-avatar');
    
    // Kiểm tra nguồn ảnh là File (Upload) hay String (Hệ thống)
    if (source instanceof File) {
        formData.append('avatar', source); // Key 'avatar' cho multer xử lý
        imgElement.src = URL.createObjectURL(source); // Preview ngay
    } else if (typeof source === 'string') {
        formData.append('avatarUrl', source); // Key 'avatarUrl' cho server xử lý text
        imgElement.src = source; // Preview ngay
    } else {
        return alert("Dữ liệu ảnh không hợp lệ.");
    }

    try {
        // Gửi request PUT (không set Content-Type thủ công khi dùng FormData)
        const response = await fetch('/api/avatar/update', { 
            method: 'PUT', 
            body: formData 
        });
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            // Cập nhật hiển thị mới nhất từ server để đảm bảo link đúng
            const newAvatarUrl = data.newAvatarUrl;
            imgElement.src = newAvatarUrl; 
            
            // Cập nhật localStorage
            let user = JSON.parse(localStorage.getItem('currentUser'));
            if (user) {
                user.avatarUrl = newAvatarUrl;
                localStorage.setItem('currentUser', JSON.stringify(user));
            }
        } else {
            alert('Cập nhật Avatar thất bại: ' + data.message);
            window.location.reload(); // Reset lại ảnh cũ nếu lỗi
        }
    } catch (error) {
        console.error('Lỗi updateAvatar:', error);
        alert('Lỗi kết nối khi cập nhật Avatar.');
    }
}

// ===============================================
// 2. LOGIC LỊCH SỬ BÀI LÀM
// ===============================================

async function loadUserReviews() {
    const container = document.getElementById('review-history-list');
    if (!container) return;

    if (!reviewUserId) {
        container.innerHTML = '<p style="text-align: center;">Không tìm thấy ID bài làm.</p>';
        return;
    }

    container.innerHTML = '<p style="text-align: center; padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Đang tải lịch sử...</p>';

    try {
        const res = await fetch(`/api/profile/${reviewUserId}/reviews`);
        if (!res.ok) throw new Error('Lỗi tải dữ liệu lịch sử');
        
        const data = await res.json();
        const reviews = data.reviews || [];

        if (reviews.length === 0) {
            container.innerHTML = '<p style="text-align: center;">Bạn chưa làm bài thi nào gần đây.</p>';
            return;
        }

        container.innerHTML = reviews.map(review => {
            const date = new Date(review.CompletedAt).toLocaleDateString('vi-VN', { 
                year: 'numeric', month: '2-digit', day: '2-digit', 
                hour: '2-digit', minute: '2-digit' 
            });
            const timeStr = review.TimeTaken ? `${Math.floor(review.TimeTaken / 60)}p ${review.TimeTaken % 60}s` : 'N/A';
            const modeName = review.Mode === 'paced' ? 'Tốc độ' : 'Tiêu chuẩn';

            let scoreClass = 'score-low'; 
            if (review.Score >= 8.0) scoreClass = 'score-high';
            else if (review.Score >= 5.0) scoreClass = 'score-medium';

            return `
                <div class="review-item" style="border-bottom:1px solid #eee; padding: 10px 0;">
                    <div class="review-header" style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <span class="review-title" style="font-weight:600;">
                            ${review.Category.name || 'Chủ đề'} <small style="color:#666">(${modeName})</small>
                        </span>
                        <span class="review-date" style="font-size:0.9em; color:#888;">${date}</span>
                    </div>
                    <div class="review-body" style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="review-score ${scoreClass}" style="font-weight:bold;">
                            Điểm: ${review.Score}
                        </span>
                        <span class="review-details" style="font-size:0.9em;">
                            Đúng: ${review.CorrectCount}/${review.TotalQuestions} | Thời gian: ${timeStr}
                        </span>
                        <a href="/test-review?id=${review._id}" class="btn-sm btn-view-review" style="text-decoration:none; color:blue;">Xem chi tiết</a>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Lỗi tải review:", err);
        container.innerHTML = '<p style="text-align: center; color: red;">Không thể tải lịch sử bài làm.</p>';
    }
}

// ===============================================
// 3. UI LOGIC (Xử lý giao diện)
// ===============================================

function setEditMode(isEditing) {
    const usernameDisplay = document.getElementById('profile-username-display');
    const usernameInput = document.getElementById('profile-username-input');
    const editBtn = document.getElementById('edit-profile-btn');
    const changePassBtn = document.getElementById('change-password-trigger');
    const saveBtn = document.getElementById('save-profile-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const changeAvatarOverlay = document.getElementById('trigger-avatar-modal');

    if (isEditing) {
        if(usernameDisplay) usernameDisplay.classList.add('hidden-input');
        if(usernameInput) usernameInput.classList.remove('hidden-input');
        
        if(editBtn) editBtn.classList.add('hidden-input');
        if(changePassBtn) changePassBtn.classList.add('hidden-input');
        
        if(saveBtn) saveBtn.classList.remove('hidden-input');
        if(cancelBtn) cancelBtn.classList.remove('hidden-input');
        
        // Hiện nút camera khi edit
        if(changeAvatarOverlay) changeAvatarOverlay.classList.add('active');
        
        if(usernameInput) originalUsername = usernameInput.value;
        if(changeAvatarOverlay) changeAvatarOverlay.classList.add('editable');

    } else {

        if(usernameDisplay) usernameDisplay.classList.remove('hidden-input');
        if(usernameInput) usernameInput.classList.add('hidden-input');
        
        if(editBtn) editBtn.classList.remove('hidden-input');
        if(changePassBtn) changePassBtn.classList.remove('hidden-input');
        
        if(saveBtn) saveBtn.classList.add('hidden-input');
        if(cancelBtn) cancelBtn.classList.add('hidden-input');

        // Ẩn nút camera khi xong
        if(changeAvatarOverlay) changeAvatarOverlay.classList.remove('active');

        if(usernameInput) usernameInput.value = originalUsername;
        if(usernameDisplay) usernameDisplay.textContent = originalUsername;

        if(changeAvatarOverlay) changeAvatarOverlay.classList.remove('editable');
    }
}

// ===============================================
// 4. MAIN - CHẠY KHI TRANG TẢI XONG
// ===============================================
document.addEventListener('DOMContentLoaded', async function() {
    
    // --- A. KIỂM TRA ĐĂNG NHẬP ---
    const userDataString = localStorage.getItem('currentUser');
    if (!userDataString) {
        alert('Vui lòng đăng nhập để xem Profile.');
        window.location.replace('/pages/login.html'); 
        return;
    }

    // --- B. KHỞI TẠO ID ---
    try {
        const userBasic = JSON.parse(userDataString);
        profileUserId = userBasic.userId || userBasic.UserID;
        reviewUserId = userBasic._id || profileUserId; 

        if (typeof reviewUserId === 'string' && reviewUserId.length === 20) {
            reviewUserId = reviewUserId + "0000";
        }
    } catch (e) {
        console.error("Lỗi parse localStorage:", e);
    }

    // --- C. LOAD DỮ LIỆU ---
    try {
        const response = await fetch(`/api/profile/${profileUserId}`);
        const data = await response.json();
        
        if (response.ok && data.user) {
            const userFull = data.user;
            
            // Avatar
            const avatarImg = document.getElementById('profile-avatar');
            if(avatarImg) avatarImg.src = userFull.AvatarURL || '/images/user_icon.png';
            
            // Info
            const displayUsername = userFull.Username || JSON.parse(userDataString).username;
            const elUserDisplay = document.getElementById('profile-username-display');
            const elUserInput = document.getElementById('profile-username-input');
            
            if(elUserDisplay) elUserDisplay.textContent = displayUsername;
            if(elUserInput) elUserInput.value = displayUsername;
            originalUsername = displayUsername;
            
            if(document.getElementById('profile-userid')) 
                document.getElementById('profile-userid').textContent = userFull.UserID;
            if(document.getElementById('profile-email')) 
                document.getElementById('profile-email').textContent = userFull.Email; 
            if(document.getElementById('profile-role')) 
                document.getElementById('profile-role').textContent = userFull.Role;
            
            const elDate = document.getElementById('profile-createdat');
            if (elDate && userFull.CreatedAt) {
                elDate.textContent = new Date(userFull.CreatedAt).toLocaleDateString('vi-VN');
            }
        }
    } catch (error) {
        console.error('Lỗi tải profile:', error);
    }

    // Load lịch sử nếu đang ở tab history
    if (!document.getElementById('history-flow').classList.contains('hidden')) {
        await loadUserReviews();
    }

    // --- D. XỬ LÝ NÚT BẤM (Edit/Save/Logout) ---
    const editBtn = document.getElementById('edit-profile-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const saveBtn = document.getElementById('save-profile-btn');
    const logoutBtn = document.getElementById('logout-profile-btn');
    
    if (editBtn) editBtn.addEventListener('click', () => setEditMode(true));
    if (cancelBtn) cancelBtn.addEventListener('click', () => setEditMode(false));

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const inputEl = document.getElementById('profile-username-input');
            const newUsername = inputEl ? inputEl.value.trim() : '';
            
            if (newUsername !== originalUsername && newUsername !== '') {
                const success = await updateUsername(newUsername);
                if (success) {
                    originalUsername = newUsername; 
                    document.getElementById('profile-username-display').textContent = newUsername;
                    
                    let user = JSON.parse(localStorage.getItem('currentUser'));
                    if (user) {
                        user.username = newUsername;
                        localStorage.setItem('currentUser', JSON.stringify(user));
                    }
                } else return; 
            }
            setEditMode(false);
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if(confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                localStorage.removeItem('currentUser'); 
                window.location.replace('/pages/login.html'); 
            }
        });
    }

    // --- E. LOGIC MODAL AVATAR (QUAN TRỌNG: ĐÃ SỬA) ---
    const avatarTrigger = document.getElementById('trigger-avatar-modal');
    const avatarModal = document.getElementById('avatar-modal');
    const closeAvatarModalBtn = document.querySelector('.close-avatar-modal');
    const btnUploadDevice = document.getElementById('btn-upload-from-device');
    const avatarInput = document.getElementById('avatar-file-input');
    const systemAvatars = document.querySelectorAll('.system-avatar');

    // Hàm toggle hiển thị modal
    const toggleAvatarModal = (show) => {
        if (!avatarModal) return;
        if (show) {
            avatarModal.style.display = 'flex'; // Ép buộc hiển thị
            setTimeout(() => avatarModal.classList.add('show'), 10);
        } else {
            avatarModal.classList.remove('show');
            setTimeout(() => { avatarModal.style.display = 'none'; }, 300); // Đợi hiệu ứng mờ
        }
    };

    if (avatarTrigger) {
        avatarTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleAvatarModal(true);
        });
    }

    if (closeAvatarModalBtn) {
        closeAvatarModalBtn.addEventListener('click', () => toggleAvatarModal(false));
    }

    window.addEventListener('click', (e) => {
        if (e.target === avatarModal) toggleAvatarModal(false);
    });

    // --- Logic Upload từ máy (FIXED) ---
    if (btnUploadDevice && avatarInput) {
        btnUploadDevice.addEventListener('click', (e) => {
            e.stopPropagation(); // Ngăn đóng modal
            avatarInput.click(); // Kích hoạt input ẩn
        });
    }

    if (avatarInput) {
        avatarInput.addEventListener('click', (e) => e.stopPropagation());
        avatarInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                toggleAvatarModal(false);
                updateAvatar(this.files[0]); // Gọi hàm với tham số là FILE
            }
        });
    }

    // --- Logic Chọn Avatar hệ thống (FIXED) ---
    systemAvatars.forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleAvatarModal(false);
            const imageUrl = img.getAttribute('src'); // Lấy đường dẫn ảnh
            updateAvatar(imageUrl); // Gọi hàm với tham số là STRING
        });
    });

    // --- F. LOGIC MODAL ĐỔI MẬT KHẨU ---
    const passModal = document.getElementById('password-modal');
    const openPassModalBtn = document.getElementById('change-password-trigger');
    const closePassModalBtn = document.querySelector('#password-modal .close-btn');
    const passForm = document.getElementById('change-password-form');

    if (openPassModalBtn) {
        openPassModalBtn.addEventListener('click', () => {
            if(passModal) passModal.style.display = 'flex'; 
        });
    }
    
    if (closePassModalBtn) {
        closePassModalBtn.addEventListener('click', () => {
            if(passModal) passModal.style.display = 'none';
            if(passForm) passForm.reset(); 
        });
    }
    
    window.addEventListener('click', (event) => {
        if (event.target == passModal) passModal.style.display = "none";
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