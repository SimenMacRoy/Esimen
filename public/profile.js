const config = {
    baseURL: 'http://192.168.2.147:3006', // Update this IP dynamically as needed
};

document.addEventListener('DOMContentLoaded', async () => {

    const loginForm = document.getElementById('login-form');
    const profileSection = document.getElementById('profile-section');
    const registerFormSection = document.getElementById('register-form-section');
    const loginFormSection = document.getElementById('login-form-section');

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
                displayProfile(result.userData);
                loginFormSection.style.display = 'none';
                profileSection.style.display = 'block';
            } else {
                loginFormSection.style.display = 'none';
                registerFormSection.style.display = 'block';
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
        const userData = {
            name: document.getElementById('reg-name').value,
            surname: document.getElementById('reg-surname').value,
            phone: document.getElementById('reg-phone').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value,
            address: document.getElementById('reg-address').value,
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
    document.getElementById('profile-picture').src = userData.profilePicture || 'default_profile.jpg';
    document.getElementById('profile-name').querySelector('span').textContent = userData.name;
    document.getElementById('profile-surname').querySelector('span').textContent = userData.surname;
    document.getElementById('profile-phone').querySelector('span').textContent = userData.phone;
    document.getElementById('profile-email').querySelector('span').textContent = userData.email;
    document.getElementById('profile-address').querySelector('span').textContent = userData.address;
}