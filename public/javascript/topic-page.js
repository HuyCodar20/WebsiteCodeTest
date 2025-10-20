function loadTopics() {
  const container = document.getElementById("topics-container");
  if (!container) return; 

  fetch("/api/topics")
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      container.innerHTML = ""; // Xóa nội dung cũ
      data.forEach(item => {
        const topicLink = document.createElement("a");
        topicLink.href = "#"; // Hoặc item.url nếu có
        topicLink.className = "topic-card";
        topicLink.innerHTML = `
          <div class="topic-icon">
            <i class="${item.icon}"></i>
          </div>
          <div class="topic-content">
            <h3>${item.name}</h3>
            <p>${item.description}</p>
          </div>
        `;
        container.appendChild(topicLink);
      });
    })
    .catch(err => {
      console.error("Fetch error:", err);
      container.innerHTML = "<p>Lỗi khi tải dữ liệu. Vui lòng thử lại sau.</p>";
    });
}

/**
 * Tải và hiển thị các bộ lọc theo danh mục (type).
 */
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

  types.forEach(type => {
    const btn = document.createElement("button");
    btn.className = "type-btn";
    btn.textContent = type.label;
    btn.dataset.key = type.key;
    btn.addEventListener("click", () => btn.classList.toggle("active"));
    container.appendChild(btn);
  });
}

/**
 * Thiết lập và quản lý logic cho hộp thoại chọn tags.
 */
function setupTagModal() {
    // Lấy các phần tử DOM cần thiết
    const openModalBtn = document.getElementById('open-tags-modal-btn');
    const modalOverlay = document.getElementById('tags-modal-overlay');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const applyTagsBtn = document.getElementById('apply-tags-btn');
    const modalTagsList = document.getElementById('modal-tags-list');
    const selectedTagsContainer = document.getElementById('selected-tags-container');

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

    // State: Sử dụng Set để lưu các tag đã chọn (hiệu quả cho việc thêm/xóa)
    let mainSelectedTags = new Set();
    let modalTemporaryTags = new Set();

    // Hàm để mở hộp thoại
    function openModal() {
        // Sao chép các tag đã chọn từ trang chính vào bộ nhớ tạm của modal
        modalTemporaryTags = new Set(mainSelectedTags);
        populateTagsModal();
        modalOverlay.classList.add('show');
    }
    
    // Hàm để đóng hộp thoại
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
        if (mainSelectedTags.size === 0) {
            selectedTagsContainer.innerHTML = `<p class="no-tags-selected">Chưa có tag nào được chọn.</p>`;
        } else {
            mainSelectedTags.forEach(tag => {
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
        if (e.target === modalOverlay) { // Chỉ đóng khi nhấn vào lớp phủ
            closeModal();
        }
    });

    // Xử lý việc chọn/bỏ chọn tag bên trong hộp thoại
    modalTagsList.addEventListener('click', (e) => {
        if (e.target.matches('.tag-btn')) {
            const btn = e.target;
            const tag = btn.dataset.tag;
            btn.classList.toggle('active');

            if (btn.classList.contains('active')) {
                modalTemporaryTags.add(tag);
            } else {
                modalTemporaryTags.delete(tag);
            }
        }
    });

    // Xử lý khi nhấn nút "Áp dụng"
    applyTagsBtn.addEventListener('click', () => {
        mainSelectedTags = new Set(modalTemporaryTags); // Cập nhật lựa chọn chính thức
        updateSelectedTagsDisplay();
        closeModal();
        console.log("Các tags đã áp dụng:", Array.from(mainSelectedTags));
        // Tại đây bạn có thể gọi hàm lọc sản phẩm dựa trên mainSelectedTags
    });
}

// Chạy các hàm khi trang được tải
loadTopics();
loadTypeFilters();
setupTagModal();
