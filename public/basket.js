document.addEventListener('DOMContentLoaded', () => {
    const basketItemContainer = document.querySelector('.basket-items');
    const totalPriceElement = document.getElementById('total-price');

    const basket = getBasket();

    if (basket.length === 0) {
        basketItemContainer.innerHTML = '<p>Votre panier est vide.</p>';
    } else {
        let total = 0;

        basket.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('basket-item');

            // Use a fallback image if the item does not have an image URL
            const imageUrl = item.image ? item.image : 'default_image.jpg';

            // Create the card structure with image, details, and controls
            itemElement.innerHTML = `
                <div class="item-card">
                    <div class="item-image">
                        <img src="${imageUrl}" alt="${item.name}" class="square-image">
                    </div>
                    <div class="item-details">
                        <h3>${item.name}</h3>
                        <p>${item.description || ''}</p>
                        <p>Prix unitaire: ${item.price}€</p>
                    </div>
                    <div class="item-controls">
                        <button class="decrease-quantity" data-id="${item.id}">-</button>
                        <span>${item.quantity}</span>
                        <button class="increase-quantity" data-id="${item.id}">+</button>
                        ${item.quantity === 1 ? `<i class="fas fa-trash-alt remove-item" data-id="${item.id}"></i>` : ''}
                    </div>
                </div>
            `;

            basketItemContainer.appendChild(itemElement);

            total += item.quantity * item.price;
        });

        totalPriceElement.textContent = `${total}€`;

        // Add event listeners to increase or decrease quantity
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
});

// Function to update the quantity of an item in the basket
function updateQuantity(event, change) {
    const productId = event.target.getAttribute('data-id');
    let basket = getBasket();

    const item = basket.find(i => i.id === parseInt(productId));
    if (item) {
        item.quantity += change;
        if (item.quantity < 1) {
            removeItem(event);  // If quantity drops to 0, remove the item
        } else {
            // Update the quantity in the DOM without re-rendering the whole basket
            const quantityElement = event.target.parentNode.querySelector('span');
            quantityElement.textContent = item.quantity;

            // Save the updated basket to localStorage
            saveBasket(basket);

            // Update the total price
            updateTotalPrice();
        }
    }
}

// Function to remove an item from the basket
function removeItem(event) {
    const productId = event.target.getAttribute('data-id');
    let basket = getBasket();

    basket = basket.filter(item => item.id !== parseInt(productId));
    saveBasket(basket);

    // Remove the item element from the DOM
    event.target.closest('.basket-item').remove();

    // Update the total price
    updateTotalPrice();
}

// Function to re-render the basket after updates
function renderBasket() {
    const basketItemContainer = document.querySelector('.basket-items');
    basketItemContainer.innerHTML = ''; // Clear the current basket items
    const totalPriceElement = document.getElementById('total-price');

    const basket = getBasket();
    let total = 0;

    if (basket.length === 0) {
        basketItemContainer.innerHTML = '<p>Votre panier est vide.</p>';
    } else {
        basket.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('basket-item');
        
            const imageUrl = item.image ? item.image : 'default_image.jpg';
        
            itemElement.innerHTML = `
                <div class="item-card">
                    <div class="item-image">
                        <img src="${imageUrl}" alt="${item.name}" class="square-image">
                    </div>
                    <div class="item-details">
                        <h3>${item.name}</h3>
                        <p>${item.description || ''}</p>
                        <p>Prix unitaire: ${item.price}€</p>
                    </div>
                    <div class="item-controls">
                        <button class="decrease-quantity" data-id="${item.id}">-</button>
                        <span>${item.quantity}</span>
                        <button class="increase-quantity" data-id="${item.id}">+</button>
                        ${item.quantity === 1 ? `<i class="fas fa-trash-alt remove-item" data-id="${item.id}"></i>` : ''}
                    </div>
                </div>
            `;
        
            basketItemContainer.appendChild(itemElement);

            total += item.quantity * item.price;
        });

        totalPriceElement.textContent = `${total}€`;

        // Add event listeners again after re-render
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
}

// Helper function to update total price
function updateTotalPrice() {
    const basket = getBasket();
    const totalPriceElement = document.getElementById('total-price');
    
    let total = 0;
    basket.forEach(item => {
        total += item.quantity * item.price;
    });
    
    totalPriceElement.textContent = `${total}€`;
}

// Helper functions to get/save the basket
function getBasket() {
    const basket = localStorage.getItem('basket');
    return basket ? JSON.parse(basket) : [];
}

function saveBasket(basket) {
    localStorage.setItem('basket', JSON.stringify(basket));
}
