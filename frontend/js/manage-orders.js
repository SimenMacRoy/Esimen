// ============================================
// ADMIN ORDERS MANAGEMENT - Shek's House
// ============================================

// Use global config from config.js
if (typeof config === 'undefined') {
    var config = window.config || { baseURL: 'http://localhost:3006' };
}

let allOrders = [];
let currentFilter = 'all';
let searchTerm = '';

// Status labels and colors
const statusConfig = {
    confirmed: { label: 'Confirmee', color: '#3498db', icon: 'fa-check' },
    processing: { label: 'En preparation', color: '#f39c12', icon: 'fa-box' },
    shipped: { label: 'Expediee', color: '#9b59b6', icon: 'fa-truck' },
    delivered: { label: 'Livree', color: '#27ae60', icon: 'fa-check-circle' },
    cancelled: { label: 'Annulee', color: '#e74c3c', icon: 'fa-times-circle' }
};

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Check admin access
    if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
        showToast('Acces reserve aux administrateurs', 'error');
        setTimeout(() => {
            window.location.href = 'profile.html';
        }, 1500);
        return;
    }

    // Initialize components
    if (typeof ShekComponents !== 'undefined') {
        ShekComponents.initHeader({ showSearch: false, showTabs: false });
        ShekComponents.initFooter('profile');
    }

    // Load data
    loadStats();
    loadOrders();

    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            searchTerm = e.target.value;
            loadOrders();
        }, 300));
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            loadOrders();
        });
    }
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// LOAD DATA
// ============================================
async function loadStats() {
    try {
        const res = await fetch(`${config.baseURL}/api/admin/orders/stats/summary`, {
            headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
        });

        if (!res.ok) throw new Error();
        const stats = await res.json();

        document.getElementById('stat-total').textContent = stats.total || 0;
        document.getElementById('stat-confirmed').textContent = stats.confirmed || 0;
        document.getElementById('stat-processing').textContent = stats.processing || 0;
        document.getElementById('stat-shipped').textContent = stats.shipped || 0;
        document.getElementById('stat-delivered').textContent = stats.delivered || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadOrders() {
    const ordersList = document.getElementById('orders-list');
    ordersList.innerHTML = '<div class="loader-container"><div class="loader"></div><p>Chargement...</p></div>';

    try {
        let url = `${config.baseURL}/api/admin/orders?limit=100`;
        if (currentFilter !== 'all') {
            url += `&status=${currentFilter}`;
        }
        if (searchTerm) {
            url += `&search=${encodeURIComponent(searchTerm)}`;
        }

        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
        });

        if (res.status === 403) {
            showToast('Acces non autorise', 'error');
            window.location.href = 'profile.html';
            return;
        }

        if (!res.ok) throw new Error();

        allOrders = await res.json();
        renderOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erreur lors du chargement des commandes</p>
                <button onclick="loadOrders()" class="btn-retry">Reessayer</button>
            </div>
        `;
    }
}

// ============================================
// RENDER ORDERS
// ============================================
function renderOrders() {
    const ordersList = document.getElementById('orders-list');

    if (allOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>Aucune commande trouvee</p>
            </div>
        `;
        return;
    }

    ordersList.innerHTML = allOrders.map(order => createOrderCard(order)).join('');
}

function createOrderCard(order) {
    const date = new Date(order.created_at).toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const status = statusConfig[order.status] || statusConfig.confirmed;
    const customerName = `${order.customer_name || ''} ${order.customer_surname || ''}`.trim() || 'Client inconnu';

    return `
        <div class="order-card" onclick="openOrderDetail(${order.order_id})">
            <div class="order-header">
                <div class="order-number">
                    <span class="order-id">#${order.order_number}</span>
                    <span class="order-date">${date}</span>
                </div>
                <span class="status-badge" style="background-color: ${status.color}">
                    <i class="fas ${status.icon}"></i> ${status.label}
                </span>
            </div>
            <div class="order-body">
                <div class="customer-info">
                    <i class="fas fa-user"></i>
                    <div>
                        <span class="customer-name">${customerName}</span>
                        <span class="customer-email">${order.customer_email || ''}</span>
                    </div>
                </div>
                <div class="order-summary">
                    <span class="item-count">${order.item_count || 0} article(s)</span>
                    <span class="order-total">CA$ ${parseFloat(order.total).toFixed(2)}</span>
                </div>
            </div>
            <div class="order-actions">
                <button class="btn-view" onclick="event.stopPropagation(); openOrderDetail(${order.order_id})">
                    <i class="fas fa-eye"></i> Voir
                </button>
                <button class="btn-status" onclick="event.stopPropagation(); openStatusMenu(${order.order_id}, '${order.status}')">
                    <i class="fas fa-edit"></i> Statut
                </button>
            </div>
        </div>
    `;
}

