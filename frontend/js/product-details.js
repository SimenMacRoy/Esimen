// ============================================
// PRODUCT DETAILS - Shek's House
// ============================================

const config = {
    baseURL: 'http://localhost:3006'
};

let product = null;
let currentImageIndex = 0;
let quantity = 1;
let isInCart = false;

// ============================================
// AUTH HELPERS
// ============================================
function getUserId() {
    const userData = Auth.getUserData();
    return userData ? userData.user_id : null;
}

function requireLogin() {
    if (!Auth.isLoggedIn()) {
        showToast('Veuillez vous connecter pour continuer', 'info');
        window.location.href = 'profile.html?register=true';
        return false;
    }
    return true;
}

// ============================================
// DOM ELEMENTS
// ============================================
const loadingState = document.getElementById('loading-state');
const productContent = document.getElementById('product-content');
const errorState = document.getElementById('error-state');

const mainImage = document.getElementById('main-product-image');
const imageCounter = document.getElementById('image-counter');
const thumbnailGallery = document.getElementById('thumbnail-gallery');

const titleEl = document.getElementById('product-title');
const priceEl = document.getElementById('product-price');
const descEl = document.getElementById('product-description');
const categoryEl = document.getElementById('product-category');
const stockIndicator = document.getElementById('stock-indicator');
const stockCount = document.getElementById('stock-count');

const qtyInput = document.getElementById('quantity-input');
const qtyPlus = document.getElementById('qty-plus');
const qtyMinus = document.getElementById('qty-minus');

const addToCartBtn = document.getElementById('add-to-cart-btn');
const totalPriceBtn = document.getElementById('btn-total-price');

const prevBtn = document.getElementById('gallery-prev');
const nextBtn = document.getElementById('gallery-next');

// Lightbox elements
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxCounter = document.getElementById('lightbox-counter');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxPrev = document.getElementById('lightbox-prev');
const lightboxNext = document.getElementById('lightbox-next');

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product_id');

    if (!productId) {
        showError();
        return;
    }

    loadProduct(productId);
    setupQuantityControls();
    setupGalleryControls();
    setupLightbox();
    setupLikeButtons();
    setupCommentForm();
});

// ============================================
// LOAD PRODUCT
// ============================================
async function loadProduct(productId) {
    try {
        const res = await fetch(`${config.baseURL}/api/products/${productId}`);
        if (!res.ok) throw new Error();

        product = await res.json();
        renderProduct();
        checkIfInCart();
    } catch {
        showError();
    }
}

function renderProduct() {
    loadingState.style.display = 'none';
    productContent.style.display = 'block';

    titleEl.textContent = product.name;
    descEl.innerHTML = `<p>${product.description}</p>`;
    priceEl.textContent = `CA$ ${product.price.toFixed(2)}`;
    categoryEl.querySelector('span').textContent = product.category_name || 'Produit';

    updateStock();
    renderImages();
    updateTotalPrice();

    // Load social features
    loadLikes();
    loadComments();
    loadUserLikeStatus();

    // Load admin audit if user is admin
    if (Auth.isLoggedIn() && Auth.isAdmin()) {
        loadAuditTrail();
    }

    // Show/hide comment form based on login status
    const addCommentForm = document.getElementById('add-comment-form');
    const loginPrompt = document.getElementById('login-prompt');
    if (Auth.isLoggedIn()) {
        addCommentForm.style.display = 'flex';
        loginPrompt.style.display = 'none';
    } else {
        addCommentForm.style.display = 'none';
        loginPrompt.style.display = 'block';
    }
}

