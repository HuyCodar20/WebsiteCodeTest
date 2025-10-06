const categoryBtn = document.getElementById('category-btn');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navWrapper = document.getElementById('nav-wrapper');

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

    window.addEventListener('click', function(event) {
        const dropdown = document.querySelector('.dropdown');
        if (dropdown && dropdown.classList.contains('active') && !dropdown.contains(event.target)) {
            dropdown.classList.remove('active');
        }

        if (navWrapper && navWrapper.classList.contains('active') && !navWrapper.contains(event.target) && !hamburgerBtn.contains(event.target)) {
            navWrapper.classList.remove('active');
        }
    });