// ============================================
// ORDER DETAIL MODAL
// ============================================
async function openOrderDetail(orderId) {
    const modal = document.getElementById('order-modal');
    const modalContent = document.getElementById('modal-content');

    modal.style.display = 'flex';
    modalContent.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';

    try {
        const res = await fetch(`${config.baseURL}/api/admin/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
        });

        if (!res.ok) throw new Error();
        const order = await res.json();

        const status = statusConfig[order.status] || statusConfig.confirmed;
        const date = new Date(order.created_at).toLocaleDateString('fr-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const itemsHtml = (order.items || []).map(item => `
            <div class="order-item">
                <img src="${getImageUrl(item.image_url)}" alt="${item.product_name}" onerror="this.src='../assets/images/default_image.jpg'">
                <div class="item-info">
                    <span class="item-name">${item.product_name}</span>
                    <span class="item-qty">Qte: ${item.quantity}</span>
                </div>
                <span class="item-price">CA$ ${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
            </div>
        `).join('');

        modalContent.innerHTML = `
            <div class="order-detail">
                <div class="detail-header">
                    <h2>Commande #${order.order_number}</h2>
                    <span class="status-badge" style="background-color: ${status.color}">
                        <i class="fas ${status.icon}"></i> ${status.label}
                    </span>
                </div>

                <div class="detail-section">
                    <h3><i class="fas fa-user"></i> Client</h3>
                    <p><strong>${order.customer_name || ''} ${order.customer_surname || ''}</strong></p>
                    <p>${order.customer_email || ''}</p>
                    <p>${order.customer_phone || ''}</p>
                </div>

                <div class="detail-section">
                    <h3><i class="fas fa-map-marker-alt"></i> Adresse de livraison</h3>
                    <p>${order.delivery_address || ''}</p>
                    <p>${order.delivery_city || ''}, ${order.delivery_province || ''} ${order.delivery_postal || ''}</p>
                </div>

                <div class="detail-section">
                    <h3><i class="fas fa-shopping-bag"></i> Articles</h3>
                    <div class="order-items-list">
                        ${itemsHtml || '<p>Aucun article</p>'}
                    </div>
                </div>

                <div class="detail-section totals">
                    <div class="total-row">
                        <span>Sous-total</span>
                        <span>CA$ ${parseFloat(order.subtotal).toFixed(2)}</span>
                    </div>
                    ${order.discount > 0 ? `
                    <div class="total-row discount">
                        <span>Reduction ${order.promo_code ? `(${order.promo_code})` : ''}</span>
                        <span>-CA$ ${parseFloat(order.discount).toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="total-row">
                        <span>Taxes</span>
                        <span>CA$ ${parseFloat(order.taxes).toFixed(2)}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span>Total</span>
                        <span>CA$ ${parseFloat(order.total).toFixed(2)}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h3><i class="fas fa-clock"></i> Date de commande</h3>
                    <p>${date}</p>
                </div>

                <div class="status-update-section">
                    <h3><i class="fas fa-edit"></i> Mettre a jour le statut</h3>
                    <div class="status-buttons">
                        <button class="status-btn ${order.status === 'confirmed' ? 'active' : ''}"
                                onclick="updateStatus(${order.order_id}, 'confirmed')"
                                style="--btn-color: ${statusConfig.confirmed.color}">
                            <i class="fas fa-check"></i> Confirmee
                        </button>
                        <button class="status-btn ${order.status === 'processing' ? 'active' : ''}"
                                onclick="updateStatus(${order.order_id}, 'processing')"
                                style="--btn-color: ${statusConfig.processing.color}">
                            <i class="fas fa-box"></i> Preparation
                        </button>
                        <button class="status-btn ${order.status === 'shipped' ? 'active' : ''}"
                                onclick="updateStatus(${order.order_id}, 'shipped')"
                                style="--btn-color: ${statusConfig.shipped.color}">
                            <i class="fas fa-truck"></i> Expediee
                        </button>
                        <button class="status-btn ${order.status === 'delivered' ? 'active' : ''}"
                                onclick="updateStatus(${order.order_id}, 'delivered')"
                                style="--btn-color: ${statusConfig.delivered.color}">
                            <i class="fas fa-check-circle"></i> Livree
                        </button>
                        <button class="status-btn ${order.status === 'cancelled' ? 'active' : ''}"
                                onclick="updateStatus(${order.order_id}, 'cancelled')"
                                style="--btn-color: ${statusConfig.cancelled.color}">
                            <i class="fas fa-times-circle"></i> Annulee
                        </button>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading order detail:', error);
        modalContent.innerHTML = '<div class="error-state"><p>Erreur lors du chargement</p></div>';
    }
}

function closeModal() {
    document.getElementById('order-modal').style.display = 'none';
}

// Close modal on outside click
document.getElementById('order-modal')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal();
    }
});

// ============================================
// UPDATE STATUS
// ============================================
async function updateStatus(orderId, newStatus) {
    try {
        const res = await fetch(`${config.baseURL}/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!res.ok) throw new Error();

        const data = await res.json();
        showToast(`Statut mis a jour: ${statusConfig[newStatus].label}`, 'success');

        // Refresh data
        loadStats();
        loadOrders();

        // Update modal if open
        openOrderDetail(orderId);
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Erreur lors de la mise a jour', 'error');
    }
}

function openStatusMenu(orderId, currentStatus) {
    openOrderDetail(orderId);
}

// ============================================
// HELPERS
// ============================================
function getImageUrl(imagePath) {
    if (!imagePath) return '../assets/images/default_image.jpg';
    return imagePath.startsWith('http') ? imagePath : `${config.baseURL}${imagePath}`;
}

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
