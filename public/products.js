const config = {
    baseURL: 'http://192.168.2.147:3006', // Update this IP dynamically as needed
};


document.addEventListener('DOMContentLoaded', () => {
    const productList = document.getElementById('product-list');
    const navAccueil = document.getElementById('nav-accueil'); // "Accueil" nav item
    const navCategories = document.getElementById('nav-categories'); // "Categorie" nav item
    const navBasket = document.getElementById('nav-basket'); // Basket navigation tab
    const navProfile = document.getElementById('nav-profile'); // Profile
    const searchBar = document.getElementById('search-bar'); // Search bar input
    const searchResultsContainer = document.getElementById('search-results'); // Search results container
    const clearSearch = document.getElementById('clear-search'); // Clear
    const basketContainer = document.querySelector('.basket-container');
    const basketCountElement = document.querySelector('.basket-count');

    // Function to get category_id and departmentName from the URL query string
    const getParamsFromURL = () => {
        const params = new URLSearchParams(window.location.search);
        return {
            categoryId: params.get('category_id'),
            departmentName: params.get('departmentName') // Change from department to departmentName
        };
    };

    searchResultsContainer.style.display = 'none';

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
        //imgElement.style.width = '306px';
        //imgElement.style.height = '300px';
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
            const response = await fetch(`${config.baseURL}/api/products_cat?category_id=${categoryId}&departmentName=${departmentName}`);
            
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
                    img.style.width = '300px';
                    img.style.height = '300px';
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
     // Function to fetch and display search results
     const searchCategories = async (query) => {
        try {
            const response = await fetch(`${config.baseURL}/api/search-categories?query=${query}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const categories = await response.json();
            searchResultsContainer.innerHTML = ''; // Clear previous search results
    
            if (categories.length === 0) {
                searchResultsContainer.style.display = 'none';
                return;
            }
    
            // Display search results
            searchResultsContainer.style.display = 'block';
            categories.forEach(category => {
                const resultItem = document.createElement('div');
                resultItem.classList.add('search-result-item');
                resultItem.textContent = `${category.category_name} (${category.department_name})`;
    
                // Add event listener to navigate to the products in this category
                resultItem.addEventListener('click', () => {
                    window.location.href = `products.html?category_id=${category.category_id}&departmentName=${encodeURIComponent(category.department_name)}`;
                });
    
                searchResultsContainer.appendChild(resultItem);
            });
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

    // Event listener for search input
    searchBar.addEventListener('input', (event) => {
        const query = event.target.value;
        if (query.length > 1) {
            searchCategories(query); // Call the search function with the input
        } else {
            searchResultsContainer.style.display = 'none';
        }
    });
       // Show or hide the clear icon based on input value
       searchBar.addEventListener('input', () => {
        if (searchBar.value.trim() !== '') {
            clearSearch.style.display = 'flex';
        } else {
            clearSearch.style.display = 'none';
        }
    });

    // Clear the search bar when the clear icon is clicked
    clearSearch.addEventListener('click', () => {
        searchBar.value = '';
        clearSearch.style.display = 'none';
        searchResultsContainer.style.display = 'none'; 
        //document.getElementById('search-results').innerHTML = ''; // Clear search results if applicable
        searchBar.focus(); // Refocus on the input
    });

    // Fetch the basket count from the backend
    async function fetchBasketCount() {
        const userId = getUserId(); // Replace with your logic to get the logged-in user's ID

        if (!userId) return;

        try {
            const response = await fetch(`${config.baseURL}/api/basket/count?user_id=${userId}`);
            if (response.ok) {
                const data = await response.json();
                basketCountElement.textContent = data.itemCount || 0; // Update the badge
            } else {
                console.error('Error fetching basket count:', response.statusText);
                basketCountElement.textContent = 0; // Fallback to 0
            }
        } catch (error) {
            console.error('Error fetching basket count:', error);
            basketCountElement.textContent = 0; // Fallback to 0
        }
    }

    // Navigate to the basket page when the basket icon is clicked
    basketContainer.addEventListener('click', () => {
        window.location.href = 'basket.html'; // Replace with your actual basket page URL
    });

    // Fetch and update the basket count on page load
    fetchBasketCount();
});
function goBack() {
    window.history.back(); // Navigate to the previous page
}

function getUserId() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    return userData ? userData.user_id : null;
}