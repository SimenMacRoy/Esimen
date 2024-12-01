const config = {
    baseURL: 'http://192.168.2.147:3006', // Update this IP dynamically as needed
};
document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');
    const profileSection = document.getElementById('profile-section');
    const registerFormSection = document.getElementById('register-form-section');
    const loginFormSection = document.getElementById('login-form-section');
    const registerButton = document.getElementById('register-button');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const modifyProfileSection = document.getElementById('modify-profile-section');
    const modifyProfileForm = document.getElementById('modify-profile-form');
    const modifyButton = document.getElementById('modify-account');
    const deleteButton = document.getElementById('delete-account');
    const logoutButton = document.getElementById('logout-button');
    const addProductButton = document.getElementById('add-product-button');
    const manageProductButton = document.getElementById('manage-product-button');

    // Check if user data exists in localStorage
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
        displayProfile(JSON.parse(storedUserData));
        loginFormSection.style.display = 'none';
        profileSection.style.display = 'block';
        console.log(storedUserData);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const showRegister = urlParams.get('register');

    if (showRegister === 'true') {
        loginFormSection.style.display = 'none';
        registerFormSection.style.display = 'flex'; // Display the registration form
    }

    // Handle click on the "S'inscrire" button to show the registration form
    registerButton.addEventListener('click', () => {
        loginFormSection.style.display = 'none';
        registerFormSection.style.display = 'flex';
    });

    // Handle login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${config.baseURL}/api/users/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const result = await response.json();

            if (result.isRegistered) {
                // Store user data in localStorage to remember the user
                const userData = {
                    name: result.userData.name,
                    surname: result.userData.surname,
                    phone: result.userData.phone,
                    email: result.userData.email,
                    address: result.userData.address,
                    user_id: result.userData.user_id,
                    is_admin: result.userData.is_admin
                };

                console.log('User Data:', userData);
                
                localStorage.setItem('userData', JSON.stringify(userData));
                displayProfile(result.userData);
                loginFormSection.style.display = 'none';
                profileSection.style.display = 'block';
            } else {
                alert('Votre email ou mot de passe est incorrect.');
                loginFormSection.style.display = 'flex';
            }
        } catch (error) {
            console.error('Error checking user:', error);
            alert('An error occurred. Please try again later.');
        }
    });

    // Handle registration form submission
    const registerForm = document.getElementById('register-form');
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

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
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const result = await response.json();

            if (result.success) {
                alert('Inscription réussie! Vous serez redirigé vers votre profil.');
                localStorage.setItem('userData', JSON.stringify(userData)); // Save user data
                displayProfile(userData);
                loginFormSection.style.display = 'block';
                registerFormSection.style.display = 'none';
                profileSection.style.display = 'none';
            } else {
                alert('Une erreur est survenue lors de l\'inscription.');
            }
        } catch (error) {
            console.error('Error registering user:', error);
            alert('An error occurred. Please try again later.');
        }
    });
    addProductButton.addEventListener('click', () => {
        window.location.href = `${config.baseURL}/add-product.html`;
    });
    manageProductButton.addEventListener('click', () => {
        window.location.href = `${config.baseURL}/manage-products.html`;
    });
    // Prefill the modify form with user data
    modifyButton.addEventListener('click', () => {
        const userData = JSON.parse(localStorage.getItem('userData'));
        
        if (userData) {
            document.getElementById('mod-name').value = userData.name;
            document.getElementById('mod-surname').value = userData.surname;
            document.getElementById('mod-phone').value = userData.phone;
            document.getElementById('mod-email').value = userData.email;
            document.getElementById('mod-address').value = userData.address;
            modifyProfileSection.style.display = 'block';
        }
    });

    // Handle form submission for modifying the profile
    modifyProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userData = JSON.parse(localStorage.getItem('userData'));
        const user_id = userData?.user_id;
        const updatedData = {
            user_id,
            name: document.getElementById('mod-name').value,
            surname: document.getElementById('mod-surname').value,
            phone: document.getElementById('mod-phone').value,
            email: document.getElementById('mod-email').value,
            password: document.getElementById('mod-password').value, // Optional if not changed
            address: document.getElementById('mod-address').value,
        };

        try {
            const response = await fetch(`${config.baseURL}/api/users/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
            });

            const result = await response.json();
            if (result.success) {
                alert('Votre profil a été modifié avec succès.');
                localStorage.setItem('userData', JSON.stringify(updatedData));
                displayProfile(updatedData);
                modifyProfileSection.style.display = 'none';
            } else {
                alert('Une erreur est survenue lors de la modification de votre profil.');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Une erreur est survenue. Veuillez réessayer plus tard.');
        }
    });

    // Handle account deletion
    deleteButton.addEventListener('click', async () => {
        const confirmation = confirm('Êtes-vous sûr de vouloir supprimer votre compte?');
        if (confirmation) {
            try {
                const userData = JSON.parse(localStorage.getItem('userData'));
                const response = await fetch(`${config.baseURL}/api/users/delete`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: userData.email }),
                });

                const result = await response.json();
                if (result.success) {
                    alert('Votre compte a été supprimé avec succès.');
                    localStorage.removeItem('userData');
                    window.location.href = 'index.html';
                } else {
                    alert('Une erreur est survenue lors de la suppression de votre compte.');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('Une erreur est survenue. Veuillez réessayer plus tard.');
            }
        }
    });

    // Handle logout
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
    });
});

function displayProfile(userData) {
    document.getElementById('profile-picture').src = './logos/default_picture.jpg';
    document.getElementById('profile-name').querySelector('span').textContent = userData.name;
    document.getElementById('profile-surname').querySelector('span').textContent = userData.surname;
    document.getElementById('profile-phone').querySelector('span').textContent = userData.phone;
    document.getElementById('profile-email').querySelector('span').textContent = userData.email;
    document.getElementById('profile-address').querySelector('span').textContent = userData.address;

    const adminSection = document.querySelector('.admin-buttons');

    console.log(userData.is_admin);
    if (userData.is_admin) {
        adminSection.style.display = 'block'; // Show admin buttons
    } else {
        adminSection.style.display = 'none'; // Hide admin buttons
    }
}

function goBack() {
    window.history.back(); // Navigate to the previous page
}
