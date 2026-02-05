// Basket page with JWT authentication
// Uses global config
if (!window.config) {
    window.config = { baseURL: 'http://localhost:3006' };
}

// Tax rate (Quebec TPS + TVQ)
const TAX_RATE = 0.14975;

document.addEventListener('DOMContentLoaded', async () => {
    if (Auth.isLoggedIn()) {
        await loadUserBasket();
        renderBasket();
        loadAvailableCoupons();
    } else {
        showEmptyCartWithSignUp();
        // Hide coupons section for non-logged users
        const couponsSection = document.getElementById('available-coupons-section');
        if (couponsSection) couponsSection.style.display = 'none';
    }
});

function getUserId() {
    const userData = Auth.getUserData();
    return userData ? userData.user_id : null;
}

// Function to get the current basket for the logged-in user
function getBasket() {
    const userId = getUserId();
    if (userId) {
        const basket = localStorage.getItem(`basket_${userId}`);
        return basket ? JSON.parse(basket) : [];
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

// Update basket count in header
function updateHeaderBasketCount() {
    const basket = getBasket();
    const totalItems = basket.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const basketCountElements = document.querySelectorAll('.basket-count');

    basketCountElements.forEach(el => {
        el.textContent = totalItems;
        el.style.display = totalItems > 0 ? 'flex' : 'none';
    });

    // Also update via ShekComponents if available
    if (window.ShekComponents && window.ShekComponents.updateBasketCount) {
        window.ShekComponents.updateBasketCount();
    }
}

// Load the user's basket from the server or local storage
async function loadUserBasket() {
    const userId = getUserId();
    if (userId) {
        try {
            const response = await fetch(`${window.config.baseURL}/api/basket?user_id=${userId}`, {
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });
            if (response.ok) {
                const basket = await response.json();
                saveBasket(basket);
            } else if (response.status === 401) {
                Auth.logout();
                return;
            } else {
                console.error('Error loading user basket');
            }
        } catch (error) {
            console.error('Error fetching basket data:', error);
        }
    } else {
        renderBasket();
    }
}

async function renderBasket() {
    const basketItemContainer = document.querySelector('.basket-items');
    const totalPriceElement = document.getElementById('total-price');
    const subtotalElement = document.getElementById('subtotal');
    const taxesElement = document.getElementById('taxes');
    const itemCountElement = document.getElementById('item-count');
    const checkoutButton = document.getElementById('checkout-button');
    const basket = getBasket();

    basketItemContainer.innerHTML = '';
    let subtotal = 0;
    let totalItems = 0;

    const userLoggedIn = Auth.isLoggedIn();

    // Update item count in header
    updateHeaderBasketCount();

    if (basket.length === 0) {
        // Update counts to 0
        if (itemCountElement) itemCountElement.textContent = '0';
        if (subtotalElement) subtotalElement.textContent = 'CA$ 0.00';
        if (taxesElement) taxesElement.textContent = 'CA$ 0.00';
        if (totalPriceElement) totalPriceElement.textContent = 'CA$ 0.00';

        basketItemContainer.innerHTML = `
            <div class="empty-basket-message">
                <div class="empty-icon">
                    <i class="fas fa-shopping-bag"></i>
                </div>
                <h3>Votre panier est vide</h3>
                <p>Parcourez notre collection et trouvez des articles que vous aimez!</p>
                <div class="empty-basket-buttons">
                    ${!userLoggedIn ? `
                        <button class="signup-button">
                            <i class="fas fa-user-plus"></i> Inscrivez-vous
                        </button>` : ''}
                    <button class="shop-button" onclick="magasiner()">
                        <i class="fas fa-store"></i> Continuer mes achats
                    </button>
                </div>
            </div>
        `;
        checkoutButton.disabled = true;
        checkoutButton.classList.add('disabled');

        // Add event listener for signup button if exists
        const signupBtn = document.querySelector('.signup-button');
        if (signupBtn) {
            signupBtn.addEventListener('click', () => {
                window.location.href = 'profile.html?register=true';
            });
        }
        return;
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

        const imagePath = product.images && product.images.length > 0 ? product.images[0] : null;
        const imageUrl = imagePath ? (imagePath.startsWith('http') ? imagePath : `${window.config.baseURL}${imagePath}`) : '../assets/images/default_image.jpg';
        const itemTotal = item.quantity * product.price;

        itemElement.innerHTML = `
            <div class="item-card">
                <div class="item-image">
                    <img src="${imageUrl}" alt="${product.name}" class="square-image">
                </div>
                <div class="item-details">
                    <h3>${product.name}</h3>
                    <p class="item-description">${product.description || ''}</p>
                    <p class="item-price">CA$ ${product.price.toFixed(2)}</p>
                </div>
                <div class="item-controls">
                    <button class="decrease-quantity" data-id="${product.product_id}" aria-label="Diminuer">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="increase-quantity" data-id="${product.product_id}" aria-label="Augmenter">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <button class="remove-item-btn" data-id="${product.product_id}" aria-label="Supprimer">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        basketItemContainer.appendChild(itemElement);
        subtotal += itemTotal;
        totalItems += item.quantity;
    });

    // Save subtotal to localStorage
    localStorage.setItem('subtotal', subtotal.toFixed(2));

    // Check for applied promo code
    let discount = 0;
    const appliedPromo = window.PromoCodeSystem ? PromoCodeSystem.getAppliedPromo() : null;
    const discountElement = document.getElementById('discount-row');

    if (appliedPromo) {
        discount = appliedPromo.discountAmount;
        // Show discount row
        if (discountElement) {
            discountElement.style.display = 'flex';
            discountElement.querySelector('.discount-amount').textContent = `-CA$ ${discount.toFixed(2)}`;
        }
        // Update promo display
        updatePromoDisplay({ valid: true, ...appliedPromo });
    } else {
        if (discountElement) discountElement.style.display = 'none';
    }

    // Calculate taxes and total with discount
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const taxes = discountedSubtotal * TAX_RATE;
    const total = discountedSubtotal + taxes;

    // Update DOM elements
    if (itemCountElement) itemCountElement.textContent = totalItems;
    if (subtotalElement) subtotalElement.textContent = `CA$ ${subtotal.toFixed(2)}`;
    if (taxesElement) taxesElement.textContent = `CA$ ${taxes.toFixed(2)}`;
    if (totalPriceElement) totalPriceElement.textContent = `CA$ ${total.toFixed(2)}`;

    // Load delivery address
    loadDeliveryAddress();

    // Enable/disable checkout button
    if (total === 0 || !userLoggedIn) {
        checkoutButton.disabled = true;
        checkoutButton.classList.add('disabled');
    } else {
        checkoutButton.disabled = false;
        checkoutButton.classList.remove('disabled');
    }

    // Add event listeners for quantity and removal buttons
    document.querySelectorAll('.increase-quantity').forEach(button => {
        button.addEventListener('click', (e) => {
            const btn = e.target.closest('.increase-quantity');
            updateQuantity({ target: btn }, 1);
        });
    });

    document.querySelectorAll('.decrease-quantity').forEach(button => {
        button.addEventListener('click', (e) => {
            const btn = e.target.closest('.decrease-quantity');
            updateQuantity({ target: btn }, -1);
        });
    });

    document.querySelectorAll('.remove-item-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const btn = e.target.closest('.remove-item-btn');
            removeItem({ target: btn });
        });
    });
}

// Helper function to fetch product details
async function fetchProductDetails(productId) {
    try {
        const response = await fetch(`${window.config.baseURL}/api/products/${productId}`);
        if (response.ok) {
            return await response.json();
        } else {
            console.error(`Error fetching product details for product ID ${productId}`);
            return {};
        }
    } catch (error) {
        console.error('Error fetching product details:', error);
        return {};
    }
}

// Function to show the empty cart message with sign-up prompt
function showEmptyCartWithSignUp() {
    const basketItemContainer = document.querySelector('.basket-items');
    const checkoutButton = document.getElementById('checkout-button');
    const itemCountElement = document.getElementById('item-count');
    const subtotalElement = document.getElementById('subtotal');
    const taxesElement = document.getElementById('taxes');
    const totalPriceElement = document.getElementById('total-price');

    // Reset all values
    if (itemCountElement) itemCountElement.textContent = '0';
    if (subtotalElement) subtotalElement.textContent = 'CA$ 0.00';
    if (taxesElement) taxesElement.textContent = 'CA$ 0.00';
    if (totalPriceElement) totalPriceElement.textContent = 'CA$ 0.00';

    if (Auth.isLoggedIn()) {
        basketItemContainer.innerHTML = `
            <div class="empty-basket-message">
                <div class="empty-icon">
                    <i class="fas fa-shopping-bag"></i>
                </div>
                <h3>Votre panier est vide</h3>
                <p>Parcourez notre collection et trouvez des articles que vous aimez!</p>
                <button class="shop-button" onclick="magasiner()">
                    <i class="fas fa-store"></i> Continuer mes achats
                </button>
            </div>
        `;
    } else {
        basketItemContainer.innerHTML = `
            <div class="empty-basket-message">
                <div class="empty-icon">
                    <i class="fas fa-shopping-bag"></i>
                </div>
                <h3>Votre panier est vide</h3>
                <p>Connectez-vous pour voir votre panier ou continuez vos achats!</p>
                <div class="empty-basket-buttons">
                    <button class="signup-button">
                        <i class="fas fa-user-plus"></i> Inscrivez-vous
                    </button>
                    <button class="shop-button" onclick="magasiner()">
                        <i class="fas fa-store"></i> Continuer mes achats
                    </button>
                </div>
            </div>
        `;

        document.querySelector('.signup-button').addEventListener('click', () => {
            window.location.href = 'profile.html?register=true';
        });
    }

    checkoutButton.disabled = true;
    checkoutButton.classList.add('disabled');
}

// Function to update the quantity of an item in the basket
async function updateQuantity(event, change) {
    const productId = parseInt(event.target.getAttribute('data-id'), 10);
    const basket = getBasket();
    const item = basket.find(i => i.product_id === productId);
    if (item) {
        const newQuantity = parseInt(item.quantity, 10) + change;

        if (newQuantity < 1) {
            removeItem(event);
            return;
        }

        // Check stock before increasing
        if (change > 0) {
            try {
                const product = await fetchProductDetails(productId);
                if (product && product.stock !== undefined) {
                    if (newQuantity > product.stock) {
                        showToast(`Stock insuffisant. Seulement ${product.stock} disponible(s).`, 'error');
                        return;
                    }
                }
            } catch (error) {
                console.error('Error checking stock:', error);
            }
        }

        item.quantity = newQuantity;
        saveBasket(basket);
        updateHeaderBasketCount();

        try {
            const response = await fetch(`${window.config.baseURL}/api/basket`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({
                    user_id: getUserId(),
                    product_id: item.product_id,
                    quantity: item.quantity,
                }),
            });

            if (response.ok) {
                console.log(`Quantity for product ${item.product_id} updated successfully.`);
            } else if (response.status === 401) {
                Auth.logout();
                return;
            } else {
                console.error(`Failed to update quantity for product ${item.product_id}.`);
            }
        } catch (error) {
            console.error('Error updating quantity on the server:', error);
        }

        renderBasket();
    }
}

// Function to remove an item from the basket
async function removeItem(event) {
    const productId = parseInt(event.target.getAttribute('data-id'));
    const userId = getUserId();
    let basket = getBasket();

    // Check if this is the last item
    if (basket.length === 1) {
        const confirmed = await showConfirmDialog(
            'Supprimer cet article?',
            'Votre panier sera vide apres cette action. Voulez-vous vraiment supprimer cet article?'
        );
        if (!confirmed) return;
    }

    basket = basket.filter(item => item.product_id !== productId);
    saveBasket(basket);
    updateHeaderBasketCount();

    try {
        const response = await fetch(`${window.config.baseURL}/api/basket?user_id=${userId}&product_id=${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (response.ok) {
            showToast('Article supprime du panier', 'success');
        } else if (response.status === 401) {
            Auth.logout();
            return;
        } else {
            console.error(`Failed to remove item with product_id ${productId}.`);
        }
    } catch (error) {
        console.error('Error removing item from the server:', error);
    }
    renderBasket();
}

// Show confirmation dialog
function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-dialog">
                <div class="confirm-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirm-buttons">
                    <button class="btn-cancel">Annuler</button>
                    <button class="btn-confirm">Supprimer</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Add animation
        setTimeout(() => overlay.classList.add('active'), 10);

        // Handle buttons
        overlay.querySelector('.btn-cancel').addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
            resolve(false);
        });

        overlay.querySelector('.btn-confirm').addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
            resolve(true);
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 300);
                resolve(false);
            }
        });
    });
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Apply promo code using PromoCodeSystem
async function applyPromoCode() {
    const promoInput = document.getElementById('promo-code');
    const applyBtn = document.querySelector('.btn-apply');
    const promoCode = promoInput.value.trim();

    if (!promoCode) {
        showToast('Veuillez entrer un code promo', 'error');
        return;
    }

    // Get current subtotal and item count
    const subtotal = parseFloat(localStorage.getItem('subtotal') || '0');
    const itemCount = parseInt(document.getElementById('item-count')?.textContent || '0');

    // Show loading state
    if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    // Validate and apply using PromoCodeSystem
    if (window.PromoCodeSystem) {
        try {
            const result = await PromoCodeSystem.applyCode(promoCode, subtotal, itemCount);

            if (result.valid) {
                showToast(`Code "${result.code}" applique! -${result.discountAmount.toFixed(2)}$`, 'success');
                updatePromoDisplay(result);
                renderBasket();
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            console.error('Error applying promo code:', err);
            showToast('Erreur lors de l\'application du code promo', 'error');
        }
    } else {
        showToast('Systeme de code promo non disponible', 'error');
    }

    // Reset button state
    if (applyBtn) {
        applyBtn.disabled = false;
        applyBtn.innerHTML = '<i class="fas fa-check"></i>';
    }
}

// Update promo display in UI
function updatePromoDisplay(promoData) {
    const promoSection = document.querySelector('.promo-section');
    const existingApplied = promoSection.querySelector('.promo-applied');

    if (existingApplied) {
        existingApplied.remove();
    }

    if (promoData && promoData.valid) {
        const appliedDiv = document.createElement('div');
        appliedDiv.className = 'promo-applied';
        appliedDiv.innerHTML = `
            <div class="promo-applied-content">
                <i class="fas fa-check-circle"></i>
                <div class="promo-info">
                    <span class="promo-code-applied">${promoData.code}</span>
                    <span class="promo-savings">-${promoData.discountAmount.toFixed(2)}$</span>
                </div>
                <button class="remove-promo" onclick="removePromoCode()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        promoSection.appendChild(appliedDiv);

        // Hide input wrapper
        const inputWrapper = promoSection.querySelector('.promo-input-wrapper');
        if (inputWrapper) inputWrapper.style.display = 'none';
        const hint = promoSection.querySelector('.promo-hint');
        if (hint) hint.style.display = 'none';
    }
}

// Remove applied promo code
function removePromoCode() {
    if (window.PromoCodeSystem) {
        PromoCodeSystem.removeAppliedPromo();
    }

    const promoSection = document.querySelector('.promo-section');
    const appliedDiv = promoSection.querySelector('.promo-applied');
    if (appliedDiv) appliedDiv.remove();

    // Show input wrapper again
    const inputWrapper = promoSection.querySelector('.promo-input-wrapper');
    if (inputWrapper) inputWrapper.style.display = 'flex';
    const hint = promoSection.querySelector('.promo-hint');
    if (hint) hint.style.display = 'block';

    // Clear input
    const promoInput = document.getElementById('promo-code');
    if (promoInput) promoInput.value = '';

    showToast('Code promo retire', 'info');
    renderBasket();
}

// Load delivery address
function loadDeliveryAddress() {
    const userData = Auth.getUserData();
    const addressSection = document.getElementById('delivery-address-section');

    if (!addressSection) return;

    if (userData && userData.address) {
        addressSection.innerHTML = `
            <div class="address-card">
                <div class="address-header">
                    <h3><i class="fas fa-map-marker-alt"></i> Adresse de livraison</h3>
                    <button class="btn-edit-address" onclick="editDeliveryAddress()">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                </div>
                <div class="address-content">
                    <p class="address-name">${userData.name || ''} ${userData.surname || ''}</p>
                    <p class="address-line">${userData.address || 'Adresse non definie'}</p>
                    <p class="address-phone"><i class="fas fa-phone"></i> ${userData.phone || 'Non defini'}</p>
                </div>
            </div>
        `;
    } else {
        addressSection.innerHTML = `
            <div class="address-card address-empty">
                <div class="address-header">
                    <h3><i class="fas fa-map-marker-alt"></i> Adresse de livraison</h3>
                </div>
                <div class="address-content">
                    <p class="no-address">Aucune adresse enregistree</p>
                    <button class="btn-add-address" onclick="editDeliveryAddress()">
                        <i class="fas fa-plus"></i> Ajouter une adresse
                    </button>
                </div>
            </div>
        `;
    }
}

// Edit delivery address modal
function editDeliveryAddress() {
    const userData = Auth.getUserData() || {};

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-dialog address-modal">
            <div class="modal-header">
                <h3><i class="fas fa-map-marker-alt"></i> Adresse de livraison</h3>
                <button class="modal-close" onclick="closeAddressModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="address-form" class="modal-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="addr-name">Nom</label>
                        <input type="text" id="addr-name" value="${userData.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="addr-surname">Prenom</label>
                        <input type="text" id="addr-surname" value="${userData.surname || ''}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="addr-phone">Telephone</label>
                    <input type="tel" id="addr-phone" value="${userData.phone || ''}" required>
                </div>
                <div class="form-group">
                    <label for="addr-address">Adresse complete</label>
                    <input type="text" id="addr-address" value="${userData.address || ''}" placeholder="123 Rue Principale" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="addr-city">Ville</label>
                        <input type="text" id="addr-city" value="${userData.city || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="addr-postal">Code postal</label>
                        <input type="text" id="addr-postal" value="${userData.postal_code || ''}" required>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel" onclick="closeAddressModal()">Annuler</button>
                    <button type="submit" class="btn-save">
                        <i class="fas fa-check"></i> Sauvegarder
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);

    // Handle form submit
    document.getElementById('address-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveDeliveryAddress();
    });
}

// Close address modal
function closeAddressModal() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    }
}

// Save delivery address
async function saveDeliveryAddress() {
    const addressData = {
        name: document.getElementById('addr-name').value,
        surname: document.getElementById('addr-surname').value,
        phone: document.getElementById('addr-phone').value,
        address: document.getElementById('addr-address').value,
        city: document.getElementById('addr-city').value,
        postal_code: document.getElementById('addr-postal').value
    };

    // Update localStorage userData
    const userData = Auth.getUserData() || {};
    const updatedData = { ...userData, ...addressData };
    localStorage.setItem('userData', JSON.stringify(updatedData));

    // Try to update on server
    try {
        const response = await fetch(`${window.config.baseURL}/api/users/${userData.user_id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify(addressData)
        });

        if (response.ok) {
            showToast('Adresse mise a jour!', 'success');
        }
    } catch (error) {
        console.error('Error updating address:', error);
    }

    closeAddressModal();
    loadDeliveryAddress();
}

