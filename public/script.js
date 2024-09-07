document.addEventListener('DOMContentLoaded', () => {
    const tabItems = document.querySelectorAll('.tab-item');
    const productList = document.getElementById('product-list');

    // Fetch and display products based on the selected department
    const loadProducts = async (department) => {
        try {
            // Fetch products based on the selected department
            const response = await fetch(`http://localhost:3006/api/products?department=${department}`);
            
            // Check if the API request was successful
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const products = await response.json();
            console.log('Products fetched:', products);

            // Clear current product list
            productList.innerHTML = '';

            // Check if there are any products
            if (products.length === 0) {
                productList.innerHTML = '<p>No products available in this department.</p>';
                return;
            }

            // Display products
            products.forEach(product => {
                const productCard = document.createElement('div');
                productCard.classList.add('product-card');

                productCard.innerHTML = `
                    <img src="${product.image_url}" alt="${product.name}" style="width: 150px; height: 150px;">
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <p class="price">${product.price}€</p>
                    <p>Stock: ${product.stock}</p>
                `;

                // Add event listener to navigate to product details page
                productCard.addEventListener('click', () => {
                    window.location.href = `http://localhost:3006/product-details.html?product_id=${product.product_id}`;
                });

                productList.appendChild(productCard);
            });

        } catch (error) {
            console.error('Error loading products:', error);
            productList.innerHTML = '<p>Unable to load products. Please try again later.</p>';
        }
    };

    // Set up event listeners for tab clicks
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            const department = tab.getAttribute('data-department');
            loadProducts(department);
        });
    });

    // Load products for "Tout" by default when page loads
    loadProducts('tout');
});
