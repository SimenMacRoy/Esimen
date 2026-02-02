// Profile page with JWT authentication

// Use global config from config.js (fallback for local dev)
if (typeof config === 'undefined') {
    var config = window.config || { baseURL: 'http://localhost:3006' };
}

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');
    const profileSection = document.getElementById('profile-section');
    const registerFormSection = document.getElementById('register-form-section');
    const loginFormSection = document.getElementById('login-form-section');
    const registerButton = document.getElementById('register-button');
    const modifyProfileSection = document.getElementById('modify-profile-section');
    const modifyProfileForm = document.getElementById('modify-profile-form');
    const modifyButton = document.getElementById('modify-account');
    const deleteButton = document.getElementById('delete-account');
    const logoutButton = document.getElementById('logout-button');
    const addProductButton = document.getElementById('add-product-button');
    const manageProductButton = document.getElementById('manage-product-button');
    const manageUsersButton = document.getElementById('manage-users-button');
    const manageCatalogButton = document.getElementById('manage-catalog-button');
    const manageCouponsButton = document.getElementById('manage-coupons-button');
    const manageOrdersButton = document.getElementById('manage-orders-button');

    // Check if user is logged in
    if (Auth.isLoggedIn()) {
        displayProfile(Auth.getUserData());
        loginFormSection.style.display = 'none';
        profileSection.style.display = 'block';
    }

    // Check URL params for registration redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('register') === 'true') {
        loginFormSection.style.display = 'none';
        registerFormSection.style.display = 'flex';
    }

    // Show registration form
    registerButton.addEventListener('click', () => {
        loginFormSection.style.display = 'none';
        registerFormSection.style.display = 'flex';
    });

    // Handle login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.classList.add('btn-loading');
        submitBtn.disabled = true;

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${config.baseURL}/api/users/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const result = await response.json();

            if (response.ok && result.isRegistered) {
                // Store token and user data
                Auth.login(result.token, result.userData);
                displayProfile(result.userData);
                loginFormSection.style.display = 'none';
                profileSection.style.display = 'block';
                showToast('Connexion reussie!', 'success');
            } else if (result.isRegistered === false) {
                showToast('Cet email n\'est pas enregistre.', 'error');
            } else {
                showToast(result.error || 'Email ou mot de passe incorrect.', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Erreur de connexion. Reessayez.', 'error');
        } finally {
            submitBtn.classList.remove('btn-loading');
            submitBtn.disabled = false;
        }
    });

    // Handle registration
    const registerForm = document.getElementById('register-form');
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        submitBtn.classList.add('btn-loading');
        submitBtn.disabled = true;

        const address = document.getElementById('reg-address').value;
        const city = document.getElementById('reg-city').value;
        const postalCode = document.getElementById('reg-postal-code').value;
        const fullAddress = `${address}, ${city}, ${postalCode}`;

        const userData = {
            name: document.getElementById('reg-name').value,
            surname: document.getElementById('reg-surname').value,
            phone: document.getElementById('reg-phone').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value,
            address: fullAddress,
        };

        try {
            const response = await fetch(`${config.baseURL}/api/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Auto-login after registration
                const loginData = {
                    ...userData,
                    user_id: result.user_id,
                    is_admin: 0
                };
                Auth.login(result.token, loginData);
                displayProfile(loginData);
                registerFormSection.style.display = 'none';
                profileSection.style.display = 'block';
                showToast('Inscription reussie!', 'success');
            } else {
                showToast(result.error || 'Erreur lors de l\'inscription.', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showToast('Erreur de connexion. Reessayez.', 'error');
        } finally {
            submitBtn.classList.remove('btn-loading');
            submitBtn.disabled = false;
        }
    });

    // Orders button
    const ordersButton = document.getElementById('orders-button');
    if (ordersButton) {
        ordersButton.addEventListener('click', () => {
            window.location.href = 'orders.html';
        });
    }

    // Admin buttons
    addProductButton.addEventListener('click', () => {
        window.location.href = 'add-product.html';
    });

    manageProductButton.addEventListener('click', () => {
        window.location.href = 'manage-products.html';
    });

    manageUsersButton.addEventListener('click', () => {
        window.location.href = 'manage-users.html';
    });

    manageCatalogButton.addEventListener('click', () => {
        window.location.href = 'manage-catalog.html';
    });

    manageCouponsButton.addEventListener('click', () => {
        window.location.href = 'manage-coupons.html';
    });

    manageOrdersButton.addEventListener('click', () => {
        window.location.href = 'manage-orders.html';
    });

    // Prefill modify form
    modifyButton.addEventListener('click', () => {
        const userData = Auth.getUserData();
        if (userData) {
            document.getElementById('mod-name').value = userData.name || '';
            document.getElementById('mod-surname').value = userData.surname || '';
            document.getElementById('mod-phone').value = userData.phone || '';
            document.getElementById('mod-email').value = userData.email || '';
            document.getElementById('mod-address').value = userData.address || '';
            modifyProfileSection.style.display = 'block';
        }
    });

    // Handle profile modification
    modifyProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = modifyProfileForm.querySelector('button[type="submit"]');
        submitBtn.classList.add('btn-loading');
        submitBtn.disabled = true;

        const updatedData = {
            name: document.getElementById('mod-name').value,
            surname: document.getElementById('mod-surname').value,
            phone: document.getElementById('mod-phone').value,
            email: document.getElementById('mod-email').value,
            password: document.getElementById('mod-password').value || undefined,
            address: document.getElementById('mod-address').value,
        };

        // Remove empty password
        if (!updatedData.password) delete updatedData.password;

        try {
            const response = await fetch(`${config.baseURL}/api/users/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify(updatedData),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Update local storage
                const currentData = Auth.getUserData();
                Auth.updateUserData({ ...currentData, ...updatedData });
                displayProfile(Auth.getUserData());
                modifyProfileSection.style.display = 'none';
                showToast('Profil modifie avec succes!', 'success');
            } else {
                showToast(result.error || 'Erreur lors de la modification.', 'error');
            }
        } catch (error) {
            console.error('Update error:', error);
            showToast('Erreur de connexion. Reessayez.', 'error');
        } finally {
            submitBtn.classList.remove('btn-loading');
            submitBtn.disabled = false;
        }
    });

    // Handle account deletion
    deleteButton.addEventListener('click', async () => {
        if (!confirm('Etes-vous sur de vouloir supprimer votre compte? Cette action est irreversible.')) {
            return;
        }

        try {
            const response = await fetch(`${config.baseURL}/api/users/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showToast('Compte supprime avec succes.', 'success');
                Auth.logout();
            } else {
                showToast(result.error || 'Erreur lors de la suppression.', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Erreur de connexion. Reessayez.', 'error');
        }
    });

    // Handle logout
    logoutButton.addEventListener('click', () => {
        Auth.logout();
        window.location.href = '../index.html';
    });

    // Handle profile picture upload
    const editAvatarBtn = document.getElementById('edit-avatar-btn');
    const profilePictureInput = document.getElementById('profile-picture-input');

    if (editAvatarBtn && profilePictureInput) {
        editAvatarBtn.addEventListener('click', () => {
            profilePictureInput.click();
        });

        profilePictureInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast('Veuillez selectionner une image.', 'error');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast('L\'image doit faire moins de 5MB.', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('profile_picture', file);

            try {
                const response = await fetch(`${config.baseURL}/api/users/profile-picture`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${Auth.getToken()}`
                    },
                    body: formData
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    // Update the profile picture display
                    const profileImg = document.getElementById('profile-picture');
                    profileImg.src = result.profilePicture.startsWith('http') ? result.profilePicture : `${config.baseURL}${result.profilePicture}`;

                    // Update userData in localStorage
                    const userData = Auth.getUserData();
                    userData.profilePicture = result.profilePicture;
                    Auth.updateUserData(userData);

                    showToast('Photo de profil mise a jour!', 'success');
                } else {
                    showToast(result.error || 'Erreur lors de la mise a jour.', 'error');
                }
            } catch (error) {
                console.error('Profile picture upload error:', error);
                showToast('Erreur de connexion.', 'error');
            }

            // Clear the input
            profilePictureInput.value = '';
        });
    }
});

function displayProfile(userData) {
    // Set profile picture
    const profilePicture = document.getElementById('profile-picture');
    if (userData.profilePicture) {
        profilePicture.src = userData.profilePicture.startsWith('http') ? userData.profilePicture : `${config.baseURL}${userData.profilePicture}`;
    } else {
        profilePicture.src = '../assets/images/logos/default_picture.jpg';
    }

    document.getElementById('profile-fullname').textContent = `${userData.name || ''} ${userData.surname || ''}`;
    document.getElementById('profile-name').querySelector('span').textContent = userData.name || '';
    document.getElementById('profile-surname').querySelector('span').textContent = userData.surname || '';
    document.getElementById('profile-phone').querySelector('span').textContent = userData.phone || '';
    document.getElementById('profile-email').querySelector('span').textContent = userData.email || '';
    document.getElementById('profile-address').querySelector('span').textContent = userData.address || '';

    const adminSection = document.querySelector('.admin-buttons');
    if (userData.is_admin === 1) {
        adminSection.style.display = 'block';
    } else {
        adminSection.style.display = 'none';
    }
}

function goBack() {
    window.history.back();
}

// Toast notification function
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'times-circle';

    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
