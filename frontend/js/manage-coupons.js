// Manage Coupons - Admin functionality
// Use global config from config.js (fallback for local dev)
if (typeof config === 'undefined') {
    var config = window.config || { baseURL: 'http://localhost:3006' };
}

let allCoupons = [];
let categories = [];
let departments = [];

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is admin
    if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
        window.location.href = 'profile.html';
        return;
    }

    loadCoupons();
    loadCategories();
    loadDepartments();
    setupFormListeners();
});

// ============================================
// LOAD COUPONS
// ============================================
async function loadCoupons() {
    const couponsList = document.getElementById('coupons-list');

    try {
        const res = await fetch(`${config.baseURL}/api/admin/coupons`, {
            headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
        });

        if (!res.ok) throw new Error('Failed to fetch coupons');

        allCoupons = await res.json();
        updateStats();
        renderCoupons(allCoupons);
    } catch (err) {
        console.error('Error loading coupons:', err);
        couponsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erreur lors du chargement des coupons</p>
            </div>
        `;
    }
}

// ============================================
// LOAD CATEGORIES & DEPARTMENTS
// ============================================
async function loadCategories() {
    try {
        const res = await fetch(`${config.baseURL}/api/admin/coupons-categories`, {
            headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
        });
        if (res.ok) {
            categories = await res.json();
            const select = document.getElementById('category-select');
            select.innerHTML = '<option value="">Choisir...</option>' +
                categories.map(c => `<option value="${c.category_id}">${c.category_name}</option>`).join('');
        }
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

async function loadDepartments() {
    try {
        const res = await fetch(`${config.baseURL}/api/admin/coupons-departments`, {
            headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
        });
        if (res.ok) {
            departments = await res.json();
            const select = document.getElementById('department-select');
            select.innerHTML = '<option value="">Choisir...</option>' +
                departments.map(d => `<option value="${d.department_name}">${d.department_name}</option>`).join('');
        }
    } catch (err) {
        console.error('Error loading departments:', err);
    }
}

// ============================================
// UPDATE STATS
// ============================================
function updateStats() {
    const now = new Date();
    const totalCoupons = allCoupons.length;
    const activeCoupons = allCoupons.filter(c => {
        return c.is_active && new Date(c.start_date) <= now && new Date(c.end_date) >= now;
    }).length;
    const totalUses = allCoupons.reduce((sum, c) => sum + (c.current_uses || 0), 0);

    document.getElementById('total-coupons').textContent = totalCoupons;
    document.getElementById('active-coupons').textContent = activeCoupons;
    document.getElementById('total-uses').textContent = totalUses;
}

// ============================================
// RENDER COUPONS
// ============================================
function renderCoupons(coupons) {
    const couponsList = document.getElementById('coupons-list');

    if (coupons.length === 0) {
        couponsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-ticket-alt"></i>
                <p>Aucun coupon trouve. Creez votre premier coupon!</p>
            </div>
        `;
        return;
    }

    couponsList.innerHTML = coupons.map(coupon => {
        const status = getCouponStatus(coupon);
        const discountDisplay = getDiscountDisplay(coupon);

        return `
            <div class="coupon-card ${status.class}">
                <div class="coupon-code-badge">${coupon.code}</div>
                <div class="coupon-info">
                    <h3 class="coupon-name">${coupon.name}</h3>
                    ${coupon.description ? `<p class="coupon-description">${coupon.description}</p>` : ''}
                    <div class="coupon-meta">
                        <span class="coupon-meta-item">
                            <i class="fas fa-calendar"></i>
                            ${formatDate(coupon.start_date)} - ${formatDate(coupon.end_date)}
                        </span>
                        <span class="coupon-meta-item">
                            <i class="fas fa-users"></i>
                            ${coupon.current_uses || 0}${coupon.max_total_uses ? '/' + coupon.max_total_uses : ''} utilisations
                        </span>
                        ${parseFloat(coupon.min_purchase_amount) > 0 ? `
                            <span class="coupon-meta-item">
                                <i class="fas fa-shopping-cart"></i>
                                Min. ${parseFloat(coupon.min_purchase_amount).toFixed(2)} CA$
                            </span>
                        ` : ''}
                        ${coupon.applies_to !== 'all' ? `
                            <span class="coupon-meta-item">
                                <i class="fas fa-filter"></i>
                                ${getAppliesToLabel(coupon)}
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="coupon-discount">
                    <div class="value">${discountDisplay.value}</div>
                    <div class="type">${discountDisplay.type}</div>
                </div>
                <div class="coupon-status">
                    <span class="status-badge ${status.class}">
                        <i class="fas fa-${status.icon}"></i>
                        ${status.label}
                    </span>
                </div>
                <div class="coupon-actions">
                    <button class="btn-action btn-edit" onclick="editCoupon(${coupon.coupon_id})" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteCoupon(${coupon.coupon_id})" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function getCouponStatus(coupon) {
    const now = new Date();
    const startDate = new Date(coupon.start_date);
    const endDate = new Date(coupon.end_date);

    if (!coupon.is_active) {
        return { class: 'inactive', label: 'Inactif', icon: 'pause-circle' };
    }
    if (endDate < now) {
        return { class: 'expired', label: 'Expire', icon: 'times-circle' };
    }
    if (startDate > now) {
        return { class: 'inactive', label: 'Planifie', icon: 'clock' };
    }
    return { class: 'active', label: 'Actif', icon: 'check-circle' };
}

function getDiscountDisplay(coupon) {
    switch (coupon.discount_type) {
        case 'percentage':
            return { value: `${parseFloat(coupon.discount_value)}%`, type: 'rabais' };
        case 'fixed_amount':
            return { value: `${parseFloat(coupon.discount_value).toFixed(2)}$`, type: 'rabais' };
        case 'buy_x_get_y':
            return { value: `${coupon.buy_quantity || 0}+${coupon.get_quantity || 0}`, type: 'gratuit' };
        case 'free_shipping':
            return { value: 'Gratuit', type: 'livraison' };
        default:
            return { value: '-', type: '' };
    }
}

function getAppliesToLabel(coupon) {
    switch (coupon.applies_to) {
        case 'department':
            return coupon.department_name || 'Departement';
        case 'category':
            return coupon.category_name || 'Categorie';
        case 'product':
            return `Produit #${coupon.product_id}`;
        default:
            return 'Tous';
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTimeLocal(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const offset = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - offset);
    return local.toISOString().slice(0, 16);
}

// ============================================
// FILTER COUPONS
// ============================================
function filterCoupons() {
    const filterValue = document.getElementById('filter-status').value;
    const now = new Date();

    let filtered = allCoupons;

    if (filterValue === 'active') {
        filtered = allCoupons.filter(c => c.is_active && new Date(c.end_date) >= now && new Date(c.start_date) <= now);
    } else if (filterValue === 'inactive') {
        filtered = allCoupons.filter(c => !c.is_active || new Date(c.start_date) > now);
    } else if (filterValue === 'expired') {
        filtered = allCoupons.filter(c => new Date(c.end_date) < now);
    }

    renderCoupons(filtered);
}

// ============================================
// MODAL FUNCTIONS
// ============================================
function openCouponModal(couponId = null) {
    const modal = document.getElementById('coupon-modal');
    const form = document.getElementById('coupon-form');
    const title = document.getElementById('modal-title');
    const submitText = document.getElementById('submit-btn-text');

    form.reset();
    document.getElementById('coupon-id').value = '';

    if (couponId) {
        // Edit mode
        const coupon = allCoupons.find(c => c.coupon_id === couponId);
        if (coupon) {
            title.innerHTML = '<i class="fas fa-edit"></i> Modifier le Coupon';
            submitText.textContent = 'Sauvegarder';
            populateForm(coupon);
        }
    } else {
        // Create mode
        title.innerHTML = '<i class="fas fa-ticket-alt"></i> Nouveau Coupon';
        submitText.textContent = 'Creer le coupon';

        // Set default dates
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        document.getElementById('start-date').value = formatDateTimeLocal(now);
        document.getElementById('end-date').value = formatDateTimeLocal(endDate);
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCouponModal() {
    const modal = document.getElementById('coupon-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function populateForm(coupon) {
    document.getElementById('coupon-id').value = coupon.coupon_id;
    document.getElementById('coupon-code').value = coupon.code;
    document.getElementById('coupon-name').value = coupon.name;
    document.getElementById('coupon-description').value = coupon.description || '';
    document.getElementById('discount-type').value = coupon.discount_type;
    document.getElementById('discount-value').value = coupon.discount_value;
    document.getElementById('buy-quantity').value = coupon.buy_quantity || '';
    document.getElementById('get-quantity').value = coupon.get_quantity || '';
    document.getElementById('min-purchase').value = coupon.min_purchase_amount || '';
    document.getElementById('max-discount').value = coupon.max_discount_amount || '';
    document.getElementById('applies-to').value = coupon.applies_to;
    document.getElementById('department-select').value = coupon.department_name || '';
    document.getElementById('category-select').value = coupon.category_id || '';
    document.getElementById('product-id').value = coupon.product_id || '';
    document.getElementById('new-customers-only').checked = coupon.new_customers_only;
    document.getElementById('max-total-uses').value = coupon.max_total_uses || '';
    document.getElementById('max-uses-per-user').value = coupon.max_uses_per_user || 1;
    document.getElementById('start-date').value = formatDateTimeLocal(coupon.start_date);
    document.getElementById('end-date').value = formatDateTimeLocal(coupon.end_date);
    document.getElementById('is-active').checked = coupon.is_active;

    // Trigger change events to show/hide relevant fields
    onDiscountTypeChange();
    onAppliesToChange();
}

// ============================================
// FORM HANDLERS
// ============================================
function setupFormListeners() {
    const form = document.getElementById('coupon-form');
    form.addEventListener('submit', handleFormSubmit);
}

function onDiscountTypeChange() {
    const discountType = document.getElementById('discount-type').value;
    const discountValueGroup = document.getElementById('discount-value-group');
    const buyGetFields = document.getElementById('buy-get-fields');
    const discountValueInput = document.getElementById('discount-value');

    if (discountType === 'buy_x_get_y') {
        buyGetFields.style.display = 'grid';
        discountValueGroup.querySelector('label').textContent = 'Rabais sur article gratuit (%)';
        discountValueInput.placeholder = '100';
    } else if (discountType === 'free_shipping') {
        discountValueGroup.style.display = 'none';
        buyGetFields.style.display = 'none';
    } else {
        discountValueGroup.style.display = 'block';
        buyGetFields.style.display = 'none';
        discountValueGroup.querySelector('label').textContent = discountType === 'percentage' ? 'Pourcentage (%)' : 'Montant ($)';
        discountValueInput.placeholder = discountType === 'percentage' ? '10' : '20';
    }
}

function onAppliesToChange() {
    const appliesTo = document.getElementById('applies-to').value;
    const departmentGroup = document.getElementById('department-group');
    const categoryGroup = document.getElementById('category-group');
    const productGroup = document.getElementById('product-group');

    departmentGroup.style.display = appliesTo === 'department' ? 'block' : 'none';
    categoryGroup.style.display = appliesTo === 'category' ? 'block' : 'none';
    productGroup.style.display = appliesTo === 'product' ? 'block' : 'none';
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const couponId = document.getElementById('coupon-id').value;
    const isEdit = !!couponId;

    const data = {
        code: document.getElementById('coupon-code').value,
        name: document.getElementById('coupon-name').value,
        description: document.getElementById('coupon-description').value || null,
        discount_type: document.getElementById('discount-type').value,
        discount_value: parseFloat(document.getElementById('discount-value').value) || 0,
        buy_quantity: parseInt(document.getElementById('buy-quantity').value) || null,
        get_quantity: parseInt(document.getElementById('get-quantity').value) || null,
        min_purchase_amount: parseFloat(document.getElementById('min-purchase').value) || 0,
        max_discount_amount: parseFloat(document.getElementById('max-discount').value) || null,
        applies_to: document.getElementById('applies-to').value,
        department_name: document.getElementById('department-select').value || null,
        category_id: parseInt(document.getElementById('category-select').value) || null,
        product_id: parseInt(document.getElementById('product-id').value) || null,
        new_customers_only: document.getElementById('new-customers-only').checked,
        max_total_uses: parseInt(document.getElementById('max-total-uses').value) || null,
        max_uses_per_user: parseInt(document.getElementById('max-uses-per-user').value) || 1,
        start_date: document.getElementById('start-date').value,
        end_date: document.getElementById('end-date').value,
        is_active: document.getElementById('is-active').checked
    };

    const submitBtn = document.querySelector('.btn-submit');
    submitBtn.disabled = true;

    try {
        const url = isEdit
            ? `${config.baseURL}/api/admin/coupons/${couponId}`
            : `${config.baseURL}/api/admin/coupons`;

        const res = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (res.ok) {
            showToast(isEdit ? 'Coupon modifie avec succes!' : 'Coupon cree avec succes!', 'success');
            closeCouponModal();
            loadCoupons();
        } else {
            showToast(result.error || 'Erreur lors de la sauvegarde', 'error');
        }
    } catch (err) {
        console.error('Error saving coupon:', err);
        showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

// ============================================
// EDIT & DELETE
// ============================================
function editCoupon(couponId) {
    openCouponModal(couponId);
}

async function deleteCoupon(couponId) {
    if (!confirm('Etes-vous sur de vouloir supprimer ce coupon?')) return;

    try {
        const res = await fetch(`${config.baseURL}/api/admin/coupons/${couponId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
        });

        if (res.ok) {
            showToast('Coupon supprime avec succes!', 'success');
            loadCoupons();
        } else {
            const result = await res.json();
            showToast(result.error || 'Erreur lors de la suppression', 'error');
        }
    } catch (err) {
        console.error('Error deleting coupon:', err);
        showToast('Erreur lors de la suppression', 'error');
    }
}

// ============================================
// TOAST NOTIFICATION
// ============================================
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

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
