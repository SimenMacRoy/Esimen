// Add product page with JWT authentication (Admin only)
const config = {
    baseURL: 'http://localhost:3006',
};

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is admin
    if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
        alert('Acces refuse. Vous devez etre administrateur.');
        window.location.href = 'profile.html';
        return;
    }

    // Initialize header and footer
    ShekComponents.initHeader({ showSearch: false, showTabs: false, showBackButton: true, pageTitle: 'Admin' });
    ShekComponents.initFooter('profile');

    const departmentSelect = document.getElementById('department-id');
    const categorySelect = document.getElementById('category-id');
    const imageInput = document.getElementById('product-images');
    const imagePreview = document.getElementById('image-preview');

    // Fetch departments and populate select menu
    try {
        const deptResponse = await fetch(`${config.baseURL}/api/departments`);
        const departments = await deptResponse.json();

        if (Array.isArray(departments)) {
            departments.forEach(department => {
                const option = document.createElement('option');
                option.value = department.department_id;
                option.textContent = department.department_name;
                departmentSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error fetching departments:', error);
    }

    // Fetch categories and populate select menu
    try {
        const catResponse = await fetch(`${config.baseURL}/api/all-categories`);
        const categories = await catResponse.json();

        if (Array.isArray(categories)) {
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category_id;
                option.textContent = category.category_name;
                categorySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
    }

    // Image preview functionality
    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', function(e) {
            imagePreview.innerHTML = '';
            const files = e.target.files;

            if (files.length > 0) {
                Array.from(files).forEach((file, index) => {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'preview-item';
                        imgContainer.innerHTML = `
                            <img src="${e.target.result}" alt="Preview ${index + 1}">
                            <span class="preview-name">${file.name}</span>
                        `;
                        imagePreview.appendChild(imgContainer);
                    };
                    reader.readAsDataURL(file);
                });
            }
        });
    }

    // Handle form submission
    const form = document.getElementById('add-product-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout en cours...';

        const formData = new FormData(form);

        try {
            const response = await fetch(`${config.baseURL}/api/add-products`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: formData,
            });

            if (response.status === 401) {
                Auth.logout();
                return;
            }

            if (response.status === 403) {
                showToast('Acces refuse. Vous devez etre administrateur.', 'error');
                return;
            }

            const result = await response.json();
            if (result.success) {
                showToast('Produit ajoute avec succes!', 'success');
                form.reset();
                if (imagePreview) imagePreview.innerHTML = '';
                setTimeout(() => {
                    window.location.href = 'manage-products.html';
                }, 1500);
            } else {
                showToast(result.error || 'Erreur lors de l\'ajout', 'error');
            }
        } catch (error) {
            console.error('Error adding product:', error);
            showToast('Une erreur est survenue.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter le produit';
        }
    });
});

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

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
