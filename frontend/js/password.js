// Password Reset Flow with modern UI
// Uses config from profile.js (loaded before this script)

document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordSection = document.getElementById('forgot-password-section');
    const loginFormSection = document.getElementById('login-form-section');
    const registerFormSection = document.getElementById('register-form-section');

    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const resetCodeSection = document.getElementById('reset-code-section');
    const verifyCodeForm = document.getElementById('verify-code-form');
    const resetPasswordSection = document.getElementById('reset-password-section');
    const resetPasswordForm = document.getElementById('reset-password-form');

    let userEmail = '';

    // Show the "Forgot Password" section when the link is clicked
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginFormSection.style.display = 'none';
            if (registerFormSection) registerFormSection.style.display = 'none';
            forgotPasswordSection.style.display = 'flex';

            // Reset all steps
            forgotPasswordForm.parentElement.style.display = 'block';
            resetCodeSection.style.display = 'none';
            resetPasswordSection.style.display = 'none';
        });
    }

    // Step 1: Send Reset Code
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
            const email = document.getElementById('reset-email').value;
            userEmail = email;

            submitBtn.classList.add('btn-loading');
            submitBtn.disabled = true;

            try {
                const response = await fetch(`${config.baseURL}/api/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });

                const result = await response.json();

                if (result.success) {
                    showToast('Un code de verification a ete envoye a votre email.', 'success');
                    // Hide email form, show code form
                    forgotPasswordForm.parentElement.style.display = 'none';
                    resetCodeSection.style.display = 'block';
                } else {
                    showToast(result.message || 'Erreur lors de l\'envoi du code.', 'error');
                }
            } catch (error) {
                console.error('Error sending reset code:', error);
                showToast('Une erreur est survenue. Veuillez reessayer.', 'error');
            } finally {
                submitBtn.classList.remove('btn-loading');
                submitBtn.disabled = false;
            }
        });
    }

    // Step 2: Verify Reset Code
    if (verifyCodeForm) {
        verifyCodeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = verifyCodeForm.querySelector('button[type="submit"]');
            const code = document.getElementById('reset-code').value;

            if (code.length !== 6) {
                showToast('Le code doit contenir 6 caracteres.', 'error');
                return;
            }

            submitBtn.classList.add('btn-loading');
            submitBtn.disabled = true;

            try {
                const response = await fetch(`${config.baseURL}/api/verify-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code }),
                });

                const result = await response.json();

                if (result.success) {
                    showToast('Code verifie avec succes!', 'success');
                    // Hide code form, show new password form
                    resetCodeSection.style.display = 'none';
                    resetPasswordSection.style.display = 'block';
                } else {
                    showToast(result.message || 'Code invalide. Veuillez reessayer.', 'error');
                }
            } catch (error) {
                console.error('Error verifying code:', error);
                showToast('Une erreur est survenue. Veuillez reessayer.', 'error');
            } finally {
                submitBtn.classList.remove('btn-loading');
                submitBtn.disabled = false;
            }
        });
    }

    // Step 3: Reset Password
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');
            const code = document.getElementById('reset-code').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Validation
            if (newPassword.length < 6) {
                showToast('Le mot de passe doit contenir au moins 6 caracteres.', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast('Les mots de passe ne correspondent pas.', 'error');
                return;
            }

            submitBtn.classList.add('btn-loading');
            submitBtn.disabled = true;

            try {
                const response = await fetch(`${config.baseURL}/api/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, newPassword }),
                });

                const result = await response.json();

                if (result.success) {
                    showToast('Mot de passe reinitialise avec succes!', 'success');

                    // Wait a bit then redirect to login
                    setTimeout(() => {
                        forgotPasswordSection.style.display = 'none';
                        loginFormSection.style.display = 'flex';

                        // Reset all forms
                        forgotPasswordForm.reset();
                        verifyCodeForm.reset();
                        resetPasswordForm.reset();

                        // Reset visibility
                        forgotPasswordForm.parentElement.style.display = 'block';
                        resetCodeSection.style.display = 'none';
                        resetPasswordSection.style.display = 'none';
                    }, 1500);
                } else {
                    showToast(result.message || 'Erreur lors de la reinitialisation.', 'error');
                }
            } catch (error) {
                console.error('Error resetting password:', error);
                showToast('Une erreur est survenue. Veuillez reessayer.', 'error');
            } finally {
                submitBtn.classList.remove('btn-loading');
                submitBtn.disabled = false;
            }
        });
    }

    // Add password visibility toggle for new password fields
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    // Password strength indicator
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', () => {
            const password = newPasswordInput.value;
            let strength = 0;

            if (password.length >= 6) strength++;
            if (password.length >= 8) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;

            // Visual feedback could be added here
        });
    }
});

// Show login form (called from back button)
function showLogin() {
    const loginFormSection = document.getElementById('login-form-section');
    const registerFormSection = document.getElementById('register-form-section');
    const forgotPasswordSection = document.getElementById('forgot-password-section');

    loginFormSection.style.display = 'flex';
    if (registerFormSection) registerFormSection.style.display = 'none';
    if (forgotPasswordSection) forgotPasswordSection.style.display = 'none';
}

// Toast notification function (if not already defined)
if (typeof showToast !== 'function') {
    window.showToast = function(message, type = 'info') {
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

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };
}
