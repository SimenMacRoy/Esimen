document.addEventListener('DOMContentLoaded', () => {
    renderBasket();  // Load and display the basket when the page loads
});

// Function to render the basket contents
function renderBasket() {
    const basketItemContainer = document.querySelector('.basket-items');
    const totalPriceElement = document.getElementById('total-price');
    const basket = getBasket();

    // Clear the container
    basketItemContainer.innerHTML = '';
    let total = 0;

    if (basket.length === 0) {
        // Display message with icon and buttons for an empty basket
        basketItemContainer.innerHTML = `
            <div class="empty-basket-message">
                <p><img src="../images/empty-cart.png" alt="Panier vide" id="empty-cart"></img> Oups ! Votre panier est vide</p>
                <div class="empty-basket-buttons">
                    <button class="signup-button">
                        <i class="fas fa-user-plus"></i> Inscrivez-vous !
                    </button>
                    <button class="shop-button">
                        <i class="fas fa-store"></i> Magasiner
                    </button>
                </div>
            </div>
        `;
    } else {
        basket.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('basket-item');

            // Use a fallback image if no image URL is provided
            const imageUrl = item.image ? item.image : 'default_image.jpg';

            itemElement.innerHTML = `
                <div class="item-card">
                    <div class="item-image">
                        <img src="${imageUrl}" alt="${item.name}" class="square-image">
                    </div>
                    <div class="item-details">
                        <h3>${item.name}</h3>
                        <p>${item.description || ''}</p>
                        <p>CA$ ${item.price}</p>
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

// Function to update the quantity of an item in the basket
function updateQuantity(event, change) {
    const productId = parseInt(event.target.getAttribute('data-id'));
    const basket = getBasket();

    const item = basket.find(i => i.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity < 1) {
            removeItem(event);  // If quantity drops to 0, remove the item
        } else {
            saveBasket(basket);  // Save the updated basket to localStorage
            renderBasket();  // Re-render the basket to show changes
        }
    }
}

// Function to remove an item from the basket
function removeItem(event) {
    const productId = parseInt(event.target.getAttribute('data-id'));
    let basket = getBasket();

    basket = basket.filter(item => item.id !== productId);
    saveBasket(basket);
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

// Helper functions to get/save the basket
function getBasket() {
    const basket = localStorage.getItem('basket');
    return basket ? JSON.parse(basket) : [];
}

function saveBasket(basket) {
    localStorage.setItem('basket', JSON.stringify(basket));
}