function magasiner() {
    window.location.href = '../index.html';
}

function proceedToCheckout() {
    const basket = getBasket();
    if (basket.length === 0) {
        showToast('Votre panier est vide', 'error');
        return;
    }
    window.location.href = 'checkout.html';
}

function goBack() {
    window.history.back();
}

// ============================================
// AVAILABLE COUPONS FUNCTIONALITY
// ============================================

// Toggle available coupons section
function toggleAvailableCoupons() {
    const header = document.querySelector('.coupons-header');
    const list = document.getElementById('available-coupons-list');

    if (header && list) {
        header.classList.toggle('expanded');
        list.classList.toggle('expanded');
    }
}

// Load available coupons from server
async function loadAvailableCoupons() {
    const couponsList = document.getElementById('available-coupons-list');

    if (!couponsList || !Auth.isLoggedIn()) return;

    // Show loading
    couponsList.innerHTML = `
        <div class="coupons-loading">
            <i class="fas fa-spinner"></i> Chargement des coupons...
        </div>
    `;

    try {
        const response = await fetch(`${window.config.baseURL}/api/coupons/available`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch coupons');
        }

        const coupons = await response.json();

        if (coupons.length === 0) {
            couponsList.innerHTML = `
                <div class="no-coupons">
                    <i class="fas fa-ticket-alt"></i>
                    Aucun coupon disponible pour le moment
                </div>
            `;
            return;
        }

        renderAvailableCoupons(coupons);

    } catch (error) {
        console.error('Error loading coupons:', error);
        couponsList.innerHTML = `
            <div class="no-coupons">
                <i class="fas fa-exclamation-circle"></i>
                Impossible de charger les coupons
            </div>
        `;
    }
}

