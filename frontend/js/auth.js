// Authentication utilities for Shek's House
const Auth = {
    // Store token and user data
    login(token, userData) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(userData));
    },

    // Clear auth data
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'profile.html';
    },

    // Get stored token
    getToken() {
        return localStorage.getItem('authToken');
    },

    // Get user data
    getUserData() {
        const data = localStorage.getItem('userData');
        return data ? JSON.parse(data) : null;
    },

    // Get user ID
    getUserId() {
        const userData = this.getUserData();
        return userData ? userData.user_id : null;
    },

    // Check if user is logged in
    isLoggedIn() {
        return !!this.getToken() && !!this.getUserData();
    },

    // Check if user is admin
    isAdmin() {
        const userData = this.getUserData();
        return userData && userData.is_admin === 1;
    },

    // Update stored user data
    updateUserData(newData) {
        const currentData = this.getUserData();
        const updatedData = { ...currentData, ...newData };
        localStorage.setItem('userData', JSON.stringify(updatedData));
    }
};

// API utilities with automatic token handling
const API = {
    get baseURL() {
        return window.config?.baseURL || 'http://localhost:3006';
    },

    // Get headers with auth token
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (includeAuth && Auth.getToken()) {
            headers['Authorization'] = `Bearer ${Auth.getToken()}`;
        }
        return headers;
    },

    // Generic fetch wrapper
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(options.auth !== false),
                ...options.headers
            }
        };

        // Remove Content-Type for FormData
        if (options.body instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                // Handle token expiration
                if (response.status === 401 || response.status === 403) {
                    if (data.error === 'Invalid or expired token.') {
                        Auth.logout();
                        return;
                    }
                }
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // GET request
    async get(endpoint, auth = true) {
        return this.request(endpoint, { method: 'GET', auth });
    },

    // POST request
    async post(endpoint, body, auth = true) {
        const options = { method: 'POST', auth };
        if (body instanceof FormData) {
            options.body = body;
        } else {
            options.body = JSON.stringify(body);
        }
        return this.request(endpoint, options);
    },

    // PUT request
    async put(endpoint, body, auth = true) {
        const options = { method: 'PUT', auth };
        if (body instanceof FormData) {
            options.body = body;
        } else {
            options.body = JSON.stringify(body);
        }
        return this.request(endpoint, options);
    },

    // DELETE request
    async delete(endpoint, auth = true) {
        return this.request(endpoint, { method: 'DELETE', auth });
    }
};

// Show loading indicator
function showLoader(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="loader-container">
            <div class="loader"></div>
            <p>Chargement...</p>
        </div>
    `;
}

// Show error message
function showError(container, message) {
    if (!container) return;
    container.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <button onclick="location.reload()">Reessayer</button>
        </div>
    `;
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Format price
function formatPrice(price) {
    return `CA$ ${parseFloat(price).toFixed(2)}`;
}

// Legacy support - for backward compatibility
function getUserId() {
    return Auth.getUserId();
}
