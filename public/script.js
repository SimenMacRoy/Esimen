document.addEventListener('DOMContentLoaded', () => {
    const tabItems = document.querySelectorAll('.tab-item');
    const productList = document.getElementById('product-list');

    // Fetch and display products based on the selected department
    const loadProducts = async (department) => {
        try {
            // Fetch products based on the selected department
            const response = await fetch(`/api/products?department=${department}`);
            
            // Check if the API request was successful
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const products = await response.json();

            // Log the products to ensure they are being fetched correctly
            console.log('Products fetched:', products);

            // Clear current product list
            productList.innerHTML = '';

            // Display products
            products.forEach(product => {
                const productCard = document.createElement('div');
                productCard.classList.add('product-card');

                productCard.innerHTML = `
                    <img src="${product.image_url}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <p class="price">${product.price}€</p>
                    <p>Stock: ${product.stock}</p>
                `;

                productCard.addEventListener('click', () => {
                    // Redirect to product details page
                    window.location.href = `/product/${product.product_id}`;
                });

                productList.appendChild(productCard);
            });

        } catch (error) {
            console.error('Error loading products:', error);
            // Display error message in the UI (optional)
            productList.innerHTML = '<p>Unable to load products. Please try again later.</p>';
        }
    };

    // Set up event listeners for tab clicks
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            const department = tab.getAttribute('data-department');
            loadProducts(department);  // Load products based on department
        });
    });

    // Load products for "Tout" by default when page loads
    loadProducts('tout');
});
