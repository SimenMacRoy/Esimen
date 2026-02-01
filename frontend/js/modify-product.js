// Modify product page with JWT authentication (Admin only)
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
    const form = document.getElementById('modify-product-form');
    const currentImagesContainer = document.getElementById('current-images');
    const imageInput = document.getElementById('product-images');
    const imagePreview = document.getElementById('image-preview');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product_id');

    if (!productId) {
        showToast('Produit non trouve.', 'error');
        setTimeout(() => {
            window.location.href = 'manage-products.html';
        }, 1500);
        return;
    }

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

    // Preload product details
    async function loadProductDetails() {
        try {
            const response = await fetch(`${config.baseURL}/api/products/${productId}`);
            const product = await response.json();

            if (product.error) {
                showToast('Produit non trouve.', 'error');
                setTimeout(() => {
                    window.location.href = 'manage-products.html';
                }, 1500);
                return;
            }

            document.getElementById('name').value = product.name || '';
            document.getElementById('description').value = product.description || '';
            document.getElementById('stock').value = product.stock || 0;
            document.getElementById('price').value = product.price || 0;

            // Pre-select department and category
            if (product.department_id) {
                departmentSelect.value = product.department_id;
            }
            if (product.category_id) {
                categorySelect.value = product.category_id;
            }

            // Display current images
            if (currentImagesContainer && product.images && product.images.length > 0) {
                currentImagesContainer.innerHTML = product.images.map((img, index) => `
                    <div class="current-image-item">
                        <img src="${img}" alt="Image ${index + 1}">
                    </div>
                `).join('');
            } else if (currentImagesContainer) {
                currentImagesContainer.innerHTML = '<p style="color: var(--gray); font-size: 14px;">Aucune image</p>';
            }
        } catch (error) {
            console.error('Error loading product details:', error);
            showToast('Erreur lors du chargement du produit.', 'error');
        }
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';

        const formData = new FormData(form);
        formData.append('product_id', productId);

        try {
            const response = await fetch(`${config.baseURL}/api/products/${productId}`, {
                method: 'PUT',
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
                showToast('Produit modifie avec succes!', 'success');
                setTimeout(() => {
                    window.location.href = 'manage-products.html';
                }, 1500);
            } else {
                showToast(result.error || 'Erreur lors de la modification', 'error');
            }
        } catch (error) {
            console.error('Error updating product:', error);
            showToast('Une erreur est survenue.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
        }
    });

    // Load product details on page load
    loadProductDetails();
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
