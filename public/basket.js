const config = {
    baseURL: 'http://192.168.2.147:3006', // Update this IP dynamically as needed
};

function isUserLoggedIn() {
    const userData = localStorage.getItem('userData');
    return !!userData; // Returns true if userData is not null
}

document.addEventListener('DOMContentLoaded', async () => {

    if(isUserLoggedIn()){
       await loadUserBasket();
       renderBasket();  // Load and display the basket when the page loads
    }
    else {
        showEmptyCartWithSignUp(); // Show sign-up prompt when the user is not logged in
    }

    
});
function getUserId() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    return userData ? userData.user_id : null;
}
// Function to get the current basket for the logged-in user
function getBasket() {
    const userId = getUserId();
    if (userId) {
        const basket = localStorage.getItem(`basket_${userId}`);
        return basket ? JSON.parse(basket) : []; // Return an empty array if no basket is found
    }
    return [];
}

// Function to save the current user's basket to localStorage
function saveBasket(basket) {
    const userId = getUserId();
    if (userId) {
        localStorage.setItem(`basket_${userId}`, JSON.stringify(basket));
    }
}

// Load the user's basket from the server or local storage
async function loadUserBasket() {
    const userId = getUserId();
    console.log(userId);
    if (userId) {
        try {
            const response = await fetch(`${config.baseURL}/api/basket?user_id=${userId}`);
            if (response.ok) {
                const basket = await response.json();
                basket.forEach(item => console.log(item));
                saveBasket(basket);
            } else {
                console.error('Error loading user basket');
            }
        } catch (error) {
            console.error('Error fetching basket data:', error);
        }
    } else {
        renderBasket(); // Render an empty basket if the user isn't logged in
    }
}

// Function to render the basket contents
async function renderBasket() {
    const basketItemContainer = document.querySelector('.basket-items');
    const totalPriceElement = document.getElementById('total-price');
    const checkoutButton = document.getElementById('checkout-button');
    const basket = getBasket(); // Get basket from localStorage or server

    // Clear the container
    basketItemContainer.innerHTML = '';
    let total = 0;

    if (basket.length === 0) {
        // Display empty basket message
        basketItemContainer.innerHTML = `
            <div class="empty-basket-message">
                <p><img src="./logos/empty-cart.png" alt="Panier vide" id="empty-cart"></img> Oups ! Votre panier est vide</p>
                <div class="empty-basket-buttons">
                    <button class="signup-button">
                        <i class="fas fa-user-plus"></i> Inscrivez-vous !</button>
                    <button class="shop-button" onclick="magasiner()">
                        <i class="fas fa-store"></i> Magasiner</button>
                </div>
            </div>
        `;
        return; // Exit if the basket is empty
    }

    // Fetch product details for each item in the basket
    const productPromises = basket.map(item => fetchProductDetails(item.product_id));
    const productDetails = await Promise.all(productPromises);

    // Render items in the basket
    basket.forEach((item, index) => {
        const product = productDetails[index];

        if (!product) {
            console.error(`Product details not found for product_id: ${item.product_id}`);
            return;
        }

        const itemElement = document.createElement('div');
        itemElement.classList.add('basket-item');

        const imageUrl = product.images.length > 0 ? product.images[0] : 'default_image.jpg';

        itemElement.innerHTML = `
            <div class="item-card">
                <div class="item-image">
                    <img src="${imageUrl}" alt="${product.name}" class="square-image">
                </div>
                <div class="item-details">
                    <h3>${product.name}</h3>
                    <p>${product.description || ''}</p>
                    <p>CA$ ${product.price}</p>
                </div>
                <div class="item-controls">
                    <button class="decrease-quantity" data-id="${product.product_id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="increase-quantity" data-id="${product.product_id}">+</button>
                    <i class="fas fa-trash-alt remove-item" data-id="${product.product_id}"></i>
                </div>
            </div>
        `;

        basketItemContainer.appendChild(itemElement);
        total += item.quantity * product.price;
    });

    // Save subtotal to localStorage
    localStorage.setItem('subtotal', total.toFixed(2));

    // Update total price in the DOM
    totalPriceElement.textContent = `CA $${total.toFixed(2)}`;

    // Disable the checkout button if the total is 0
    if (total === 0) {
        checkoutButton.disabled = true;
        checkoutButton.style.opacity = 0.5;
        checkoutButton.style.cursor = 'not-allowed';
    } else {
        checkoutButton.disabled = false;
        checkoutButton.style.opacity = 1;
        checkoutButton.style.cursor = 'pointer';
    }

    // Add event listeners for quantity and removal buttons
    document.querySelectorAll('.increase-quantity').forEach(button => {
        button.addEventListener('click', (e) => updateQuantity(e, 1));
    });

    document.querySelectorAll('.decrease-quantity').forEach(button => {
        button.addEventListener('click', (e) => updateQuantity(e, -1));
    });

    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', (e) => removeItem(e));
    });
}

