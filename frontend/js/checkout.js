// Checkout page with JWT authentication and multi-step flow

// Use global config if available
const config = window.config || { baseURL: 'http://localhost:3006' };

// Tax rate (Quebec TPS + TVQ)
const TAX_RATE = 0.14975;

// Stripe configuration
let stripe;
let cardElement;
let currentStep = 1;
let orderData = {};

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    if (!Auth.isLoggedIn()) {
        showToast('Veuillez vous connecter pour proceder au paiement.', 'error');
        setTimeout(() => {
            window.location.href = 'profile.html';
        }, 1500);
        return;
    }

    // Check if basket is empty
    const basket = getBasket();
    if (basket.length === 0) {
        showToast('Votre panier est vide.', 'error');
        setTimeout(() => {
            window.location.href = 'basket.html';
        }, 1500);
        return;
    }

    // Initialize Stripe
    initializeStripe();

    // Load order summary
    await loadOrderSummary();

    // Pre-fill delivery form with user data
    prefillDeliveryForm();

    // Setup form handlers
    setupFormHandlers();

    // Setup payment method tabs
    setupPaymentMethods();
});

function getUserId() {
    const userData = Auth.getUserData();
    return userData ? userData.user_id : null;
}

function getBasket() {
    const userId = getUserId();
    if (userId) {
        const basket = localStorage.getItem(`basket_${userId}`);
        return basket ? JSON.parse(basket) : [];
    }
    return [];
}

// Initialize Stripe Elements
function initializeStripe() {
    try {
        stripe = Stripe('pk_test_51PIRk7DIrmiE2Hgb4lLVD99VQnFg7uWaAhtEBBBzLIixaLhcQ9FOuhkSonPw8SozcgiS19efR92rNwYX6kQ7TRvT00YayxN2sq');
        const elements = stripe.elements();

        const style = {
            base: {
                color: '#333',
                fontFamily: 'Poppins, sans-serif',
                fontSmoothing: 'antialiased',
                fontSize: '16px',
                '::placeholder': {
                    color: '#aab7c4'
                }
            },
            invalid: {
                color: '#e74c3c',
                iconColor: '#e74c3c'
            }
        };

        cardElement = elements.create('card', {
            style: style,
            hidePostalCode: true
        });

        cardElement.mount('#card-element');

        // Handle card errors
        cardElement.on('change', (event) => {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });
    } catch (error) {
        console.error('Error initializing Stripe:', error);
    }
}

