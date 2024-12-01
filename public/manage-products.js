const config = {
    baseURL: 'http://192.168.2.147:3006', // Update this IP dynamically as needed
};

document.addEventListener('DOMContentLoaded', async () => {
    const productList = document.getElementById('product-list');

    // Load products from the database
    async function loadProducts() {
        try {
            const response = await fetch(`${config.baseURL}/api/products`);
            const products = await response.json();
            productList.innerHTML = ''; // Clear current products

            if (products.length === 0) {
                productList.innerHTML = '<p>No products available.</p>';
                return;
            }

            // Display products
            products.forEach(product => {
                const productCard = document.createElement('div');
                productCard.classList.add('product-card');
                productCard.innerHTML = `
                    <img src="${config.baseURL}${product.images[0] || '/uploads/default_image.jpg'}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    <p class="price">CA$ ${product.price}</p>
                    <div class="action-buttons">
                        <button class="modify-button" data-id="${product.product_id}">Modifier</button>
                        <button class="delete-button" data-id="${product.product_id}">Supprimer</button>
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
        }
    }

    // Handle Modify button click
    async function handleModify(event) {
        const productId = event.target.getAttribute('data-id');
        window.location.href = `${config.baseURL}/modify-product.html?product_id=${productId}`;
    }

    // Handle Delete button click
    async function handleDelete(event) {
        const productId = event.target.getAttribute('data-id');
        if (confirm('Voulez-vous vraiment supprimer ce produit?')) {
            try {
                const response = await fetch(`${config.baseURL}/api/products/${productId}`, {
                    method: 'DELETE',
                });

                const result = await response.json();
                if (result.success) {
                    alert('Produit supprimé avec succès!');
                    loadProducts(); // Reload products
                } else {
                    alert(`Erreur: ${result.error}`);
                }
            } catch (error) {
                console.error('Error deleting product:', error);
                alert('Erreur lors de la suppression du produit.');
            }
        }
    }

    // Load products on page load
    loadProducts();
});