// ============================================
// CHECK IF IN CART
// ============================================
async function checkIfInCart() {
    if (!Auth.isLoggedIn()) return;

    try {
        const res = await fetch(`${config.baseURL}/api/basket?user_id=${getUserId()}`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (res.ok) {
            const basket = await res.json();
            const inCart = basket.find(item => item.product_id === product.product_id);
            if (inCart) {
                isInCart = true;
                updateCartButtonState();
            }
        }
    } catch {
        // Silently fail
    }
}

function updateCartButtonState() {
    if (isInCart) {
        addToCartBtn.querySelector('.btn-content span').textContent = 'Voir le panier';
        addToCartBtn.querySelector('.btn-content i').className = 'fas fa-shopping-cart';
    }
}

// ============================================
// IMAGES
// ============================================
function renderImages() {
    const images = product.images?.length
        ? product.images
        : ['../assets/images/default_image.jpg'];

    mainImage.src = images[0];
    imageCounter.textContent = `1/${images.length}`;

    thumbnailGallery.innerHTML = '';
    images.forEach((img, index) => {
        const thumb = document.createElement('div');
        thumb.className = `thumbnail-item ${index === 0 ? 'active' : ''}`;
        thumb.innerHTML = `<img src="${img}" />`;
        thumb.onclick = () => setImage(index);
        thumbnailGallery.appendChild(thumb);
    });
}

function setImage(index) {
    const images = product.images?.length ? product.images : ['../assets/images/default_image.jpg'];
    currentImageIndex = index;
    mainImage.src = images[index];
    imageCounter.textContent = `${index + 1}/${images.length}`;

    document.querySelectorAll('.thumbnail-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });
}

function setupGalleryControls() {
    prevBtn.onclick = (e) => {
        e.stopPropagation();
        const images = product?.images?.length ? product.images : ['../assets/images/default_image.jpg'];
        const i = (currentImageIndex - 1 + images.length) % images.length;
        setImage(i);
    };

    nextBtn.onclick = (e) => {
        e.stopPropagation();
        const images = product?.images?.length ? product.images : ['../assets/images/default_image.jpg'];
        const i = (currentImageIndex + 1) % images.length;
        setImage(i);
    };

    // Click on main image opens lightbox
    mainImage.onclick = () => openLightbox();
}

// ============================================
// LIGHTBOX
// ============================================
function setupLightbox() {
    lightboxClose.onclick = closeLightbox;
    lightbox.onclick = (e) => {
        if (e.target === lightbox) closeLightbox();
    };

    lightboxPrev.onclick = (e) => {
        e.stopPropagation();
        navigateLightbox(-1);
    };

    lightboxNext.onclick = (e) => {
        e.stopPropagation();
        navigateLightbox(1);
    };

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;

        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
        if (e.key === 'ArrowRight') navigateLightbox(1);
    });
}

function openLightbox() {
    if (!product) return;
    const images = product.images?.length ? product.images : ['../assets/images/default_image.jpg'];

    lightboxImage.src = images[currentImageIndex];
    lightboxCounter.textContent = `${currentImageIndex + 1}/${images.length}`;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
}

function navigateLightbox(direction) {
    const images = product.images?.length ? product.images : ['../assets/images/default_image.jpg'];
    currentImageIndex = (currentImageIndex + direction + images.length) % images.length;

    lightboxImage.src = images[currentImageIndex];
    lightboxCounter.textContent = `${currentImageIndex + 1}/${images.length}`;

    // Also update main gallery
    setImage(currentImageIndex);
}

// ============================================
// STOCK
// ============================================
function updateStock() {
    stockIndicator.innerHTML = '';

    let badgeClass = 'in-stock';
    let text = 'En stock';

    if (product.stock <= 0) {
        badgeClass = 'out-of-stock';
        text = 'Rupture de stock';
        addToCartBtn.disabled = true;
    } else if (product.stock <= 5) {
        badgeClass = 'low-stock';
        text = 'Stock limité';
    }

    stockIndicator.innerHTML = `
        <div class="stock-badge ${badgeClass}">
            <i class="fas fa-box"></i>
            <span>${text}</span>
        </div>
    `;

    stockCount.textContent = `(${product.stock} disponibles)`;
}

// ============================================
// QUANTITY
// ============================================
function setupQuantityControls() {
    qtyPlus.onclick = () => {
        if (product && quantity < product.stock) {
            quantity++;
            qtyInput.value = quantity;
            updateTotalPrice();
        }
    };

    qtyMinus.onclick = () => {
        if (quantity > 1) {
            quantity--;
            qtyInput.value = quantity;
            updateTotalPrice();
        }
    };
}

function updateTotalPrice() {
    if (!product) return;
    const total = product.price * quantity;
    totalPriceBtn.textContent = `CA$ ${total.toFixed(2)}`;
}

