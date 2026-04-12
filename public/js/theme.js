const themeToggleBtn = document.getElementById('themeToggle');
const body = document.body;

// Check localStorage
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'light') {
    body.classList.add('light-mode');
    if (themeToggleBtn) themeToggleBtn.innerText = '🌙';
} else {
    // Default or dark
    if (themeToggleBtn) themeToggleBtn.innerText = '☀️';
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        if (body.classList.contains('light-mode')) {
            localStorage.setItem('theme', 'light');
            themeToggleBtn.innerText = '🌙';
        } else {
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.innerText = '☀️';
        }
    });
}
