// ============================================
// ORDERS PAGE - Shek's House
// ============================================

// Use global config from config.js (fallback for local dev)
if (typeof config === 'undefined') {
    var config = window.config || { baseURL: 'http://localhost:3006' };
}

// Helper to get full image URL
function getImageUrl(imagePath) {
    if (!imagePath) return '../assets/images/default_image.jpg';
    return imagePath.startsWith('http') ? imagePath : `${config.baseURL}${imagePath}`;
}

let orders = [];

// ============================================
// DOM ELEMENTS
// ============================================
const loadingState = document.getElementById('loading-state');
const ordersList = document.getElementById('orders-list');
const emptyState = document.getElementById('empty-state');
const loginRequired = document.getElementById('login-required');
const orderModal = document.getElementById('order-modal');
const modalClose = document.getElementById('modal-close');
const modalOrderNumber = document.getElementById('modal-order-number');
const modalBody = document.getElementById('modal-body');

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isLoggedIn()) {
        showLoginRequired();
        return;
    }

    loadOrders();
    setupModal();
});

// ============================================
// LOAD ORDERS
// ============================================
async function loadOrders() {
    try {
        const res = await fetch(`${config.baseURL}/api/orders`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (res.status === 401) {
            Auth.logout();
            showLoginRequired();
            return;
        }

        if (!res.ok) throw new Error();

        orders = await res.json();
        renderOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Erreur lors du chargement des commandes', 'error');
        showEmpty();
    }
}

// ============================================
// RENDER ORDERS
// ============================================
function renderOrders() {
    loadingState.style.display = 'none';

    if (orders.length === 0) {
        showEmpty();
        return;
    }

    ordersList.style.display = 'flex';
    ordersList.innerHTML = orders.map(order => createOrderCard(order)).join('');
}

function createOrderCard(order) {
    const date = new Date(order.created_at).toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const statusLabels = {
        confirmed: 'Confirmée',
        processing: 'En traitement',
        shipped: 'Expédiée',
        delivered: 'Livrée',
        cancelled: 'Annulée'
    };

    const statusIcons = {
        confirmed: 'fa-check-circle',
        processing: 'fa-cog',
        shipped: 'fa-truck',
        delivered: 'fa-box-open',
        cancelled: 'fa-times-circle'
    };

    // Create item thumbnails (max 4)
    const itemsPreview = order.items.slice(0, 4).map((item, index) => {
        if (index === 3 && order.items.length > 4) {
            return `<div class="item-thumbnail more">+${order.items.length - 3}</div>`;
        }
        const imgSrc = getImageUrl(item.image_url);
        return `<div class="item-thumbnail"><img src="${imgSrc}" alt="${item.product_name}"></div>`;
    }).join('');

    return `
        <div class="order-card" data-order-id="${order.order_id}">
            <div class="order-header">
                <div class="order-info">
                    <span class="order-number">#${order.order_number}</span>
                    <span class="order-date">${date}</span>
                </div>
                <div class="status-badge ${order.status}">
                    <i class="fas ${statusIcons[order.status] || 'fa-info-circle'}"></i>
                    <span>${statusLabels[order.status] || order.status}</span>
                </div>
            </div>
            <div class="order-body">
                <div class="order-items-preview">
                    ${itemsPreview}
                </div>
                <div class="order-summary">
                    <div class="order-total">
                        <span class="order-total-label">${order.items.length} article${order.items.length > 1 ? 's' : ''}</span>
                        <span class="order-total-amount">CA$ ${order.total.toFixed(2)}</span>
                    </div>
                    <button class="btn-view-order" onclick="showOrderDetails('${order.order_id}')">
                        <i class="fas fa-eye"></i>
                        Voir les détails
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// ORDER DETAILS MODAL
// ============================================
function showOrderDetails(orderId) {
    const order = orders.find(o => o.order_id == orderId);
    if (!order) return;

    modalOrderNumber.textContent = `#${order.order_number}`;

    const date = new Date(order.created_at).toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const itemsHtml = order.items.map(item => {
        const imgSrc = getImageUrl(item.image_url);
        return `
            <div class="modal-item">
                <div class="modal-item-image">
                    <img src="${imgSrc}" alt="${item.product_name}">
                </div>
                <div class="modal-item-info">
                    <div class="modal-item-name">${item.product_name}</div>
                    <div class="modal-item-qty">Quantité: ${item.quantity}</div>
                </div>
                <div class="modal-item-price">CA$ ${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        `;
    }).join('');

    const address = [
        order.delivery_address,
        `${order.delivery_city}, ${order.delivery_province} ${order.delivery_postal}`
    ].filter(Boolean).join('<br>');

    modalBody.innerHTML = `
        <div class="modal-section">
            <div class="modal-section-title">Date de commande</div>
            <p style="margin: 0; color: #1a1a1a;">${date}</p>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">Articles commandés</div>
            <div class="modal-items">
                ${itemsHtml}
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">Récapitulatif</div>
            <div class="modal-totals">
                <div class="modal-total-row">
                    <span>Sous-total</span>
                    <span>CA$ ${order.subtotal.toFixed(2)}</span>
                </div>
                ${order.discount > 0 ? `
                <div class="modal-total-row discount">
                    <span>Réduction</span>
                    <span>-CA$ ${order.discount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="modal-total-row">
                    <span>Livraison</span>
                    <span style="color: #27ae60; font-weight: 600;">GRATUITE</span>
                </div>
                <div class="modal-total-row">
                    <span>Taxes (TPS + TVQ)</span>
                    <span>CA$ ${order.taxes.toFixed(2)}</span>
                </div>
                <div class="modal-total-row final">
                    <span>Total</span>
                    <span>CA$ ${order.total.toFixed(2)}</span>
                </div>
            </div>
        </div>

        ${address ? `
        <div class="modal-section">
            <div class="modal-section-title">Adresse de livraison</div>
            <div class="modal-address">
                <p>${address}</p>
            </div>
        </div>
        ` : ''}
    `;

    orderModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function setupModal() {
    modalClose.onclick = closeModal;
    orderModal.onclick = (e) => {
        if (e.target === orderModal) closeModal();
    };
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function closeModal() {
    orderModal.style.display = 'none';
    document.body.style.overflow = '';
}

// ============================================
// UI STATES
// ============================================
function showEmpty() {
    loadingState.style.display = 'none';
    ordersList.style.display = 'none';
    emptyState.style.display = 'block';
}

function showLoginRequired() {
    loadingState.style.display = 'none';
    ordersList.style.display = 'none';
    loginRequired.style.display = 'block';
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
