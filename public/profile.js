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

    // Check if user data exists in localStorage
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
        displayProfile(JSON.parse(storedUserData));
        loginFormSection.style.display = 'none';
        profileSection.style.display = 'block';
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

    // Handle "Mot de Passe Oublié" functionality (example)
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Functionality for password reset will be implemented here.');
        // You can redirect to a password reset page or show a password reset form/modal
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
                localStorage.setItem('userData', JSON.stringify(result.userData));
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
                registerFormSection.style.display = 'none';
                profileSection.style.display = 'block';
            } else {
                alert('Une erreur est survenue lors de l\'inscription.');
            }
        } catch (error) {
            console.error('Error registering user:', error);
            alert('An error occurred. Please try again later.');
        }
    });
});

function displayProfile(userData) {
    document.getElementById('profile-picture').src = './logos/default_picture.jpg';
    document.getElementById('profile-name').querySelector('span').textContent = userData.name;
    document.getElementById('profile-surname').querySelector('span').textContent = userData.surname;
    document.getElementById('profile-phone').querySelector('span').textContent = userData.phone;
    document.getElementById('profile-email').querySelector('span').textContent = userData.email;
    document.getElementById('profile-address').querySelector('span').textContent = userData.address;
}
