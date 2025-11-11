document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get('id');

    if (!categoryId) {
        console.error('Không tìm thấy categoryId trên URL');
        document.getElementById('test-list-container').innerHTML = '<p class="error-msg">Lỗi: Không xác định được chủ đề.</p>';
        return;
    }

    // --- Hàm lấy thông tin Category ---
    async function fetchCategoryInfo(categoryId) {
        try {
            const res = await fetch(`/api/category/${categoryId}`);
            if (!res.ok) throw new Error('Không thể lấy thông tin chủ đề');
            const data = await res.json();

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

    // --- Hàm lấy danh sách bài test ---
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

            container.innerHTML = ''; // Xóa loading

            const themeColor = categoryData.theme_color || '#63b3ed';
            const iconUrl = categoryData.icon_url;
            const iconClass = categoryData.icon;

            tests.forEach(test => {
                const wrapper = document.createElement('div');
                wrapper.className = 'test-item-wrapper';

                const testItem = document.createElement('a');
                testItem.href = `/pages/do-test.html?testId=${test._id}`;
                testItem.className = 'test-item-horizontal';
                testItem.style.setProperty('--theme-color', themeColor);

                const numQuestions = test.numQuestions || test.questions?.length || 0;

                // Icon ưu tiên icon_url
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
                `;
                // Gom 2 phần vào wrapper
                wrapper.appendChild(testItem);
                container.appendChild(wrapper);
            });

        } catch (err) {
            console.error('Lỗi fetch tests:', err);
            container.innerHTML = '<p class="error-msg">Đã xảy ra lỗi khi tải bài test.</p>';
        }
    }

    // Gọi tuần tự
    fetchCategoryInfo(categoryId).then(categoryData => {
        if (categoryData) {
            fetchTests(categoryId, categoryData);
        }
    });
});
