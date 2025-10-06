document.addEventListener("DOMContentLoaded", function() {

    const initializeHeaderScripts = () => {
        const categoryBtn = document.getElementById('category-btn');
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const navWrapper = document.getElementById('nav-wrapper');
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const settingsOverlay = document.getElementById('settings-overlay');
        const closeModalBtn = document.getElementById('close-modal-btn');

        if (categoryBtn) {
            const dropdown = categoryBtn.closest('.dropdown');
            categoryBtn.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                dropdown.classList.toggle('active');
            });
        }

        if (hamburgerBtn && navWrapper) {
            hamburgerBtn.addEventListener('click', function(event) {
                event.stopPropagation();
                navWrapper.classList.toggle('active');
            });
        }

        const openSettingsModal = () => {
            if (settingsModal && settingsOverlay) {
                settingsModal.classList.add('active');
                settingsOverlay.classList.add('active');
            }
        };

        const closeSettingsModal = () => {
            if (settingsModal && settingsOverlay) {
                settingsModal.classList.remove('active');
                settingsOverlay.classList.remove('active');
            }
        };

        if (settingsBtn && settingsModal && settingsOverlay && closeModalBtn) {
            settingsBtn.addEventListener('click', function(event) {
                event.preventDefault();
                openSettingsModal();
            });
            closeModalBtn.addEventListener('click', closeSettingsModal);
            settingsOverlay.addEventListener('click', closeSettingsModal);
        }

        window.addEventListener('click', function(event) {
            const activeDropdown = document.querySelector('.dropdown.active');
            if (activeDropdown && !activeDropdown.contains(event.target)) {
                activeDropdown.classList.remove('active');
            }

            if (navWrapper && navWrapper.classList.contains('active') && !navWrapper.contains(event.target) && !hamburgerBtn.contains(event.target)) {
                navWrapper.classList.remove('active');
            }
        });
    };

    const loadComponent = (url, elementId, callback) => {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Không thể tải ${url}. Trạng thái: ${response.status}`);
                return response.text();
            })
            .then(data => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.innerHTML = data;
                    if (callback) callback();
                }
            })
            .catch(error => console.error('Lỗi khi tải thành phần:', error));
    };

    loadComponent('/pages/header.html', 'header-placeholder', initializeHeaderScripts);
    loadComponent('/pages/footer.html', 'footer-placeholder');

    // --- Logic cho Slideshow ---
    let slideIndex = 0;
    let slideInterval;
    const slides = document.getElementsByClassName("slide");

    const showSlides = () => {
        if (slides.length === 0) return;
        for (let i = 0; i < slides.length; i++) {
            slides[i].style.display = "none";
        }
        slideIndex++;
        if (slideIndex > slides.length) {
            slideIndex = 1;
        }
        slides[slideIndex - 1].style.display = "block";
    };

    const startSlideShow = () => {
        showSlides();
        slideInterval = setInterval(showSlides, 5000);
    };

    window.plusSlides = (n) => {
        clearInterval(slideInterval);
        slideIndex += n;
        if (slideIndex > slides.length) {
            slideIndex = 1;
        }
        if (slideIndex < 1) {
            slideIndex = slides.length;
        }
        for (let i = 0; i < slides.length; i++) {
            slides[i].style.display = "none";
        }
        slides[slideIndex - 1].style.display = "block";
        startSlideShow();
    };

    if (slides.length > 0) {
        startSlideShow();
    }
    
    // --- Logic cho Tabs ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });

});