// Helper function to fetch product details
async function fetchProductDetails(productId) {
    try {
        const response = await fetch(`${config.baseURL}/api/products/${productId}`);
        if (response.ok) {
            return await response.json();
        } else {
            console.error(`Error fetching product details for product ID ${productId}`);
            return {}; // Return an empty object on error
        }
    } catch (error) {
        console.error('Error fetching product details:', error);
        return {}; // Return an empty object on error
    }
}

// Function to show the empty cart message with sign-up prompt
function showEmptyCartWithSignUp() {
    const basketItemContainer = document.querySelector('.basket-items');
    basketItemContainer.innerHTML = `
        <div class="empty-basket-message">
            <p><img src="./logos/empty-cart.png" alt="Panier vide" id="empty-cart"></img> Oups ! Votre panier est vide</p>
            <div class="empty-basket-buttons">
                <button class="signup-button">
                    <i class="fas fa-user-plus"></i> Inscrivez-vous !
                </button>
                <button class="shop-button" onclick="magasiner()">
                    <i class="fas fa-store"></i> Magasiner
                </button>
            </div>
        </div>
    `;

    document.querySelector('.signup-button').addEventListener('click', () => {
        window.location.href = `${config.baseURL}/profile.html?register=true`;
    });
}

// Function to update the quantity of an item in the basket
async function updateQuantity(event, change) {
    const productId = parseInt(event.target.getAttribute('data-id'), 10);
    const basket = getBasket();
    const item = basket.find(i => i.product_id === productId);
    if (item) {
        item.quantity = parseInt(item.quantity, 10) + change; // Update the quantity

        if (item.quantity < 1) {
            // If quantity is less than 1, remove the item
            removeItem(event);
        } else {
            // Save the updated basket to localStorage
            saveBasket(basket);

            // Send the updated quantity to the backend
            try {
                const response = await fetch(`${config.baseURL}/api/basket`, {
                    method: 'PUT', // Assuming you're using PUT for updates
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: getUserId(), // Include the user_id
                        product_id: item.product_id, // Include the product_id
                        quantity: item.quantity, // Include the new quantity
                    }),
                });

                if (response.ok) {
                    console.log(`Quantity for product ${item.productId} updated successfully.`);
                } else {
                    console.error(`Failed to update quantity for product ${item.productId}.`);
                }
            } catch (error) {
                console.error('Error updating quantity on the server:', error);
            }

            // Re-render the basket
            renderBasket();
        }
    }
}


// Function to remove an item from the basket
async function removeItem(event) {
    const productId = parseInt(event.target.getAttribute('data-id'));

    const userId = getUserId(); 
    
    let basket = getBasket();

    basket = basket.filter(item => item.product_id !== productId);
    saveBasket(basket);
    try {
        // Send a request to the backend to remove the item
        const response = await fetch(`${config.baseURL}/api/basket?user_id=${userId}&product_id=${productId}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            console.log(`Item with product_id ${productId} removed successfully.`);
        } else {
            console.error(`Failed to remove item with product_id ${productId}.`);
        }
    } catch (error) {
        console.error('Error removing item from the server:', error);
    }
    renderBasket();  // Re-render the basket
}

// Helper function to calculate and update the total price
function updateTotalPrice() {
    const basket = getBasket();
    const totalPriceElement = document.getElementById('total-price');
    
    let total = 0;
    basket.forEach(item => {
        total += item.quantity * item.price;
    });
    
    totalPriceElement.textContent = `${total}€`;
}

function magasiner(){

    window.location.href = `${config.baseURL}/index.html`;
}
function proceedToCheckout() {
    window.location.href = `${config.baseURL}/checkout.html`;
}