// Load order summary from basket
async function loadOrderSummary() {
    const basket = getBasket();
    const orderItemsContainer = document.getElementById('order-items');

    let subtotal = 0;
    let itemsHtml = '';

    // Fetch product details for each item
    for (const item of basket) {
        try {
            const response = await fetch(`${config.baseURL}/api/products/${item.product_id}`);
            if (response.ok) {
                const product = await response.json();
                const imagePath = product.images && product.images.length > 0 ? product.images[0] : null;
                const imageUrl = imagePath ? (imagePath.startsWith('http') ? imagePath : `${config.baseURL}${imagePath}`) : '../assets/images/default_image.jpg';
                const itemTotal = item.quantity * product.price;
                subtotal += itemTotal;

                itemsHtml += `
                    <div class="order-item">
                        <img src="${imageUrl}" alt="${product.name}" class="order-item-image">
                        <div class="order-item-info">
                            <p class="order-item-name">${product.name}</p>
                            <p class="order-item-qty">Quantite: ${item.quantity}</p>
                        </div>
                        <span class="order-item-price">CA$ ${itemTotal.toFixed(2)}</span>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error fetching product:', error);
        }
    }

    orderItemsContainer.innerHTML = itemsHtml || '<p>Aucun article</p>';

    // Check for applied promo
    let discount = 0;
    const appliedPromo = window.PromoCodeSystem ? PromoCodeSystem.getAppliedPromo() : null;

    if (appliedPromo) {
        discount = appliedPromo.discountAmount;
        document.getElementById('summary-discount-row').style.display = 'flex';
        document.getElementById('summary-discount').textContent = `-CA$ ${discount.toFixed(2)}`;
        document.getElementById('applied-promo').style.display = 'flex';
        document.getElementById('promo-code-display').textContent = appliedPromo.code;
    }

    // Calculate totals
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const taxes = discountedSubtotal * TAX_RATE;
    const total = discountedSubtotal + taxes;

    // Update display
    document.getElementById('summary-subtotal').textContent = `CA$ ${subtotal.toFixed(2)}`;
    document.getElementById('summary-taxes').textContent = `CA$ ${taxes.toFixed(2)}`;
    document.getElementById('summary-total').textContent = `CA$ ${total.toFixed(2)}`;
    document.getElementById('pay-amount').textContent = `CA$ ${total.toFixed(2)}`;

    // Store order data
    orderData = {
        subtotal,
        discount,
        taxes,
        total,
        items: basket
    };
}

// Pre-fill delivery form with user data
function prefillDeliveryForm() {
    const userData = Auth.getUserData();
    if (userData) {
        document.getElementById('delivery-name').value = userData.name || '';
        document.getElementById('delivery-surname').value = userData.surname || '';
        document.getElementById('delivery-email').value = userData.email || '';
        document.getElementById('delivery-phone').value = userData.phone || '';
        document.getElementById('delivery-address').value = userData.address || '';
        document.getElementById('delivery-city').value = userData.city || '';
        document.getElementById('delivery-postal').value = userData.postal_code || '';

        if (userData.province) {
            document.getElementById('delivery-province').value = userData.province;
        }
    }
}

// Setup form handlers
function setupFormHandlers() {
    // Delivery form submission
    document.getElementById('delivery-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveDeliveryInfo();
        goToStep(2);
    });
}

// Save delivery information
function saveDeliveryInfo() {
    orderData.delivery = {
        name: document.getElementById('delivery-name').value,
        surname: document.getElementById('delivery-surname').value,
        email: document.getElementById('delivery-email').value,
        phone: document.getElementById('delivery-phone').value,
        address: document.getElementById('delivery-address').value,
        city: document.getElementById('delivery-city').value,
        province: document.getElementById('delivery-province').value,
        postal: document.getElementById('delivery-postal').value,
        country: document.getElementById('delivery-country').value,
        notes: document.getElementById('delivery-notes').value
    };
}

// Setup payment method tabs
function setupPaymentMethods() {
    const methodButtons = document.querySelectorAll('.payment-method');

    methodButtons.forEach(button => {
        button.addEventListener('click', () => {
            const method = button.dataset.method;

            // Update active button
            methodButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Show corresponding content
            document.querySelectorAll('.payment-content').forEach(content => {
                if (content.dataset.method === method) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });
        });
    });
}

// Navigate between steps
function goToStep(step) {
    currentStep = step;

    // Hide all steps
    document.querySelectorAll('.checkout-step').forEach(s => s.classList.add('hidden'));

    // Show current step
    document.getElementById(`step-${step}`).classList.remove('hidden');

    // Update progress indicators
    document.querySelectorAll('.progress-step').forEach(s => {
        const stepNum = parseInt(s.dataset.step);
        s.classList.remove('active', 'completed');

        if (stepNum === step) {
            s.classList.add('active');
        } else if (stepNum < step) {
            s.classList.add('completed');
        }
    });

    // Update progress lines
    document.querySelectorAll('.progress-line').forEach((line, index) => {
        if (index < step - 1) {
            line.classList.add('active');
        } else {
            line.classList.remove('active');
        }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Process payment
async function processPayment() {
    const cardName = document.getElementById('card-name').value;

    if (!cardName.trim()) {
        showToast('Veuillez entrer le nom sur la carte', 'error');
        return;
    }

    showLoading(true);

    try {
        // Create payment method with Stripe
        const { paymentMethod, error } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
            billing_details: {
                name: cardName,
                email: orderData.delivery.email,
                address: {
                    city: orderData.delivery.city,
                    postal_code: orderData.delivery.postal,
                    country: 'CA'
                }
            }
        });

        if (error) {
            showLoading(false);
            showToast(error.message, 'error');
            return;
        }

        // Send payment to server
        const response = await fetch(`${config.baseURL}/api/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({
                user_id: getUserId(),
                amount: Math.round(orderData.total * 100),
                currency: 'cad',
                paymentMethodId: paymentMethod.id,
                delivery: orderData.delivery,
                items: orderData.items,
                subtotal: orderData.subtotal,
                discount: orderData.discount,
                taxes: orderData.taxes,
                promoCode: window.PromoCodeSystem ? PromoCodeSystem.getAppliedPromo()?.code : null
            })
        });

        if (response.status === 401) {
            showLoading(false);
            Auth.logout();
            return;
        }

        const result = await response.json();

        if (result.success) {
            // Clear basket and promo
            const userId = getUserId();
            localStorage.removeItem(`basket_${userId}`);
            localStorage.removeItem('subtotal');
            if (window.PromoCodeSystem) {
                PromoCodeSystem.removeAppliedPromo();
            }

            // Show confirmation
            showConfirmation(result.orderId || generateOrderNumber());
        } else {
            showLoading(false);
            showToast(result.error || 'Echec du paiement', 'error');
        }
    } catch (error) {
        console.error('Payment error:', error);
        showLoading(false);
        showToast('Une erreur s\'est produite. Veuillez reessayer.', 'error');
    }
}

// Process PayPal payment
function processPayPal() {
    showToast('PayPal n\'est pas encore disponible', 'info');
}

// Show confirmation step
function showConfirmation(orderId) {
    showLoading(false);

    // Update confirmation details
    document.getElementById('order-number').textContent = orderId;
    document.getElementById('confirmation-email').textContent = orderData.delivery.email;

    // Calculate estimated delivery date (3-5 business days)
    const today = new Date();
    const minDays = 3;
    const maxDays = 5;
    const minDate = addBusinessDays(today, minDays);
    const maxDate = addBusinessDays(today, maxDays);

    document.getElementById('delivery-date').textContent =
        `${formatDate(minDate)} - ${formatDate(maxDate)}`;

    // Go to confirmation step
    goToStep(3);
}

// Generate order number
function generateOrderNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `#SH-${timestamp}${random}`;
}

// Add business days to date
function addBusinessDays(date, days) {
    const result = new Date(date);
    let addedDays = 0;

    while (addedDays < days) {
        result.setDate(result.getDate() + 1);
        const dayOfWeek = result.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            addedDays++;
        }
    }

    return result;
}

// Format date
function formatDate(date) {
    const options = { day: 'numeric', month: 'short' };
    return date.toLocaleDateString('fr-CA', options);
}

// Toggle order summary on mobile
function toggleSummary() {
    const content = document.querySelector('.summary-content');
    const icon = document.querySelector('.toggle-summary i');

    content.classList.toggle('open');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
}

// Show/hide loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
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

// Go back to previous page
function goBack() {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    } else {
        window.location.href = 'basket.html';
    }
}
