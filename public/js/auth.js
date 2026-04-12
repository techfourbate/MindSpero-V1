axios.defaults.baseURL = 'http://localhost:3000';

function logout() {
    localStorage.removeItem('token');
    window.location.href = './login.html';
}

const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token && !window.location.pathname.includes('login') && !window.location.pathname.includes('register') && window.location.pathname !== '/') {
        window.location.href = './login.html';
    }

    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
};

checkAuth();