// ============================================
// ADD TO CART
// ============================================
addToCartBtn.onclick = async () => {
    // If already in cart, go to basket
    if (isInCart) {
        window.location.href = 'basket.html';
        return;
    }

    if (!requireLogin()) return;

    // Disable button during request
    addToCartBtn.disabled = true;
    const originalContent = addToCartBtn.querySelector('.btn-content').innerHTML;
    addToCartBtn.querySelector('.btn-content').innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        <span>Ajout en cours...</span>
    `;

    try {
        const res = await fetch(`${config.baseURL}/api/basket`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({
                userId: getUserId(),
                productId: product.product_id,
                quantity
            })
        });

        if (!res.ok) throw new Error();

        isInCart = true;
        showToast('Produit ajouté au panier!', 'success', true);

        // Update button to show "View cart"
        addToCartBtn.querySelector('.btn-content').innerHTML = `
            <i class="fas fa-check cart-fly"></i>
            <span>Ajouté!</span>
        `;

        setTimeout(() => {
            updateCartButtonState();
            addToCartBtn.disabled = false;
        }, 1500);

    } catch {
        addToCartBtn.querySelector('.btn-content').innerHTML = originalContent;
        addToCartBtn.disabled = false;
        showToast('Erreur lors de l\'ajout au panier', 'error');
    }
};

// ============================================
// UI STATES
// ============================================
function showError() {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
}

// ============================================
// TOASTS
// ============================================
function showToast(message, type = 'info', withCartIcon = false) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = withCartIcon ? 'fa-shopping-cart cart-fly' : 'fa-check-circle';
    if (type === 'error') icon = 'fa-times-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================
// LIKES / DISLIKES
// ============================================
let userLikeStatus = null; // 'like', 'dislike', or null

async function loadLikes() {
    if (!product) return;

    try {
        const res = await fetch(`${config.baseURL}/api/products/${product.product_id}/likes`);
        if (res.ok) {
            const data = await res.json();
            document.getElementById('like-count').textContent = data.likes || 0;
            document.getElementById('dislike-count').textContent = data.dislikes || 0;
        }
    } catch (err) {
        console.error('Error loading likes:', err);
    }
}

async function loadUserLikeStatus() {
    if (!product || !Auth.isLoggedIn()) return;

    try {
        const res = await fetch(`${config.baseURL}/api/products/${product.product_id}/likes/user`, {
            headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
        });
        if (res.ok) {
            const data = await res.json();
            userLikeStatus = data.userLike;
            updateLikeButtonStyles();
        }
    } catch (err) {
        console.error('Error loading user like status:', err);
    }
}

function updateLikeButtonStyles() {
    const likeBtn = document.getElementById('like-btn');
    const dislikeBtn = document.getElementById('dislike-btn');

    likeBtn.classList.remove('active');
    dislikeBtn.classList.remove('active');

    if (userLikeStatus === 'like') {
        likeBtn.classList.add('active');
    } else if (userLikeStatus === 'dislike') {
        dislikeBtn.classList.add('active');
    }
}

function setupLikeButtons() {
    const likeBtn = document.getElementById('like-btn');
    const dislikeBtn = document.getElementById('dislike-btn');

    likeBtn.onclick = () => toggleLike(true);
    dislikeBtn.onclick = () => toggleLike(false);
}

async function toggleLike(isLike) {
    if (!product) return;

    if (!Auth.isLoggedIn()) {
        showToast('Connectez-vous pour voter', 'info');
        return;
    }

    try {
        const res = await fetch(`${config.baseURL}/api/products/${product.product_id}/likes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ is_like: isLike })
        });

        if (res.ok) {
            const data = await res.json();

            // Update user status based on action
            if (data.action === 'removed') {
                userLikeStatus = null;
            } else if (data.action === 'liked') {
                userLikeStatus = 'like';
            } else if (data.action === 'disliked') {
                userLikeStatus = 'dislike';
            }

            updateLikeButtonStyles();
            loadLikes(); // Refresh counts
        }
    } catch (err) {
        console.error('Error toggling like:', err);
        showToast('Erreur lors du vote', 'error');
    }
}

// ============================================
// COMMENTS
// ============================================
async function loadComments() {
    if (!product) return;

    const commentsList = document.getElementById('comments-list');
    const commentsCount = document.getElementById('comments-count');

    try {
        const res = await fetch(`${config.baseURL}/api/products/${product.product_id}/comments`);
        if (res.ok) {
            const comments = await res.json();
            commentsCount.textContent = `(${comments.length})`;

            if (comments.length === 0) {
                commentsList.innerHTML = '<p class="no-comments">Aucun commentaire pour le moment. Soyez le premier!</p>';
                return;
            }

            commentsList.innerHTML = comments.map(comment => renderComment(comment)).join('');

            // Add delete handlers
            document.querySelectorAll('.delete-comment-btn').forEach(btn => {
                btn.onclick = () => deleteComment(btn.dataset.id);
            });
        }
    } catch (err) {
        console.error('Error loading comments:', err);
        commentsList.innerHTML = '<p class="error-comments">Erreur lors du chargement des commentaires</p>';
    }
}

