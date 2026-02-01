// Manage products page with JWT authentication (Admin only)
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

    const productList = document.getElementById('product-list');

    // Load products from the database
    async function loadProducts() {
        try {
            const response = await fetch(`${config.baseURL}/api/products`);
            const data = await response.json();

            // Handle paginated response
            const products = Array.isArray(data) ? data : (data.products || []);
            productList.innerHTML = '';

            if (!Array.isArray(products) || products.length === 0) {
                productList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <h3>Aucun produit</h3>
                        <p>Commencez par ajouter votre premier article</p>
                        <a href="add-product.html" class="add-product-btn">
                            <i class="fas fa-plus"></i>
                            Ajouter un produit
                        </a>
                    </div>
                `;
                return;
            }

            // Display products
            products.forEach(product => {
                const productCard = document.createElement('div');
                productCard.classList.add('product-card');
                const imageUrl = product.images && product.images[0] ? product.images[0] : '../assets/images/default_image.jpg';

                // Stock status
                let stockClass = '';
                let stockText = `${product.stock} en stock`;
                if (product.stock === 0) {
                    stockClass = 'out';
                    stockText = 'Rupture de stock';
                } else if (product.stock < 10) {
                    stockClass = 'low';
                    stockText = `${product.stock} restant(s)`;
                }

                productCard.innerHTML = `
                    <div class="product-image">
                        <img src="${imageUrl}" alt="${product.name}">
                        ${product.stock === 0 ? '<span class="status-badge inactive">Rupture</span>' : ''}
                    </div>
                    <div class="product-card-content">
                        <h3>${product.name}</h3>
                        <p class="price">CA$ ${parseFloat(product.price).toFixed(2)}</p>
                        <p class="stock ${stockClass}">
                            <i class="fas fa-cubes"></i>
                            ${stockText}
                        </p>
                    </div>
                    <div class="action-buttons">
                        <button class="modify-button" data-id="${product.product_id}">
                            <i class="fas fa-edit"></i>
                            Modifier
                        </button>
                        <button class="delete-button" data-id="${product.product_id}">
                            <i class="fas fa-trash"></i>
                            Supprimer
                        </button>
                    </div>
                `;

                productList.appendChild(productCard);
            });

            // Add event listeners to buttons
            document.querySelectorAll('.modify-button').forEach(button => {
                button.addEventListener('click', handleModify);
            });

            document.querySelectorAll('.delete-button').forEach(button => {
                button.addEventListener('click', handleDelete);
            });
        } catch (error) {
            console.error('Error loading products:', error);
            productList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erreur</h3>
                    <p>Impossible de charger les produits</p>
                </div>
            `;
        }
    }

    // Handle Modify button click
    async function handleModify(event) {
        const button = event.target.closest('.modify-button');
        const productId = button.getAttribute('data-id');
        window.location.href = `modify-product.html?product_id=${productId}`;
    }

    // Handle Delete button click
    async function handleDelete(event) {
        const button = event.target.closest('.delete-button');
        const productId = button.getAttribute('data-id');

        if (confirm('Voulez-vous vraiment supprimer ce produit?')) {
            try {
                const response = await fetch(`${config.baseURL}/api/products/${productId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${Auth.getToken()}`
                    }
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
                    showToast('Produit supprime avec succes!', 'success');
                    loadProducts();
                } else {
                    showToast(result.error || 'Erreur lors de la suppression', 'error');
                }
            } catch (error) {
                console.error('Error deleting product:', error);
                showToast('Erreur lors de la suppression du produit.', 'error');
            }
        }
    }

    // Load products on page load
    loadProducts();
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
