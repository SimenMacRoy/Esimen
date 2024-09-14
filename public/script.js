
const config = {
    baseURL: 'http://192.168.2.147:3006', // Update this IP dynamically as needed
};

document.addEventListener('DOMContentLoaded', () => {
    const tabItems = document.querySelectorAll('.tab-item'); // Top menu department tabs
    const productList = document.getElementById('product-list');
    const navAccueil = document.getElementById('nav-accueil'); // "Accueil" navigation tab
    const navCategories = document.getElementById('nav-categories'); // "Categorie" navigation tab
    const navBasket = document.getElementById('nav-basket')

    // Function to switch the active department tab (top menu)
    const switchActiveTab = (selectedTab) => {
        tabItems.forEach(tab => tab.classList.remove('active'));
        selectedTab.classList.add('active');
    };

    // Function to switch the active navigation tab (bottom menu)
    const switchActiveNavTab = (selectedNav) => {
        navAccueil.classList.remove('active');
        navCategories.classList.remove('active');
        selectedNav.classList.add('active');
    };

    // Function to start image slideshow
    const startImageSlideshow = (imageContainer, images) => {
        let currentIndex = 0;
        const imgElement = document.createElement('img');
        imgElement.style.width = '150px';
        imgElement.style.height = '150px';
        imageContainer.appendChild(imgElement);

        const changeImage = () => {
            imgElement.src = images[currentIndex];
            imgElement.alt = `Image ${currentIndex + 1}`;
            currentIndex = (currentIndex + 1) % images.length;
        };

        changeImage(); 
        setInterval(changeImage, 2000); // Change image every 2 seconds
    };

    // Fetch and display products based on the selected department
    const loadProducts = async (department) => {
        try {
            const response = await fetch(`${config.baseURL}/api/products?department=${department}`);  // Use config.baseURL
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const products = await response.json();
            productList.innerHTML = ''; // Clear current product list

            if (products.length === 0) {
                productList.innerHTML = '<p>No products available in this department.</p>';
                return;
            }

            // Display products
            products.forEach(product => {
                const productCard = document.createElement('div');
                productCard.classList.add('product-card');

                // Create a container for the image slideshow
                const imageContainer = document.createElement('div');
                imageContainer.classList.add('image-container');

                // Start image slideshow if there are multiple images
                if (product.images && product.images.length > 1) {
                    startImageSlideshow(imageContainer, product.images);
                } else {
                    const img = document.createElement('img');
                    img.src = product.images[0] || 'default_image.jpg'; // Handle no images
                    img.alt = product.name;
                    img.style.width = '150px';
                    img.style.height = '150px';
                    imageContainer.appendChild(img);
                }

                // Product details
                const productDetails = document.createElement('div');
                productDetails.innerHTML = `
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <p class="price">${product.price}€</p>
                    <p>Stock: ${product.stock}</p>
                `;

                // Append image container and details to the product card
                productCard.appendChild(imageContainer);
                productCard.appendChild(productDetails);

                // Add event listener for product click to go to product details
                productCard.addEventListener('click', () => {
                    window.location.href = `${config.baseURL}/product-details.html?product_id=${product.product_id}`;  // Use config.baseURL
                });

                productList.appendChild(productCard);
            });
        } catch (error) {
            console.error('Error loading products:', error);
            productList.innerHTML = '<p>Unable to load products. Please try again later.</p>';
        }
    };

    // Set up event listeners for department tab clicks (top menu)
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            const department = tab.getAttribute('data-department');
            switchActiveTab(tab); // Switch active department tab (top menu)
            loadProducts(department); // Load products for the selected department
        });
    });

    // Add event listener to the "Accueil" navigation tab (bottom menu)
    navAccueil.addEventListener('click', () => {
        switchActiveNavTab(navAccueil); // Set "Accueil" as the active nav tab
        window.location.href = `${config.baseURL}/index.html`;  // Use config.baseURL
    });

    // Add event listener to the "Categorie" navigation tab (bottom menu)
    navCategories.addEventListener('click', () => {
        switchActiveNavTab(navCategories); // Set "Categorie" as the active nav tab
        window.location.href = `${config.baseURL}/category.html`;  // Use config.baseURL
    });

    navBasket.addEventListener('click', () => {
        switchActiveNavTab(navBasket); // Set "Basket" as the active nav tab
        window.location.href = `${config.baseURL}/basket.html`; // Use config.baseURL
    })

    // Load products for "Tout" by default when the page loads
    const defaultTab = document.querySelector('.tab-item[data-department="tout"]');
    switchActiveTab(defaultTab);  // Set "Tout" as the default active department tab
    loadProducts('tout');  // Load "Tout" products by default

    // Ensure "Accueil" is the active navigation tab (bottom menu) by default
    switchActiveNavTab(navAccueil); // Ensure only "Accueil" is active by default
});