// Render available coupons
function renderAvailableCoupons(coupons) {
    const couponsList = document.getElementById('available-coupons-list');
    if (!couponsList) return;

    couponsList.innerHTML = coupons.map(coupon => {
        const isUsed = coupon.already_used && coupon.uses_remaining <= 0;
        const discountText = getDiscountText(coupon);
        const conditions = getConditionsHTML(coupon);
        const expiryDate = new Date(coupon.end_date);
        const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

        return `
            <div class="coupon-item ${isUsed ? 'used' : ''}"
                 onclick="${isUsed ? '' : `selectCoupon('${coupon.code}')`}"
                 title="${isUsed ? 'Deja utilise' : 'Cliquez pour appliquer'}">
                <div class="coupon-top">
                    <span class="coupon-code">${coupon.code}</span>
                    <span class="coupon-discount">${discountText}</span>
                </div>
                <div class="coupon-name">${coupon.name}</div>
                ${coupon.description ? `<div class="coupon-description">${coupon.description}</div>` : ''}
                <div class="coupon-conditions">
                    ${conditions}
                    ${daysUntilExpiry <= 7 ? `
                        <span class="coupon-condition expiry">
                            <i class="fas fa-clock"></i> Expire dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}
                        </span>
                    ` : ''}
                    ${isUsed ? `<span class="coupon-used-badge"><i class="fas fa-check"></i> Deja utilise</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Get discount text for coupon
function getDiscountText(coupon) {
    switch (coupon.discount_type) {
        case 'percentage':
            return `-${parseFloat(coupon.discount_value)}%`;
        case 'fixed_amount':
            return `-${parseFloat(coupon.discount_value).toFixed(2)}$`;
        case 'buy_x_get_y':
            return `${coupon.buy_quantity || 0}+${coupon.get_quantity || 0} gratuit`;
        case 'free_shipping':
            return 'Livraison gratuite';
        default:
            return 'Rabais';
    }
}

// Get conditions HTML for coupon
function getConditionsHTML(coupon) {
    const conditions = [];

    if (parseFloat(coupon.min_purchase_amount) > 0) {
        conditions.push(`<span class="coupon-condition"><i class="fas fa-shopping-cart"></i> Min. ${parseFloat(coupon.min_purchase_amount).toFixed(2)}$</span>`);
    }

    if (parseInt(coupon.min_items_in_cart) > 0) {
        conditions.push(`<span class="coupon-condition"><i class="fas fa-box"></i> Min. ${coupon.min_items_in_cart} articles</span>`);
    }

    if (coupon.applies_to === 'category' && coupon.category_name) {
        conditions.push(`<span class="coupon-condition"><i class="fas fa-tag"></i> ${coupon.category_name}</span>`);
    }

    if (coupon.applies_to === 'department' && coupon.department_name) {
        conditions.push(`<span class="coupon-condition"><i class="fas fa-store"></i> ${coupon.department_name}</span>`);
    }

    if (coupon.max_discount_amount && coupon.discount_type === 'percentage') {
        conditions.push(`<span class="coupon-condition"><i class="fas fa-hand-holding-usd"></i> Max. ${parseFloat(coupon.max_discount_amount).toFixed(2)}$</span>`);
    }

    return conditions.join('');
}

// Select and apply a coupon
async function selectCoupon(code) {
    const promoInput = document.getElementById('promo-code');
    if (promoInput) {
        promoInput.value = code;
    }

    // Apply the coupon
    await applyPromoCode();

    // Collapse the coupons list
    const header = document.querySelector('.coupons-header');
    const list = document.getElementById('available-coupons-list');
    if (header && list) {
        header.classList.remove('expanded');
        list.classList.remove('expanded');
    }
}
