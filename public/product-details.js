document.addEventListener('DOMContentLoaded', async () => {
    const productDetailsSection = document.getElementById('product-details');

    // Get product ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const product_id = urlParams.get('product_id');

    if (product_id) {
        try {
            const response = await fetch(`http://localhost:3006/api/products/${product_id}`);
            if (!response.ok) {
                throw new Error('Product not found');
            }

            const product = await response.json();

            // Display product details
            productDetailsSection.innerHTML = `
                <div class="product-detail-card">
                    <img src="${product.image_url}" alt="${product.name}">
                    <h1>${product.name}</h1>
                    <p>${product.description}</p>
                    <p class="price">${product.price}€</p>
                    <p>Stock: ${product.stock}</p>
                </div>
            `;
        } catch (error) {
            console.error('Error loading product details:', error);
            productDetailsSection.innerHTML = '<p>Product details could not be loaded. Please try again later.</p>';
        }
    } else {
        productDetailsSection.innerHTML = '<p>No product found.</p>';
    }
});
