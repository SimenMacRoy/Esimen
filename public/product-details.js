const config = {
    baseURL: 'http://192.168.2.147:3006', // Update this IP dynamically as needed
};

document.addEventListener('DOMContentLoaded', async () => {
    const productDetailsSection = document.getElementById('product-details');
    const btnAddToBasket = document.querySelector('.btn-add'); // The add to basket button
    const priceDisplay = document.querySelector('.prix'); // The price display near the button

    // Get product ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const product_id = urlParams.get('product_id');

    if (product_id) {
        try {
            const response = await fetch(`${config.baseURL}/api/products/${product_id}`);
            if (!response.ok) {
                throw new Error('Product not found');
            }

            const product = await response.json();

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
            priceDisplay.innerHTML = `<span>Prix: ${product.price}€</span>`;

            // Handle adding the item to the basket
            btnAddToBasket.addEventListener('click', () => {
                addToBasket(product);
            });

        } catch (error) {
            console.error('Error loading product details:', error);
            productDetailsSection.innerHTML = '<p>Product details could not be loaded. Please try again later.</p>';
        }
    } else {
        productDetailsSection.innerHTML = '<p>No product found.</p>';
    }
});

// Basket Mechanism

// Function to handle adding the product to the basket
function addToBasket(product) {
    let basket = getBasket();

    // Check if the product is already in the basket
    const existingProduct = basket.find(item => item.product_id === product.product_id);

    if (existingProduct) {
        existingProduct.quantity += 1; // Increase the quantity if the product is already in the basket
    } else {
        // Add new product to the basket with initial quantity 1 and image
        basket.push({
            id: product.product_id,
            name: product.name,
            description: product.description,
            price: product.price,
            image: product.images && product.images.length > 0 ? product.images[0] : 'default_image.jpg', // Add image if available
            quantity: 1
        });
    }

    // Save the updated basket back to localStorage
    saveBasket(basket);

    // Optional: Give feedback to the user that the item was added to the basket
    alert(`${product.name} a été ajouté au panier !`);
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
