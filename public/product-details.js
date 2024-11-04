const config = {
    baseURL: 'http://192.168.2.147:3006', // Update this IP dynamically as needed
};

document.addEventListener('DOMContentLoaded', async () => {
    const productDetailsSection = document.getElementById('product-details');
    const btnAddToBasket = document.querySelector('.btn-add'); // The add to basket button
    const priceDisplay = document.querySelector('.prix'); // The price display near the button
    const searchBar = document.getElementById('search-bar'); // Search bar input
    const searchResultsContainer = document.getElementById('search-results'); // Search results container
    const quantity = document.getElementById('quantity-input'); 
    const quantityAdd = document.querySelector('.btn-plus');
    const quantityMinus = document.querySelector('.btn-minus');
    

    // Get product ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const product_id = urlParams.get('product_id');
    
    console.log(product_id);

    if (product_id) {
        try {
            const response = await fetch(`${config.baseURL}/api/products/${product_id}`);
            if (!response.ok) {
                throw new Error('Product not found');
            }

            const product = await response.json();
            console.log(product);

            // Create container for image slideshow
            const imageContainer = document.createElement('div');
            imageContainer.classList.add('image-container');

            // Create an img element to show the current image
            const imgElement = document.createElement('img');
            imgElement.style.width = '300px';
            imgElement.style.height = '300px';
            imageContainer.appendChild(imgElement);

            let currentIndex = 0;

            // Function to change the image every 2 seconds
            const changeImage = () => {
                if (product.images && product.images.length > 0) {
                    imgElement.src = product.images[currentIndex];
                    imgElement.alt = `Image ${currentIndex + 1}`;
                    currentIndex = (currentIndex + 1) % product.images.length;
                } else {
                    imgElement.src = 'default_image.jpg'; // Fallback if no images
                    imgElement.alt = 'Default image';
                }
            };

            // Start the image slideshow
            changeImage(); // Show the first image immediately
            setInterval(changeImage, 2000); // Change image every 2 seconds

            // Display product details with image slideshow
            productDetailsSection.innerHTML = `
                <div class="product-detail-card">
                    <h1>${product.name}</h1>
                    <p>${product.description}</p>
                    <p class="price">${product.price}€</p>
                    <p>Stock: ${product.stock}</p>
                </div>
            `;
            productDetailsSection.insertBefore(imageContainer, productDetailsSection.firstChild);

            // Display the product price near the "Ajouter au panier" button
            priceDisplay.innerHTML = `<span>${product.price * quantity.value}</span>`;

            // Handle adding the item to the basket
            btnAddToBasket.addEventListener('click', () => {

                const selectedQuantity = parseInt(quantity.value);

                addToBasket(product, selectedQuantity);
            });

        } catch (error) {
            console.error('Error loading product details:', error);
            productDetailsSection.innerHTML = '<p>Product details could not be loaded. Please try again later.</p>';
        }
    } else {
        productDetailsSection.innerHTML = '<p>No product found.</p>';
    }

    quantityAdd.addEventListener('click', () => {

        const currentQuantity = parseInt(quantity.value);

        quantity.value = currentQuantity + 1;

    })

    quantityMinus.addEventListener('click', () => {
        const currentQuantity = parseInt(quantity.value);
        if (currentQuantity > 1) {
            quantity.value = currentQuantity - 1;
        }
        
    })

    // Function to handle adding the product to the basket
    function addToBasket(product, selectedQuantity) {

        let basket = getBasket();

        basket.forEach(item => console.log(item.id));

        selectedQuantity = parseInt(quantity.value);

        // Check if the product is already in the basket
        const existingProduct = basket.find(item => item.id === product.product_id);

        console.log(existingProduct);

        if (existingProduct) {
            existingProduct.quantity = selectedQuantity; // Update the quantity
            alert(`${product.name} quantité modifiée de ${selectedQuantity} !`);

        } else {
            // Add new product to the basket with selected quantity
            basket.push({
                id: product.product_id,
                name: product.name,
                description: product.description,
                price: product.price,
                image: product.images && product.images.length > 0 ? product.images[0] : 'default_image.jpg', // Add image if available
                quantity: selectedQuantity
            });
            alert(`${product.name} a été ajouté au panier avec une quantité de ${selectedQuantity} !`);
        }

        // Save the updated basket back to localStorage
        saveBasket(basket);
    }


    // Get the current basket from localStorage
    function getBasket() {
        const basket = localStorage.getItem('basket');
        return basket ? JSON.parse(basket) : []; // Return an empty array if the basket is not found
    }

    // Save the updated basket back to localStorage
    function saveBasket(basket) {
        localStorage.setItem('basket', JSON.stringify(basket));
    }

    // Display the basket content (you can modify this to display on a separate page or modal)
    function displayBasket() {
        const basket = getBasket();
        if (basket.length === 0) {
            console.log('Le panier est vide.');
            return;
        }

        console.log('Contenu du panier:');
        basket.forEach(item => {
            console.log(`${item.name} - ${item.quantity} x ${item.price}€`);
        });
    }

    // Search Bar Functionality

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
                    window.location.href = `${config.baseURL}/searchResults.html?category_id=${category.category_id}&departmentName=${category.department_name}`;
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
});
