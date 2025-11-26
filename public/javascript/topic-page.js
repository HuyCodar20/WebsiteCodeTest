document.addEventListener('DOMContentLoaded', () => {

    // --- STATE QUẢN LÝ BỘ LỌC ---
    let activeTypeFilters = new Set();
    let activeTagFilters = new Set();
    let currentSearchTerm = "";
    
    /**
     * Cập nhật giao diện danh sách các tag đang được chọn
     */
    function updateSelectedTagsDisplay() {
        const container = document.getElementById('selected-tags-container');
        if (!container) return;

        container.innerHTML = '';
        
        if (activeTagFilters.size === 0) {
            container.innerHTML = `<p class="no-tags-selected">Chưa có tag nào được chọn.</p>`;
        } else {
            activeTagFilters.forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.className = 'selected-tag-item';
                tagEl.textContent = tag;
                // Thêm sự kiện click để xóa nhanh tag (Optional)
                tagEl.addEventListener('click', () => {
                    activeTagFilters.delete(tag);
                    updateSelectedTagsDisplay();
                    fetchAndRenderTopics();
                });
                container.appendChild(tagEl);
            });
        }
    }

    // --- CÁC HÀM CHỨC NĂNG CHÍNH ---

    function fetchAndRenderTopics() {
        const grid = document.getElementById("topics-container");
        if (!grid) return;

        const url = new URL('/api/topics', window.location.origin);
        
        if (activeTypeFilters.size > 0) {
            url.searchParams.set('types', Array.from(activeTypeFilters).join(','));
        }
        if (activeTagFilters.size > 0) {
            url.searchParams.set('tags', Array.from(activeTagFilters).join(','));
        }
        if (currentSearchTerm) {
            url.searchParams.set('search', currentSearchTerm);
        }

        fetch(url.toString())
            .then(res => res.json())
            .then(filteredTopics => {
                grid.innerHTML = "";
                if (filteredTopics.length === 0) {
                    grid.innerHTML = "<p class='noresults'>Không tìm thấy chủ đề nào phù hợp!</p>";
                    return;
                }
                filteredTopics.forEach(item => {
                    const topicLink = document.createElement("a");
                    topicLink.href = `/pages/selectTest.html?id=${item._id}`; 
                    topicLink.className = "topic-card";
                    topicLink.innerHTML = `
                      <div class="topic-icon"><i class="${item.icon || 'fas fa-question-circle'}"></i></div>
                      <div class="topic-content">
                        <h3>${item.name}</h3>
                        <p>${item.description}</p>
                      </div>
                    `;
                    grid.appendChild(topicLink);
                });
            })
            .catch(err => console.error(err));
    }
    
    function loadTypeFilters() {
        const container = document.getElementById("type-filters");
        if (!container) return;
    
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
                if (btn.classList.contains("active")) {
                    activeTypeFilters.add(type.key);
                } else {
                    activeTypeFilters.delete(type.key);
                }
                fetchAndRenderTopics();
            });
            container.appendChild(btn);
        });
    }

    function setupTagModal() {
        const openModalBtn = document.getElementById('open-tags-modal-btn');
        const modalOverlay = document.getElementById('tags-modal-overlay');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const applyTagsBtn = document.getElementById('apply-tags-btn');
        const modalTagsList = document.getElementById('modal-tags-list');
        const clearTagsBtn = document.getElementById('clear-tags-btn');

        if (!openModalBtn || !modalOverlay) return;

        // Dữ liệu tags (Giữ nguyên như cũ)
        const tagGroups = [
            { icon: "🌐", title: "Web Development", tags: ["frontend", "backend", "web", "fullstack", "html", "css", "javascript", "typescript"] },
            { icon: "⚙️", title: "Concepts / Software", tags: ["programming", "coding", "development", "software", "architecture", "api", "oop", "design-pattern"] },
            { icon: "🧰", title: "Tools & DevOps", tags: ["tool", "git", "version-control", "devops", "automation", "ci-cd", "docker", "kubernetes", "testing", "security"] }, // Đã thêm testing, security vào đây cho khớp với MainPage
            { icon: "🗃️", title: "Databases & Data", tags: ["database", "data", "sql", "nosql", "mongodb", "postgresql", "redis"] },
            { icon: "🧠", title: "AI / Data Science", tags: ["ai", "machine-learning", "data-science", "tensorflow", "pytorch"] },
            { icon: "📱", title: "Mobile Development", tags: ["mobile", "android", "ios", "react-native", "flutter"] }
        ];

        let modalTemporaryTags = new Set(); 

        function openModal() {
            modalTemporaryTags = new Set(activeTagFilters);
            populateTagsModal();
            modalOverlay.classList.add('show');
        }
        
        function closeModal() {
            modalOverlay.classList.remove('show');
        }

        function populateTagsModal() {
            modalTagsList.innerHTML = '';
            tagGroups.forEach(group => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'tag-group';
                const tagsHTML = group.tags.map(tag => {
                    const isActive = modalTemporaryTags.has(tag) ? 'active' : '';
                    return `<button class="tag-btn ${isActive}" data-tag="${tag}">${tag}</button>`;
                }).join('');
                groupDiv.innerHTML = `<h3>${group.icon} ${group.title}</h3><div class="tag-buttons">${tagsHTML}</div>`;
                modalTagsList.appendChild(groupDiv);
            });
        }

        openModalBtn.addEventListener('click', openModal);
        closeModalBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

        modalTagsList.addEventListener('click', (e) => {
            if (e.target.matches('.tag-btn')) {
                const btn = e.target;
                const tag = btn.dataset.tag;
                btn.classList.toggle('active');
                if (btn.classList.contains('active')) modalTemporaryTags.add(tag);
                else modalTemporaryTags.delete(tag);
            }
        });

        applyTagsBtn.addEventListener('click', () => {
            activeTagFilters = new Set(modalTemporaryTags); 
            updateSelectedTagsDisplay(); // Gọi hàm cập nhật UI
            closeModal();
            fetchAndRenderTopics();
        });

        clearTagsBtn.addEventListener('click', () => {
            modalTemporaryTags.clear();
            populateTagsModal(); 
        });
    }

    function setupSearch() {
        const searchForm = document.querySelector('.search-form');
        if (!searchForm) return;
        const searchInput = searchForm.querySelector('input[type="search"]');

        searchForm.addEventListener('submit', (event) => {
            event.preventDefault(); 
            currentSearchTerm = searchInput.value.trim();
            fetchAndRenderTopics();
        });
    }

    // Hàm này đọc URL và áp dụng bộ lọc
    function applyFiltersFromURL() {
        const params = new URLSearchParams(window.location.search);
        
        // 1. Đọc tags
        const tagsParam = params.get('tags');
        if (tagsParam) {
            tagsParam.split(',').forEach(tag => activeTagFilters.add(tag));
            
            // --- QUAN TRỌNG: Cập nhật UI ngay lập tức ---
            updateSelectedTagsDisplay();
        }

        // 2. Đọc types
        const typesParam = params.get('types');
        if (typesParam) {
            typesParam.split(',').forEach(type => activeTypeFilters.add(type));
        }

        // 3. Đọc search
        const searchParam = params.get('search');
        if (searchParam) {
            currentSearchTerm = searchParam;
            const searchInput = document.querySelector('.search-form input[type="search"]');
            if (searchInput) searchInput.value = searchParam;
        }
        
        // Update UI trạng thái nút Type
        document.querySelectorAll('.type-btn').forEach(btn => {
            if (activeTypeFilters.has(btn.dataset.key)) {
                btn.classList.add('active');
            }
        });
    }

    // --- KHỞI CHẠY ỨNG DỤNG ---
    loadTypeFilters();      
    setupTagModal();        
    setupSearch();          
    
    // Gọi hàm này trước khi fetch
    applyFiltersFromURL();  
    
    fetchAndRenderTopics(); 
});