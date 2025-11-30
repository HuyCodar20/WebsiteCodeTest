/* ============================================================
   GLOBAL VARIABLES & STATE
   ============================================================ */
let allTopics = [];   // Lưu trữ danh sách topic
let qPage = 1;        // Trang hiện tại
let qLimit = 10;      // Số câu hỏi mỗi trang
let qSearch = "";     // Từ khóa tìm kiếm
let qTopicId = "";    // ID Topic đang lọc
let qDifficulty = ""; // Độ khó đang lọc
let qHasReport = false; // Trạng thái lọc báo cáo (True/False)

/* ============================================================
   UTILITIES (HÀM HỖ TRỢ)
   ============================================================ */

// Hàm xử lý ký tự đặc biệt để tránh lỗi hiển thị HTML (XSS/Vỡ giao diện)
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ============================================================
   MAIN INITIALIZATION
   ============================================================ */
document.addEventListener("DOMContentLoaded", function() {

    // 1. SECURITY CHECK
    const storedUser = localStorage.getItem('currentUser');
    const currentUser = storedUser ? JSON.parse(storedUser) : null;

    if (!currentUser || currentUser.role !== 'admin') {
        alert('⛔ Truy cập bị từ chối! Bạn không phải là Admin.');
        window.location.replace('/');
        return;
    }

    // Hiển thị thông tin Admin
    const adminNameEl = document.querySelector('.admin-info strong');
    const adminAvatarEl = document.querySelector('.admin-info .avatar-small');
    if (adminNameEl) adminNameEl.textContent = currentUser.username;
    if (adminAvatarEl && currentUser.avatarUrl) adminAvatarEl.src = currentUser.avatarUrl;

    // Xử lý Đăng xuất
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('devarena_bg_music_enabled');
                localStorage.removeItem('devarena_bg_music_current_time');
                window.location.href = '/pages/login.html';
            }
        });
    }

    // ============================================================
    // [MỚI] MOBILE MENU LOGIC (THÊM VÀO ĐÂY)
    // ============================================================
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sidebar = document.querySelector('.sidebar');

    // 1. Sự kiện click nút 3 gạch (Hamburger)
    if (menuToggleBtn && sidebar) {
        menuToggleBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Ngăn chặn sự kiện nổi bọt lên window
            sidebar.classList.toggle('open');
        });
    }

    // 2. Tự động đóng menu khi click vào link chuyển tab (trên mobile)
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768 && sidebar) {
                sidebar.classList.remove('open');
            }
        });
    });
    // ============================================================
    // KẾT THÚC LOGIC MOBILE
    // ============================================================


    // 2. EVENT LISTENERS (UI)

    // Tab Switching
    window.switchTab = function(tabName) {
        // Active Menu
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        const tab = document.getElementById(`tab-${tabName}`);
        if(tab) tab.classList.add('active');

        // Show/Hide Sections
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
        const section = document.getElementById(`section-${tabName}`);
        if(section) section.classList.remove('hidden');

        // Update Title & Load Data
        const titles = { 'topics': 'Quản lý Chủ đề', 'questions': 'Quản lý Câu hỏi' };
        
        // Cập nhật tiêu đề (nếu element tồn tại)
        const titleEl = document.getElementById('page-title');
        if(titleEl) titleEl.innerText = titles[tabName] || 'Admin Portal';

        if (tabName === 'topics') {
            fetchTopics();
        }
        if (tabName === 'questions') {
            fetchTopics().then(() => {
                loadTopicsForFilter(); 
                fetchAdminQuestions();
            });
        }
    };

    // Modal Handling
    window.closeModal = function(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    };

    // Global Click Handler (Đóng Modal & Đóng Menu Mobile khi click ra ngoài)
    window.onclick = function(event) {
        // 1. Logic đóng Modal (Cũ)
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target === modal) modal.classList.add('hidden');
        });

        // 2. [MỚI] Logic đóng Sidebar trên Mobile khi click ra ngoài
        const sidebar = document.querySelector('.sidebar');
        const menuToggleBtn = document.getElementById('menu-toggle-btn');
        
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
            // Nếu click KHÔNG nằm trong sidebar VÀ KHÔNG phải là nút toggle
            if (!sidebar.contains(event.target) && event.target !== menuToggleBtn) {
                sidebar.classList.remove('open');
            }
        }
    };

    // Form Submit: Topic
    const topicForm = document.getElementById('topic-form');
    if (topicForm) topicForm.addEventListener('submit', handleSaveTopic);

    // Search & Filter: Questions
    const searchInput = document.getElementById('search-questions');
    const filterTopic = document.getElementById('filter-topic');
    const filterDiff = document.getElementById('filter-difficulty');
    const filterReport = document.getElementById('filter-reported'); // Checkbox lọc báo cáo
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                qSearch = e.target.value.trim();
                qPage = 1;
                fetchAdminQuestions();
            }
        });
    }

    if (filterTopic) {
        filterTopic.addEventListener('change', (e) => {
            qTopicId = e.target.value;
            qPage = 1;
            fetchAdminQuestions();
        });
    }

    if (filterDiff) {
        filterDiff.addEventListener('change', (e) => {
            qDifficulty = e.target.value;
            qPage = 1;
            fetchAdminQuestions();
        });
    }

    // Sự kiện checkbox lọc câu hỏi bị báo cáo
    if (filterReport) {
        filterReport.addEventListener('change', (e) => {
            qHasReport = e.target.checked;
            qPage = 1;
            fetchAdminQuestions();
        });
    }

    if (btnPrev) btnPrev.addEventListener('click', () => { if(qPage > 1) { qPage--; fetchAdminQuestions(); } });
    if (btnNext) btnNext.addEventListener('click', () => { qPage++; fetchAdminQuestions(); });

    // Khởi chạy mặc định
    fetchTopics();
});

