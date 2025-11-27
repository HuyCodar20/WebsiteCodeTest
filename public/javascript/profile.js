let currentUserId = null; 
let originalUsername = ""; 

// Hàm gọi API cập nhật Username
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
        console.error('Lỗi mạng cập nhật Username:', error);
        alert('Lỗi kết nối khi cập nhật Username.');
        return false;
    }
}

// Hàm gọi API đổi mật khẩu
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
            alert('Đổi mật khẩu thất bại: ' + data.message);
            return false;
        }
    } catch (error) {
        console.error('Lỗi mạng đổi mật khẩu:', error);
        alert('Lỗi kết nối khi đổi mật khẩu.');
        return false;
    }
}

// Hàm gọi API cập nhật Avatar
async function updateAvatar(file) {
    if (!currentUserId) return alert('Lỗi: Không tìm thấy User ID.');

    const formData = new FormData();
    formData.append('userId', currentUserId);
    formData.append('avatar', file);

    try {
        const response = await fetch('/api/avatar/update', {
            method: 'PUT',
            body: formData
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            const newAvatarUrl = data.newAvatarUrl + '?' + new Date().getTime(); 
            document.getElementById('profile-avatar').src = newAvatarUrl; 
            
            // Cập nhật localStorage để các trang khác cũng thấy avatar mới
            let user = JSON.parse(localStorage.getItem('currentUser'));
            if (user) {
                user.avatarUrl = newAvatarUrl;
                localStorage.setItem('currentUser', JSON.stringify(user));
            }
            
        } else {
            alert('Cập nhật Avatar thất bại: ' + data.message);
        }
    } catch (error) {
        console.error('Lỗi mạng cập nhật Avatar:', error);
        alert('Lỗi kết nối khi cập nhật Avatar.');
    }
}

// LOGIC CHUYỂN CHẾ ĐỘ SỬA
function setEditMode(isEditing) {
    const usernameDisplay = document.getElementById('profile-username-display');
    const usernameInput = document.getElementById('profile-username-input');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const changeAvatarOverlay = document.getElementById('change-avatar-overlay');

    if (isEditing) {
        usernameDisplay.classList.add('hidden-input');
        usernameInput.classList.remove('hidden-input');
        
        editProfileBtn.classList.add('hidden-input');
        saveProfileBtn.classList.remove('hidden-input');
        cancelEditBtn.classList.remove('hidden-input');
        
        changeAvatarOverlay.classList.add('active'); 

        originalUsername = usernameInput.value;
        
    } else {
        usernameDisplay.classList.remove('hidden-input');
        usernameInput.classList.add('hidden-input');
        
        editProfileBtn.classList.remove('hidden-input');
        saveProfileBtn.classList.add('hidden-input');
        cancelEditBtn.classList.add('hidden-input');
        
        changeAvatarOverlay.classList.remove('active');

        usernameInput.value = originalUsername;
        usernameDisplay.textContent = originalUsername;
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const usernameDisplay = document.getElementById('profile-username-display');
    const usernameInput = document.getElementById('profile-username-input');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const logoutProfileBtn = document.getElementById('logout-profile-btn'); 

    const avatarFileInput = document.getElementById('avatar-file-input');
    const changeAvatarOverlay = document.getElementById('change-avatar-overlay');

    const passwordModal = document.getElementById('password-modal');
    const changePasswordTrigger = document.getElementById('change-password-trigger');
    const passwordForm = document.getElementById('change-password-form');
    const closeModalBtn = document.querySelector('#password-modal .close-btn');

    const userDataString = localStorage.getItem('currentUser');
    
    if (!userDataString) {
        alert('Vui lòng đăng nhập để xem Profile.');
        window.location.href = '/pages/login.html'; 
        return;
    }

    const userBasic = JSON.parse(userDataString);
    currentUserId = userBasic.userId;

    try {
        const response = await fetch(`/api/profile/${userBasic.userId}`);
        const data = await response.json();
        
        if (response.ok) {
            const userFull = data.user;
            
            const avatarImg = document.getElementById('profile-avatar');
            if (avatarImg) {
                avatarImg.src = userFull.AvatarURL || '/images/default-avatar.png';
            }
            
            usernameDisplay.textContent = userFull.Username;
            usernameInput.value = userFull.Username; 
            originalUsername = userFull.Username; 
            document.getElementById('profile-userid').textContent = userFull.UserID;
            document.getElementById('profile-email').textContent = userFull.Email; 
            document.getElementById('profile-role').textContent = userFull.Role;
            
            if (userFull.CreatedAt) {
                const date = new Date(userFull.CreatedAt);
                document.getElementById('profile-createdat').textContent = date.toLocaleDateString('vi-VN');
            } else {
                document.getElementById('profile-createdat').textContent = 'N/A';
            }

        } else {
            console.error('Lỗi API tải profile:', data.message);
            alert('Lỗi khi tải profile: ' + data.message);
        }
        
    } catch (error) {
        console.error('Lỗi mạng hoặc server:', error);
        alert('Không thể tải profile từ máy chủ.');
    }

    // XỬ LÝ SỰ KIỆN CHÍNH
    if (editProfileBtn) editProfileBtn.addEventListener('click', () => { setEditMode(true); });
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => { setEditMode(false); });

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const newUsername = usernameInput.value.trim();
            let hasUsernameChanged = false;

            if (newUsername !== originalUsername && newUsername !== '') {
                const success = await updateUsername(newUsername);
                if (success) {
                    hasUsernameChanged = true;
                } else {
                    return; 
                }
            }
            
            if (hasUsernameChanged) {
                originalUsername = newUsername; 
            }

            setEditMode(false);
        });
    }
    
    if (changeAvatarOverlay) changeAvatarOverlay.addEventListener('click', () => { avatarFileInput.click(); });

    if (avatarFileInput) {
        avatarFileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('profile-avatar').src = e.target.result;
                };
                reader.readAsDataURL(file);
                updateAvatar(file);
            }
        });
    }

    // LOGIC ĐĂNG XUẤT MỚI
    if (logoutProfileBtn) {
        logoutProfileBtn.addEventListener('click', () => {
            localStorage.removeItem('currentUser'); 
            alert('Bạn đã đăng xuất thành công!');
            window.location.href = '/'; 
        });
    }

    // LOGIC ĐỔI MẬT KHẨU
    if (changePasswordTrigger) changePasswordTrigger.addEventListener('click', () => { passwordModal.style.display = 'block'; });
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => { passwordModal.style.display = 'none'; passwordForm.reset(); });

    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldPass = document.getElementById('old-password').value;
            const newPass = document.getElementById('new-password').value;
            const confirmPass = document.getElementById('confirm-new-password').value;

            if (newPass !== confirmPass) { return alert('Mật khẩu mới và xác nhận mật khẩu không khớp.'); }
            if (newPass.length < 6) { return alert('Mật khẩu mới phải có ít nhất 6 ký tự.'); }

            const success = await changePassword(oldPass, newPass);
            if (success) {
                passwordModal.style.display = 'none';
                passwordForm.reset(); 
            }
        });
    }
    
    window.onclick = function(event) {
        if (event.target == passwordModal) {
            passwordModal.style.display = "none";
        }
    }
});