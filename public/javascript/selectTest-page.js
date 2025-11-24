document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get('id');

    // Các biến DOM cho Modal
    const modal = document.getElementById('test-detail-modal');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const reviewContainer = document.getElementById('reviews-list-container');
    
    // Biến lưu trữ data category để dùng lại cho Modal (banner, theme)
    let currentCategoryData = null;

    if (!categoryId) {
        console.error('Không tìm thấy categoryId trên URL');
        document.getElementById('test-list-container').innerHTML = '<p class="error-msg">Lỗi: Không xác định được chủ đề.</p>';
        return;
    }

    // --- 1. Hàm lấy thông tin Category ---
    async function fetchCategoryInfo(categoryId) {
        try {
            const res = await fetch(`/api/category/${categoryId}`);
            if (!res.ok) throw new Error('Không thể lấy thông tin chủ đề');
            const data = await res.json();

            // Lưu lại data để lát nữa Modal dùng
            currentCategoryData = data;

            // Cập nhật giao diện trang chính
            const banner = document.querySelector('.topic-banner');
            if (banner && data.banner_image_url) {
                banner.style.backgroundImage = `url('${data.banner_image_url}')`;
            }

            document.getElementById('category-name').textContent = data.name || 'Chủ đề';
            document.getElementById('category-description').textContent = data.long_description || data.description || '';

            return data;
        } catch (err) {
            console.error('Lỗi fetch category:', err);
            document.getElementById('category-name').textContent = 'Không tìm thấy chủ đề';
            return null;
        }
    }

    // --- 2. Hàm lấy danh sách bài test ---
    async function fetchTests(categoryId, categoryData) {
        const container = document.getElementById('test-list-container');
        container.innerHTML = '<div class="loading-spinner"></div>';
        container.classList.remove('test-grid');
        container.classList.add('test-list-horizontal');

        try {
            const res = await fetch(`/api/tests?categoryId=${categoryId}`);
            if (!res.ok) throw new Error('Lỗi tải danh sách bài test');
            const tests = await res.json();

            if (tests.length === 0) {
                container.innerHTML = '<p class="no-results">Chưa có bài test nào cho chủ đề này.</p>';
                return;
            }

            container.innerHTML = ''; 

            const themeColor = categoryData.theme_color || '#63b3ed';
            const iconUrl = categoryData.icon_url;
            const iconClass = categoryData.icon;

            tests.forEach(test => {
                const wrapper = document.createElement('div');
                wrapper.className = 'test-item-wrapper';

                // Thay đổi từ thẻ <a> sang <div> để chặn chuyển trang
                const testItem = document.createElement('div');
                testItem.className = 'test-item-horizontal';
                testItem.style.setProperty('--theme-color', themeColor);
                testItem.style.cursor = 'pointer'; // Thêm con trỏ tay để biết là click được

                const numQuestions = test.numQuestions || test.questions?.length || 0;

                // Xử lý Icon
                let iconHTML = '';
                if (iconUrl) {
                    iconHTML = `<img src="${iconUrl}" alt="icon" class="test-icon-img">`;
                } else if (iconClass) {
                    iconHTML = `<i class="${iconClass}" style="color: ${themeColor}"></i>`;
                } else {
                    iconHTML = `<i class="fas fa-file-alt" style="color: ${themeColor}"></i>`;
                }

                testItem.innerHTML = `
                    <div class="test-icon-wrapper" style="border-color: ${themeColor}">
                        ${iconHTML}
                    </div>
                    <div class="test-content-wrapper">
                        <h3 class="test-item-title">${test.title}</h3>
                        <div class="test-item-meta">
                            <span class="meta-info">${numQuestions} câu hỏi</span>
                            <span class="meta-separator">•</span>
                            <span class="meta-info">Tác giả: DevArena Team</span>
                            <span class="meta-separator">•</span>
                            <span class="meta-difficulty ${test.difficulty}">
                                ${test.difficulty === 'easy' ? 'Dễ' : test.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                            </span>
                        </div>
                    </div>
                    <div class="test-arrow"><i class="fas fa-chevron-right"></i></div>
                `;

                // --- GẮN SỰ KIỆN CLICK ĐỂ MỞ MODAL ---
                testItem.addEventListener('click', () => {
                    openTestPopup(test);
                });

                wrapper.appendChild(testItem);
                container.appendChild(wrapper);
            });

        } catch (err) {
            console.error('Lỗi fetch tests:', err);
            container.innerHTML = '<p class="error-msg">Đã xảy ra lỗi khi tải bài test.</p>';
        }
    }

    // --- 3. Logic Xử lý Modal (Popup) ---

    function openTestPopup(test) {
        if (!modal) return;

        // A. Điền thông tin bài test vào Modal
        document.getElementById('modal-test-title').textContent = test.title;
        document.getElementById('modal-description').textContent = test.description || "Không có mô tả.";
        document.getElementById('modal-question-count').innerHTML = `<i class="fas fa-list"></i> ${test.numQuestions || 0} câu hỏi`;
        
        // Xử lý hiển thị độ khó trong modal
        const diffText = test.difficulty === 'easy' ? 'Dễ' : test.difficulty === 'medium' ? 'Trung bình' : 'Khó';
        document.getElementById('modal-difficulty').innerHTML = `<i class="fas fa-layer-group"></i> ${diffText}`;

        // Cập nhật nút "Bắt đầu"
        const btnStart = document.getElementById('btn-start-test');
        btnStart.href = `/pages/do-test.html?testId=${test._id}`;

        // B. Cập nhật Banner Modal (Lấy từ currentCategoryData đã lưu)
        const modalBanner = document.getElementById('modal-banner');
        if (currentCategoryData && currentCategoryData.banner_image_url) {
            modalBanner.style.backgroundImage = `url('${currentCategoryData.banner_image_url}')`;
        } else {
            modalBanner.style.backgroundImage = 'none';
            modalBanner.style.backgroundColor = currentCategoryData?.theme_color || '#2d3748';
        }

        // C. Hiển thị Modal
        modal.classList.add('show');

        // D. Gọi API lấy Reviews
        fetchReviews(test._id);
    }

    // --- 4. Hàm lấy Reviews ---
    async function fetchReviews(testId) {
        const reviewContainer = document.getElementById('reviews-list-container'); // Đảm bảo biến này đúng
        reviewContainer.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const res = await fetch(`/api/reviews?testId=${testId}`);
            if (!res.ok) throw new Error("Lỗi kết nối server");
            
            const reviews = await res.json();
            reviewContainer.innerHTML = ''; 

            if (!reviews || reviews.length === 0) {
                reviewContainer.innerHTML = '<p style="font-style:italic; color:#a0aec0; padding: 10px;">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>';
                return;
            }

            reviews.forEach(review => {
                // Tạo sao đánh giá
                let starsHtml = '';
                for(let i=1; i<=5; i++) {
                    if(i <= review.rating) starsHtml += '<i class="fas fa-star" style="color: #f6e05e;"></i>';
                    else starsHtml += '<i class="far fa-star" style="color: #cbd5e0;"></i>';
                }

                // --- HIỂN THỊ TÊN USER ---
                // Nếu server trả về userName thì dùng, không thì hiện "Ẩn danh"
                const displayName = review.userName || 'Người dùng ẩn danh';
                
                // Format ngày tháng (ngày/tháng/năm)
                const dateStr = new Date(review.createdAt).toLocaleDateString('vi-VN');

                const reviewEl = document.createElement('div');
                reviewEl.className = 'review-item';
                reviewEl.innerHTML = `
                    <div class="review-header">
                        <span style="font-weight: bold; color: #2d3748;">${displayName}</span>
                        <span class="review-rating">${starsHtml}</span>
                    </div>
                    <div class="review-comment">
                        ${review.comment || "Không có lời bình."}
                    </div>
                    <div style="font-size: 0.8rem; color: #a0aec0; margin-top: 5px;">
                        ${dateStr}
                    </div>
                `;
                reviewContainer.appendChild(reviewEl);
            });

        } catch (err) {
            console.error("Lỗi load review:", err);
            reviewContainer.innerHTML = '<p style="color:red; padding:10px;">Không tải được đánh giá.</p>';
        }
    }

    // --- 5. Sự kiện đóng Modal ---
    if(closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    // --- KHỞI CHẠY ---
    // Gọi tuần tự: Lấy Category trước -> Có data -> Mới lấy Test
    fetchCategoryInfo(categoryId).then(categoryData => {
        if (categoryData) {
            fetchTests(categoryId, categoryData);
        }
    });
});