/* ============================================================
   LOGIC PHẦN 1: QUẢN LÝ CHỦ ĐỀ (TOPICS)
   ============================================================ */

async function fetchTopics() {
    try {
        const res = await fetch('/api/topics');
        if (!res.ok) throw new Error("Lỗi kết nối");
        allTopics = await res.json();
        renderTopicTable(allTopics);
        return allTopics;
    } catch (err) {
        console.error("Lỗi tải topics:", err);
        return [];
    }
}

function renderTopicTable(topics) {
    const tbody = document.getElementById('topic-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!topics || topics.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Chưa có chủ đề nào.</td></tr>';
        return;
    }

    topics.forEach(topic => {
        const tr = document.createElement('tr');
        const tagsHtml = topic.tags && topic.tags.length > 0
            ? topic.tags.map(t => `<span class="badge" style="background:#eee; color:#555; margin-right:4px; font-size:0.75rem; padding: 2px 5px; border-radius: 4px;">${t}</span>`).join('') 
            : '<span style="color:#999; font-size:0.8rem;">Không có tags</span>';

        tr.innerHTML = `
            <td style="text-align: center; color: ${topic.theme_color || '#333'}">
                <i class="${topic.icon || 'fa-solid fa-folder'} fa-2x"></i>
            </td>
            <td>
                <div style="font-weight:bold; font-size:1rem;">${topic.name}</div>
                <small style="color: #666; font-style: italic;">Type: ${topic.type || 'N/A'}</small>
            </td>
            <td>
                <div class="text-truncate" style="max-width: 350px; color:#444;">${topic.description || ''}</div>
                <div style="margin-top: 5px;">${tagsHtml}</div>
            </td>
            <td>
                <button class="btn-icon edit" onclick="openTopicModal('edit', '${topic._id}')" title="Sửa">
                    <i class="fa-solid fa-pen fa-lg"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteTopic('${topic._id}')" title="Xóa">
                    <i class="fa-solid fa-trash fa-lg"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openTopicModal = function(mode, topicId = null) {
    const modal = document.getElementById('modal-topic');
    const title = document.getElementById('topic-modal-title');
    const form = document.getElementById('topic-form');

    modal.classList.remove('hidden');
    
    if (mode === 'add') {
        title.innerText = "Thêm Chủ đề mới";
        form.reset();
        document.getElementById('topic-id').value = '';
        document.getElementById('topic-color').value = '#007bff';
    } else if (mode === 'edit') {
        title.innerText = "Cập nhật Chủ đề";
        const topic = allTopics.find(t => t._id === topicId);
        if (topic) {
            document.getElementById('topic-id').value = topic._id;
            document.getElementById('topic-name').value = topic.name;
            document.getElementById('topic-type').value = topic.type || 'language';
            document.getElementById('topic-desc').value = topic.description || '';
            document.getElementById('topic-long-desc').value = topic.long_description || '';
            document.getElementById('topic-icon').value = topic.icon || '';
            document.getElementById('topic-banner').value = topic.banner_image_url || '';
            document.getElementById('topic-color').value = topic.theme_color || '#007bff';
            document.getElementById('topic-tags').value = topic.tags ? topic.tags.join(', ') : '';
        }
    }
};

async function handleSaveTopic(e) {
    e.preventDefault();
    const id = document.getElementById('topic-id').value;
    const data = {
        name: document.getElementById('topic-name').value,
        type: document.getElementById('topic-type').value,
        description: document.getElementById('topic-desc').value,
        long_description: document.getElementById('topic-long-desc').value,
        icon: document.getElementById('topic-icon').value,
        banner_image_url: document.getElementById('topic-banner').value,
        theme_color: document.getElementById('topic-color').value,
        tags: document.getElementById('topic-tags').value 
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/topics/${id}` : '/api/topics';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (res.ok) {
            alert(id ? "✅ Cập nhật chủ đề thành công!" : "✅ Tạo chủ đề mới thành công!");
            window.closeModal('modal-topic');
            fetchTopics(); 
            loadTopicsForFilter();
        } else {
            alert("❌ Lỗi: " + (result.message || "Không thể lưu chủ đề."));
        }
    } catch (error) {
        console.error("Lỗi save topic:", error);
        alert("❌ Lỗi kết nối server.");
    }
}

window.deleteTopic = async function(id) {
    if (!confirm("⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa chủ đề này?\nHệ thống sẽ chặn xóa nếu chủ đề đang chứa câu hỏi.")) return;
    try {
        const res = await fetch(`/api/topics/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            alert("✅ " + data.message);
            fetchTopics();
        } else {
            alert("❌ Không thể xóa: " + data.message);
        }
    } catch (error) {
        alert("Lỗi server khi xóa.");
    }
};

/* ============================================================
   LOGIC PHẦN 2: QUẢN LÝ CÂU HỎI (QUESTIONS)
   ============================================================ */

function loadTopicsForFilter() {
    const select = document.getElementById('filter-topic');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Tất cả chủ đề --</option>';
    if (allTopics && allTopics.length > 0) {
        allTopics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic._id;
            option.textContent = topic.name;
            select.appendChild(option);
        });
    }
    select.value = currentVal;
}

async function fetchAdminQuestions() {
    const tbody = document.getElementById('question-table-body');
    if (!tbody) return;

    // Colspan 6 vì đã thêm cột Báo cáo
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">⏳ Đang tải dữ liệu...</td></tr>';

    try {
        const params = new URLSearchParams({
            page: qPage,
            limit: qLimit,
            search: qSearch,
            difficulty: qDifficulty || 'all',
            categoryId: qTopicId || '', 
            excludeDeleted: 'false',
            hasReport: qHasReport // Gửi trạng thái lọc báo cáo
        });

        const res = await fetch(`/api/questions?${params.toString()}`);
        if (!res.ok) throw new Error("Lỗi tải câu hỏi");
        const data = await res.json();

        renderQuestionTable(data.questions);
        updatePagination(data);

    } catch (err) {
        console.error("Lỗi fetch questions:", err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Lỗi kết nối server!</td></tr>';
    }
}

function renderQuestionTable(questions) {
    const tbody = document.getElementById('question-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!questions || questions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Không tìm thấy câu hỏi nào.</td></tr>';
        return;
    }

    questions.forEach(q => {
        const tr = document.createElement('tr');
        
        // Badge Độ khó
        let diffBadge;
        switch(q.Difficulty) {
            case 'easy': diffBadge = '<span class="badge" style="background:#d1e7dd; color:#0f5132; padding:4px 8px; border-radius:4px;">Dễ</span>'; break;
            case 'medium': diffBadge = '<span class="badge" style="background:#fff3cd; color:#856404; padding:4px 8px; border-radius:4px;">TB</span>'; break;
            case 'hard': diffBadge = '<span class="badge" style="background:#f8d7da; color:#842029; padding:4px 8px; border-radius:4px;">Khó</span>'; break;
            default: diffBadge = '<span class="badge">N/A</span>';
        }

        // Tên Topic
        let topicName = "Chưa phân loại";
        if (q.CategoryID) {
            if (typeof q.CategoryID === 'object' && q.CategoryID.name) {
                topicName = q.CategoryID.name;
            } else {
                const t = allTopics.find(top => top._id === String(q.CategoryID));
                if (t) topicName = t.name;
            }
        }

        const creator = q.CreatorUserID ? (q.CreatorUserID.Username || 'Admin') : 'Ẩn danh';
        
        // Escape HTML để hiển thị đúng text
        const safeQuestionText = escapeHtml(q.QuestionText);

        // Xử lý hiển thị số lượng báo cáo và Nút Reset
        const reportCount = q.ReportCount || 0;
        let reportHtml = `<span style="color:#ccc;">0</span>`;
        
        if (reportCount > 0) {
            // Nền đỏ nhạt cảnh báo
            tr.style.backgroundColor = "#fff5f5"; 
            
            // Badge số lượng + Nút Reset
            reportHtml = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <span class="badge" style="background: #dc3545; color: white; padding: 4px 8px; border-radius: 10px; font-weight: bold;">
                        ${reportCount}
                    </span>
                    <button onclick="resetReport('${q._id}')" title="Reset báo cáo về 0" style="border: none; background: none; cursor: pointer; color: #0d6efd; transition: transform 0.2s;">
                        <i class="fa-solid fa-rotate-left"></i>
                    </button>
                </div>
            `;
        }

        tr.innerHTML = `
            <td>
                <div class="text-truncate" style="max-width: 350px; font-weight:500;" title="${safeQuestionText}">
                    ${safeQuestionText}
                </div>
            </td>
            <td><span class="badge" style="background:#f0f0f0; padding: 4px 8px; border-radius: 4px; border: 1px solid #ddd;">${topicName}</span></td>
            <td><small>${creator}</small></td>
            
            <td style="text-align: center;">${reportHtml}</td>
            
            <td>${diffBadge}</td>
            <td>
                <button class="btn-icon view" onclick='viewQuestionDetail("${q._id}")' title="Xem chi tiết">
                    <i class="fa-solid fa-eye fa-lg"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteQuestion('${q._id}')" title="Xóa vĩnh viễn">
                    <i class="fa-solid fa-trash fa-lg"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updatePagination(data) {
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const pageInfo = document.getElementById('page-info');
    const controls = document.getElementById('pagination-controls');

    if (!controls) return;
    if(data.totalPages <= 1) {
        controls.style.display = 'none';
    } else {
        controls.style.display = 'flex';
        pageInfo.innerText = `Trang ${data.currentPage} / ${data.totalPages}`;
        btnPrev.disabled = data.currentPage <= 1;
        btnNext.disabled = data.currentPage >= data.totalPages;
    }
}

// Xem chi tiết câu hỏi (Modal)
window.viewQuestionDetail = async function(id) {
    try {
        const res = await fetch(`/api/questions/${id}`);
        if (!res.ok) throw new Error('Không tìm thấy câu hỏi');
        const q = await res.json();

        // Escape HTML cho tiêu đề câu hỏi
        document.getElementById('view-q-text').textContent = q.QuestionText;
        
        document.getElementById('view-q-explain').innerHTML = q.Explanation || "<em>(Chưa có giải thích)</em>";

        // Xử lý ảnh
        const imgContainer = document.getElementById('view-q-image-container');
        const imgEl = document.getElementById('view-q-image');
        
        if (q.Image) {
            let src = q.Image.replace(/\\/g, '/');
            if (src.startsWith('public/')) src = src.replace('public/', '/');
            if (!src.startsWith('/')) src = '/' + src;
            imgEl.src = src;
            imgContainer.style.display = 'block';
        } else {
            imgContainer.style.display = 'none';
        }

        // Render Choices
        const list = document.getElementById('view-q-choices');
        list.innerHTML = '';
        if (q.choices && q.choices.length > 0) {
            q.choices.forEach(c => {
                const li = document.createElement('li');
                
                // Escape HTML cho nội dung đáp án
                li.innerHTML = `<span style="flex:1;">${escapeHtml(c.choiceText)}</span>`;
                
                li.style.padding = "10px";
                li.style.margin = "5px 0";
                li.style.border = "1px solid #ddd";
                li.style.borderRadius = "4px";
                li.style.display = "flex";
                li.style.alignItems = "center";

                if (c.isCorrect) {
                    li.style.backgroundColor = "#d1e7dd";
                    li.style.border = "1px solid #badbcc";
                    li.style.color = "#0f5132";
                    li.style.fontWeight = "bold";
                    li.innerHTML += ' <i class="fa-solid fa-check-circle" style="color:#198754; margin-left:10px;"></i>';
                }
                list.appendChild(li);
            });
        }

        document.getElementById('modal-question').classList.remove('hidden');

    } catch (err) {
        console.error(err);
        alert("Lỗi khi tải chi tiết câu hỏi.");
    }
};

// Xóa câu hỏi
window.deleteQuestion = async function(id) {
    if (!confirm("⚠️ CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN câu hỏi này?\nHành động này không thể hoàn tác!")) return;
    
    try {
        // [QUAN TRỌNG] Thêm ?type=permanent vào URL để báo Server xóa vĩnh viễn
        const res = await fetch(`/api/questions/${id}?type=permanent`, { method: 'DELETE' });
        
        const data = await res.json();
        if (res.ok) {
            alert("✅ " + data.message);
            fetchAdminQuestions(); // Load lại danh sách
        } else {
            alert("❌ Lỗi: " + data.message);
        }
    } catch (err) {
        alert("Lỗi kết nối server.");
    }
};

// Reset Report Count về 0
window.resetReport = async function(id) {
    // Ngăn chặn sự kiện click lan ra ngoài (nếu có click row)
    if (event) event.stopPropagation();

    if (!confirm("Bạn có chắc chắn muốn xóa hết lượt báo cáo của câu hỏi này?")) return;

    try {
        const res = await fetch(`/api/questions/${id}/reset-report`, { method: 'PUT' });
        const data = await res.json();

        if (res.ok) {
            alert("✅ " + data.message);
            fetchAdminQuestions(); // Refresh bảng
        } else {
            alert("❌ Lỗi: " + data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối server.");
    }
};