document.addEventListener('DOMContentLoaded', () => {
    // 1. Lấy ID bài thi từ URL (Ví dụ: /test-review?id=656...)
    const urlParams = new URLSearchParams(window.location.search);
    const reviewId = urlParams.get('id');

    if (!reviewId) {
        alert("Không tìm thấy mã bài thi!");
        window.location.href = '/profile';
        return;
    }

    fetchReviewDetails(reviewId);
});

async function fetchReviewDetails(reviewId) {
    try {
        // Gọi API mà bạn đã định nghĩa trong server.js
        const response = await fetch(`/api/reviews/${reviewId}`);
        
        if (!response.ok) {
            throw new Error('Không thể tải dữ liệu bài thi.');
        }

        const data = await response.json();
        renderPage(data);

    } catch (error) {
        console.error("Lỗi:", error);
        alert("Có lỗi xảy ra khi tải kết quả: " + error.message);
        document.getElementById('loading-overlay').innerHTML = '<p style="color:red">Lỗi tải dữ liệu.</p>';
    }
}

function renderPage(data) {
    // Ẩn loading, hiện nội dung
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';

    // 1. Render Summary (Phần trên cùng)
    document.getElementById('score-display').textContent = data.Score;
    document.getElementById('topic-name').textContent = data.Category?.name || "Không xác định";
    document.getElementById('correct-count').textContent = `${data.CorrectCount} / ${data.TotalQuestions}`;
    document.getElementById('time-taken').textContent = formatTime(data.TimeTaken);
    document.getElementById('completed-at').textContent = new Date(data.CompletedAt).toLocaleString('vi-VN');

    // Đổi màu điểm số
    const scoreCircle = document.querySelector('.score-circle');
    if(data.Score >= 8) scoreCircle.style.borderColor = '#10b981'; // Xanh lá
    else if(data.Score >= 5) scoreCircle.style.borderColor = '#f59e0b'; // Vàng
    else scoreCircle.style.borderColor = '#ef4444'; // Đỏ

    // 2. Render Chi tiết câu hỏi
    const container = document.getElementById('questions-container');
    container.innerHTML = ''; // Reset

    data.details.forEach((detail, index) => {
        const questionHtml = createQuestionCard(detail, index);
        container.insertAdjacentHTML('beforeend', questionHtml);
    });
}

function createQuestionCard(detail, index) {
    // Xác định trạng thái câu này (Đúng hay Sai)
    const isCorrectAnswered = detail.isCorrect;
    const statusClass = isCorrectAnswered ? 'status-correct' : 'status-wrong';
    const statusIcon = isCorrectAnswered ? '<i class="fas fa-check"></i> Đúng' : '<i class="fas fa-times"></i> Sai';
    
    // Xử lý ảnh (nếu có)
    let imageHtml = '';
    if (detail.Image) {
        const imgUrl = detail.Image.startsWith('http') ? detail.Image : detail.Image; 
        imageHtml = `<img src="${imgUrl}" class="question-img" alt="Hình minh họa">`;
    }

    // Xử lý danh sách đáp án
    // Lưu ý: Server trả về 'AllChoices' trong object detail (như logic server.js group 5)
    const choicesHtml = detail.AllChoices.map(choice => {
        let choiceClass = 'choice-item';
        let icon = '<i class="far fa-circle"></i>'; // Icon mặc định

        // Logic tô màu:
        // 1. Đây là đáp án ĐÚNG của hệ thống
        if (choice._id === detail.correctChoiceId) {
            choiceClass += ' correct';
            icon = '<i class="fas fa-check-circle"></i>';
        }

        // 2. Đây là đáp án USER đã chọn
        if (choice._id === detail.userChoiceId) {
            choiceClass += ' selected';
            // Nếu user chọn sai, thì thêm class wrong để tô đỏ
            if (choice._id !== detail.correctChoiceId) {
                choiceClass += ' wrong';
                icon = '<i class="fas fa-times-circle"></i>';
            }
        }

        return `
            <div class="${choiceClass}">
                <span class="choice-icon">${icon}</span>
                <span class="choice-text">${escapeHtml(choice.choiceText)}</span>
            </div>
        `;
    }).join('');

    // Giải thích (nếu có)
    const explanationHtml = detail.Explanation 
        ? `<div class="explanation-box">
            <strong><i class="fas fa-lightbulb"></i> Giải thích:</strong> ${escapeHtml(detail.Explanation)}
           </div>` 
        : '';

    return `
        <div class="question-card ${statusClass}">
            <div class="q-header">
                <span class="q-number">Câu ${index + 1}</span>
                <span class="q-status">${statusIcon}</span>
            </div>
            
            <div class="q-content">
                <p class="q-text">${escapeHtml(detail.QuestionText)}</p>
                ${imageHtml}
            </div>

            <div class="choices-list">
                ${choicesHtml}
            </div>

            ${explanationHtml}
        </div>
    `;
}

// Hàm phụ trợ
function formatTime(seconds) {
    if (!seconds) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}