function renderComment(comment) {
    const date = new Date(comment.created_at).toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const profilePic = comment.profile_picture
        ? `${config.baseURL}${comment.profile_picture}`
        : '../assets/images/logos/default_picture.jpg';

    const canDelete = Auth.isLoggedIn() && (Auth.getUserData()?.user_id === comment.user_id || Auth.isAdmin());

    return `
        <div class="comment-item" data-comment-id="${comment.comment_id}">
            <div class="comment-avatar">
                <img src="${profilePic}" alt="${comment.name}" onerror="this.src='../assets/images/logos/default_picture.jpg'">
            </div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.name} ${comment.surname || ''}</span>
                    <span class="comment-date">${date}</span>
                </div>
                <p class="comment-text">${escapeHtml(comment.comment_text)}</p>
            </div>
            ${canDelete ? `<button class="delete-comment-btn" data-id="${comment.comment_id}" title="Supprimer"><i class="fas fa-trash"></i></button>` : ''}
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupCommentForm() {
    const submitBtn = document.getElementById('submit-comment-btn');
    const commentInput = document.getElementById('comment-input');

    submitBtn.onclick = async () => {
        if (!product) return;

        if (!Auth.isLoggedIn()) {
            showToast('Connectez-vous pour commenter', 'info');
            return;
        }

        const text = commentInput.value.trim();
        if (!text) {
            showToast('Le commentaire ne peut pas etre vide', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const res = await fetch(`${config.baseURL}/api/products/${product.product_id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ comment_text: text })
            });

            if (res.ok) {
                commentInput.value = '';
                loadComments();
                showToast('Commentaire publie!', 'success');
            } else {
                const data = await res.json();
                showToast(data.error || 'Erreur lors de la publication', 'error');
            }
        } catch (err) {
            console.error('Error posting comment:', err);
            showToast('Erreur lors de la publication', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
        }
    };
}

async function deleteComment(commentId) {
    if (!confirm('Supprimer ce commentaire?')) return;

    try {
        const res = await fetch(`${config.baseURL}/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
        });

        if (res.ok) {
            loadComments();
            showToast('Commentaire supprime', 'success');
        } else {
            showToast('Erreur lors de la suppression', 'error');
        }
    } catch (err) {
        console.error('Error deleting comment:', err);
        showToast('Erreur lors de la suppression', 'error');
    }
}

// ============================================
// ADMIN AUDIT TRAIL
// ============================================
async function loadAuditTrail() {
    if (!product || !Auth.isAdmin()) return;

    const auditSection = document.getElementById('admin-audit-section');
    const auditList = document.getElementById('audit-list');

    try {
        const res = await fetch(`${config.baseURL}/api/admin/products/${product.product_id}/audit`, {
            headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
        });

        if (res.ok) {
            const audits = await res.json();

            if (audits.length === 0) {
                auditList.innerHTML = '<p class="no-audit">Aucun historique disponible</p>';
            } else {
                auditList.innerHTML = audits.map(audit => {
                    const date = new Date(audit.action_date).toLocaleDateString('fr-CA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    let actionIcon = 'fa-plus-circle';
                    let actionColor = 'created';
                    let actionText = 'Cree';

                    if (audit.action_type === 'modified') {
                        actionIcon = 'fa-edit';
                        actionColor = 'modified';
                        actionText = 'Modifie';
                    } else if (audit.action_type === 'deleted') {
                        actionIcon = 'fa-trash';
                        actionColor = 'deleted';
                        actionText = 'Supprime';
                    }

                    return `
                        <div class="audit-item ${actionColor}">
                            <div class="audit-icon"><i class="fas ${actionIcon}"></i></div>
                            <div class="audit-info">
                                <span class="audit-action">${actionText}</span>
                                <span class="audit-admin">par ${audit.admin_name || 'Admin'} ${audit.admin_surname || ''}</span>
                                <span class="audit-date">${date}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            auditSection.style.display = 'block';
        }
    } catch (err) {
        console.error('Error loading audit trail:', err);
    }
}
