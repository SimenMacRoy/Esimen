
document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordSection = document.getElementById('forgot-password-section');
    const loginFormSection = document.getElementById('login-form-section');

    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const resetCodeSection = document.getElementById('reset-code-section');
    const verifyCodeForm = document.getElementById('verify-code-form');
    const resetPasswordSection = document.getElementById('reset-password-section');
    const resetPasswordForm = document.getElementById('reset-password-form');

    // Show the "Forgot Password" section when the link is clicked
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginFormSection.style.display = 'none';
        forgotPasswordSection.style.display = 'block';
    });

    // Step 1: Send Reset Code
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('reset-email').value;

        try {
            const response = await fetch(`${config.baseURL}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const result = await response.json();
            if (result.success) {
                alert('Un code a été envoyé à votre adresse email.');
                resetCodeSection.style.display = 'block';
            } else {
                alert('Erreur: ' + result.message);
            }
        } catch (error) {
            console.error('Error sending reset code:', error);
            alert('Une erreur est survenue. Veuillez réessayer plus tard.');
        }
    });

    // Step 2: Verify Reset Code
    verifyCodeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('reset-code').value;

        try {
            const response = await fetch(`${config.baseURL}/api/verify-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });

            const result = await response.json();
            if (result.success) {
                alert('Code vérifié avec succès. Entrez votre nouveau mot de passe.');
                resetPasswordSection.style.display = 'block';
            } else {
                alert('Code invalide. Veuillez réessayer.');
            }
        } catch (error) {
            console.error('Error verifying code:', error);
            alert('Une erreur est survenue. Veuillez réessayer plus tard.');
        }
    });

    // Step 3: Reset Password
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('reset-code').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            alert('Les mots de passe ne correspondent pas.');
            return;
        }

        try {
            const response = await fetch(`${config.baseURL}/api/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, newPassword }),
            });

            const result = await response.json();
            if (result.success) {
                alert('Mot de passe réinitialisé avec succès. Connectez-vous maintenant.');
                window.location.href = 'index.html'; // Redirect to login
            } else {
                alert('Erreur: ' + result.message);
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            alert('Une erreur est survenue. Veuillez réessayer plus tard.');
        }
    });
});
