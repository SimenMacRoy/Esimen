const config = {
    baseURL: 'http://192.168.2.147:3006', // Update this IP dynamically as needed
};


document.addEventListener('DOMContentLoaded', () => {
    const productList = document.getElementById('product-list');
    const navAccueil = document.getElementById('nav-accueil'); // "Accueil" nav item
    const navCategories = document.getElementById('nav-categories'); // "Categorie" nav item
    const navBasket = document.getElementById('nav-basket'); // Basket navigation tab
    const navProfile = document.getElementById('nav-profile'); // Profile

    // Function to get category_id and departmentName from the URL query string
    const getParamsFromURL = () => {
        const params = new URLSearchParams(window.location.search);
        return {
            categoryId: params.get('category_id'),
            departmentName: params.get('departmentName') // Change from department to departmentName
        };
    };

    // Function to switch the active navigation tab (bottom menu)
    const switchActiveNavTab = (selectedNav) => {
        [navAccueil, navCategories, navBasket, navProfile].forEach(nav => nav.classList.remove('active')); // Remove active class from both navigation tabs
        selectedNav.classList.add('active'); // Add active class to the clicked navigation tab
    };

    // Ensure "Categorie" remains active by default on products.html
    switchActiveNavTab(navCategories);

    // Event listener to redirect to Accueil (Home) when "Accueil" is clicked
    navAccueil.addEventListener('click', () => {
        switchActiveNavTab(navAccueil); // Set "Accueil" as the active tab
        window.location.href = `${config.baseURL}/index.html`; // Redirect to Accueil page
    });

    navBasket.addEventListener('click', () => {
        switchActiveNavTab(navBasket); // Set "Basket" as the active tab
        window.location.href = `${config.baseURL}/basket.html`; // Redirect to Basket page
    })

    navProfile.addEventListener('click', () => {
        switchActiveNavTab(navProfile); // Set "Basket" as the active tab
        window.location.href = `${config.baseURL}/profile.html`; // Redirect to Basket page
    })

    // Function to start image slideshow
    const startImageSlideshow = (imageContainer, images) => {
        let currentIndex = 0;

        // Create an img element to show the current image
        const imgElement = document.createElement('img');
        imgElement.style.width = '150px';
        imgElement.style.height = '150px';
        imageContainer.appendChild(imgElement);

        // Function to change the image every 2 seconds
        const changeImage = () => {
            imgElement.src = images[currentIndex];
            imgElement.alt = `Image ${currentIndex + 1}`;

            // Increment the index and reset if at the end of the array
            currentIndex = (currentIndex + 1) % images.length;
        };

        // Start the image slideshow
        changeImage(); // Show the first image immediately
        setInterval(changeImage, 2000); // Change image every 2 seconds
    };

    // Fetch and display products based on category_id and departmentName
    const loadProducts = async () => {
        const { categoryId, departmentName } = getParamsFromURL(); // Change department to departmentName

        if (!categoryId || !departmentName) {
            productList.innerHTML = '<p>No category or department selected.</p>';
            return;
        }

        try {
            const response = await fetch(`http://localhost:3006/api/products_cat?category_id=${categoryId}&departmentName=${departmentName}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const products = await response.json();

            // Check if the response is an array
            if (!Array.isArray(products)) {
                console.error('Invalid response format:', products);
                productList.innerHTML = '<p>Unable to load products. Please try again later.</p>';
                return;
            }

            productList.innerHTML = ''; // Clear previous products

            if (products.length === 0) {
                productList.innerHTML = '<p>No products available in this category and department.</p>';
                return;
            }

            // Display products in cards
            products.forEach(product => {
                const productCard = document.createElement('div');
                productCard.classList.add('product-card');

                // Create a container for the image slideshow
                const imageContainer = document.createElement('div');
                imageContainer.classList.add('image-container');

                // Start image slideshow if there are multiple images
                if (product.images && product.images.length > 0) {
                    startImageSlideshow(imageContainer, product.images);
                } else {
                    // Handle case where there are no images or only one image
                    const img = document.createElement('img');
                    img.src = product.images[0] || 'default_image.jpg'; // Use a default image if none
                    img.alt = product.name;
                    img.style.width = '150px';
                    img.style.height = '150px';
                    imageContainer.appendChild(img);
                }

                // Append product details
                const productDetails = document.createElement('div');
                productDetails.innerHTML = `
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <p class="price">${product.price}</p>
                    <p>Stock: ${product.stock}</p>
                `;

                // Insert images and product details
                productCard.appendChild(imageContainer);
                productCard.appendChild(productDetails);

                // Optionally, add a click listener to navigate to product details page
                productCard.addEventListener('click', () => {
                    window.location.href = `product-details.html?product_id=${product.product_id}`;
                });

                productList.appendChild(productCard);
            });
        } catch (error) {
            console.error('Error loading products:', error);
            productList.innerHTML = '<p>Unable to load products. Please try again later.</p>';
        }
    };

    loadProducts(); // Load products when the page loads
});
