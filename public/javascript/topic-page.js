// Chạy toàn bộ script sau khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', () => {

    // --- STATE QUẢN LÝ BỘ LỌC ---
    // Các biến này sẽ lưu trạng thái bộ lọc của toàn trang
    let activeTypeFilters = new Set();
    let activeTagFilters = new Set();

    /**
     * HÀM CHÍNH: Lấy dữ liệu từ server VỚI BỘ LỌC
     * và hiển thị kết quả lên trang.
     */
    function fetchAndRenderTopics() {
        const grid = document.getElementById("topics-container");
        if (!grid) {
            console.error("Không tìm thấy container #topics-container.");
            return;
        }

        // 1. Xây dựng URL với các tham số query
        const url = new URL('/api/topics', window.location.origin);
        
        if (activeTypeFilters.size > 0) {
            url.searchParams.set('types', Array.from(activeTypeFilters).join(','));
        }
        if (activeTagFilters.size > 0) {
            url.searchParams.set('tags', Array.from(activeTagFilters).join(','));
        }

        console.log("Đang fetch từ:", url.toString());

        // 2. Gửi yêu cầu fetch
        fetch(url.toString())
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(filteredTopics => {
                // 3. Render dữ liệu (đã được server lọc sẵn)
                grid.innerHTML = ""; // Xóa nội dung cũ
                if (filteredTopics.length === 0) {
                    grid.innerHTML = "<p class='noresults'>Không tìm thấy chủ đề nào phù hợp với bộ lọc của bạn!</p>";
                    return;
                }

                filteredTopics.forEach(item => {
                    const topicLink = document.createElement("a");
                    // Sử dụng _id từ MongoDB cho URL nếu có
                    topicLink.href = `/topic/${item._id || '#'}`; 
                    topicLink.className = "topic-card";
                    topicLink.innerHTML = `
                      <div class="topic-icon">
                        <i class="${item.icon || 'fas fa-question-circle'}"></i>
                      </div>
                      <div class="topic-content">
                        <h3>${item.name}</h3>
                        <p>${item.description}</p>
                      </div>
                    `;
                    grid.appendChild(topicLink);
                });
            })
            .catch(err => {
                console.error("Fetch error:", err);
                grid.innerHTML = "<p>Lỗi khi tải dữ liệu. Vui lòng thử lại sau.</p>";
            });
    }
    
    /**
     * Tải và thiết lập sự kiện cho các nút lọc TYPE.
     */
    function loadTypeFilters() {
        const container = document.getElementById("type-filters");
        if (!container) {
            console.error("Không tìm thấy container #type-filters.");
            return;
        }
    
        const types = [
            { key: "language", label: "Ngôn ngữ" },
            { key: "framework", label: "Framework" },
            { key: "tool", label: "Công cụ" },
            { key: "database", label: "Cơ sở dữ liệu" },
            { key: "career", label: "Lộ trình" },
            { key: "concept", label: "Khái niệm" }
        ];
        
        container.innerHTML = ""; 
        types.forEach(type => {
            const btn = document.createElement("button");
            btn.className = "type-btn";
            btn.textContent = type.label;
            btn.dataset.key = type.key;
            
            btn.addEventListener("click", () => {
                btn.classList.toggle("active");
                // Cập nhật state lọc TYPE
                if (btn.classList.contains("active")) {
                    activeTypeFilters.add(type.key);
                } else {
                    activeTypeFilters.delete(type.key);
                }
                
                // Gọi hàm fetch chính để cập nhật danh sách
                fetchAndRenderTopics();
            });
            container.appendChild(btn);
        });
    }

    /**
     * Thiết lập và quản lý logic cho hộp thoại chọn TAGS.
     */
    function setupTagModal() {
        // Lấy các phần tử DOM
        const openModalBtn = document.getElementById('open-tags-modal-btn');
        const modalOverlay = document.getElementById('tags-modal-overlay');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const applyTagsBtn = document.getElementById('apply-tags-btn');
        const modalTagsList = document.getElementById('modal-tags-list');
        const selectedTagsContainer = document.getElementById('selected-tags-container');
        const clearTagsBtn = document.getElementById('clear-tags-btn');

        // Kiểm tra nếu thiếu phần tử DOM thì không chạy
        if (!openModalBtn || !modalOverlay || !closeModalBtn || !applyTagsBtn || !modalTagsList || !selectedTagsContainer || !clearTagsBtn) {
            console.warn("Một số phần tử DOM của modal tag bị thiếu. Tính năng lọc tag có thể không hoạt động.");
            return;
        }

        // Dữ liệu cho tất cả các tag có sẵn
        const tagGroups = [
            { icon: "🌐", title: "Web Development", tags: ["frontend", "backend", "web", "fullstack", "html", "css", "javascript", "typescript"] },
            { icon: "⚙️", title: "Concepts / Software", tags: ["programming", "coding", "development", "software", "architecture", "api", "oop", "design-pattern"] },
            { icon: "🧰", title: "Tools & DevOps", tags: ["tool", "git", "version-control", "devops", "automation", "ci-cd", "docker", "kubernetes"] },
            { icon: "🗃️", title: "Databases & Data", tags: ["database", "data", "sql", "nosql", "mongodb", "postgresql", "redis"] },
            { icon: "🧠", title: "AI / Data Science", tags: ["ai", "machine-learning", "data-science", "tensorflow", "pytorch"] },
            { icon: "📱", title: "Mobile Development", tags: ["mobile", "android", "ios", "react-native", "flutter"] },
            { icon: "💡", title: "UI/UX & Design", tags: ["ui", "ux", "design", "figma", "sketch"] }
        ];

        let modalTemporaryTags = new Set(); // Chỉ lưu tạm thời các tag đang chọn trong modal

        // Hàm mở hộp thoại
        function openModal() {
            // Lấy state hiện tại của activeTagFilters gán cho bộ lọc tạm
            modalTemporaryTags = new Set(activeTagFilters);
            populateTagsModal();
            modalOverlay.classList.add('show');
        }
        
        // Hàm đóng hộp thoại
        function closeModal() {
            modalOverlay.classList.remove('show');
        }

        // Hàm tạo và hiển thị các tag trong hộp thoại
        function populateTagsModal() {
            modalTagsList.innerHTML = '';
            tagGroups.forEach(group => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'tag-group';
                
                const tagsHTML = group.tags.map(tag => {
                    // Kiểm tra 'active' dựa trên bộ lọc tạm
                    const isActive = modalTemporaryTags.has(tag) ? 'active' : '';
                    return `<button class="tag-btn ${isActive}" data-tag="${tag}">${tag}</button>`;
                }).join('');

                groupDiv.innerHTML = `<h3>${group.icon} ${group.title}</h3><div class="tag-buttons">${tagsHTML}</div>`;
                modalTagsList.appendChild(groupDiv);
            });
        }
        
        // Hàm cập nhật giao diện các tag đã chọn trên trang chính
        function updateSelectedTagsDisplay() {
            selectedTagsContainer.innerHTML = '';
            // Đọc trực tiếp từ state chính 'activeTagFilters'
            if (activeTagFilters.size === 0) {
                selectedTagsContainer.innerHTML = `<p class="no-tags-selected">Chưa có tag nào được chọn.</p>`;
            } else {
                activeTagFilters.forEach(tag => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'selected-tag-item';
                    tagEl.textContent = tag;
                    selectedTagsContainer.appendChild(tagEl);
                });
            }
        }

        // Gắn sự kiện
        openModalBtn.addEventListener('click', openModal);
        closeModalBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) { closeModal(); }
        });

        // Xử lý chọn/bỏ chọn tag BÊN TRONG HỘP THOẠI
        modalTagsList.addEventListener('click', (e) => {
            if (e.target.matches('.tag-btn')) {
                const btn = e.target;
                const tag = btn.dataset.tag;
                btn.classList.toggle('active');

                // Cập nhật bộ lọc tạm
                if (btn.classList.contains('active')) {
                    modalTemporaryTags.add(tag);
                } else {
                    modalTemporaryTags.delete(tag);
                }
            }
        });

        // Xử lý khi nhấn nút "Áp dụng"
        applyTagsBtn.addEventListener('click', () => {
            // CẬP NHẬT STATE CHÍNH
            activeTagFilters = new Set(modalTemporaryTags); 
            
            updateSelectedTagsDisplay(); // Cập nhật UI
            closeModal();
            console.log("Các tags đã áp dụng:", Array.from(activeTagFilters));
            
            // Gọi hàm fetch chính để cập nhật danh sách
            fetchAndRenderTopics();
        });

        clearTagsBtn.addEventListener('click', () => {
            modalTemporaryTags.clear();
            populateTagsModal(); 
        });

        // Hiển thị các tag đã chọn (nếu có) khi tải trang
        updateSelectedTagsDisplay();
    }

    // --- KHỞI CHẠY ỨNG DỤNG ---
    loadTypeFilters();      // 1. Tải các nút lọc 'type'
    setupTagModal();        // 2. Thiết lập logic cho 'tags' modal
    fetchAndRenderTopics(); // 3. Tải dữ liệu lần đầu tiên (không có bộ lọc)
});