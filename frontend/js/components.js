/**
 * Shek's House - Reusable Components
 * Header and Footer components for all pages
 */

// Detect if we're in a subdirectory (html/) or root
const isSubPage = window.location.pathname.includes('/html/');
const basePath = isSubPage ? '../' : '';
const htmlPath = isSubPage ? '' : 'html/';

/**
 * Header Component
 */
function createHeader(options = {}) {
    const {
        showSearch = true,
        showTabs = true,
        pageTitle = null,
        showBackButton = false
    } = options;

    const searchBarHTML = showSearch ? `
        <!-- Search bar (Desktop) -->
        <div class="search-bar desktop-search">
            <div class="search">
                <i class="fas fa-search search-icon"></i>
                <input type="text" id="search-bar" placeholder="Rechercher un article..." autocomplete="off">
                <i class="fas fa-times clear-icon" id="clear-search"></i>
            </div>
            <div id="search-results" class="search-results"></div>
        </div>
    ` : '';

    const tabsHTML = showTabs ? `
        <!-- Department Tabs -->
        <nav class="tab-component">
            <div class="tab-scroll">
                <a href="${basePath}index.html#tout" class="tab-item active" data-department="tout">
                    <i class="fas fa-border-all"></i>
                    <span>Tout</span>
                </a>
                <a href="${basePath}index.html#femme" class="tab-item" data-department="femme">
                    <i class="fas fa-female"></i>
                    <span>Femme</span>
                </a>
                <a href="${basePath}index.html#homme" class="tab-item" data-department="homme">
                    <i class="fas fa-male"></i>
                    <span>Homme</span>
                </a>
                <a href="${basePath}index.html#enfant" class="tab-item" data-department="enfant">
                    <i class="fas fa-child"></i>
                    <span>Enfant</span>
                </a>
                <a href="${basePath}index.html#literie" class="tab-item" data-department="linge de maison">
                    <i class="fas fa-bed"></i>
                    <span>Maison</span>
                </a>
            </div>
        </nav>
    ` : '';

    const mobileSearchHTML = showSearch ? `
        <!-- Mobile Search -->
        <div class="search-bar mobile-search" id="mobile-search">
            <div class="search">
                <i class="fas fa-search search-icon"></i>
                <input type="text" id="search-bar-mobile" placeholder="Rechercher..." autocomplete="off">
                <i class="fas fa-times clear-icon" id="clear-search-mobile"></i>
            </div>
            <div id="search-results-mobile" class="search-results"></div>
        </div>
    ` : '';

    const leftContent = showBackButton && pageTitle ? `
        <div class="header-left">
            <button class="back-btn" onclick="goBack()">
                <i class="fas fa-arrow-left"></i>
            </button>
            <h1 class="page-title">${pageTitle}</h1>
        </div>
        <a href="${basePath}index.html" class="logo-section">
            <img src="${basePath}assets/images/logos/logoShek.jpg" alt="Shek's House Logo" class="logo">
        </a>
    ` : `
        <a href="${basePath}index.html" class="logo-section">
            <img src="${basePath}assets/images/logos/logoShek.jpg" alt="Shek's House Logo" class="logo">
            <span class="title-logo">SHEK'S <span>HOUSE</span></span>
        </a>
    `;

    return `
        <div class="header-content">
            ${leftContent}
            ${searchBarHTML}
            <!-- Header Icons -->
            <div class="header-icons">
                ${showSearch ? `
                <div class="icon-btn search-toggle-btn" id="search-toggle" title="Rechercher">
                    <i class="fas fa-search"></i>
                </div>
                ` : ''}
                <div class="icon-btn wishlist-btn" title="Liste de souhaits">
                    <i class="fas fa-heart"></i>
                </div>
                <div class="icon-btn basket-btn" onclick="window.location.href='${htmlPath}basket.html'" title="Panier">
                    <i class="fas fa-shopping-bag"></i>
                    <span class="basket-count">0</span>
                </div>
                <div class="icon-btn profile-btn" onclick="window.location.href='${htmlPath}profile.html'" title="Mon compte">
                    <i class="fas fa-user"></i>
                </div>
            </div>
        </div>
        ${mobileSearchHTML}
        ${tabsHTML}
    `;
}

/**
 * Footer Component
 */
function createFooter(activePage = 'accueil') {
    const navItems = [
        { id: 'accueil', href: `${basePath}index.html`, icon: 'fa-home', label: 'Accueil' },
        { id: 'categories', href: `${htmlPath}category.html`, icon: 'fa-th-large', label: 'Categories' },
        { id: 'basket', href: `${htmlPath}basket.html`, icon: 'fa-shopping-bag', label: 'Panier' },
        { id: 'profile', href: `${htmlPath}profile.html`, icon: 'fa-user', label: 'Profil' }
    ];

    const navItemsHTML = navItems.map(item => `
        <a href="${item.href}" class="nav-item ${activePage === item.id ? 'active' : ''}" id="nav-${item.id}">
            <i class="fas ${item.icon}"></i>
            <span>${item.label}</span>
        </a>
    `).join('');

    return `
        <nav class="bottom-nav">
            ${navItemsHTML}
        </nav>
    `;
}

/**
 * Initialize Header
 * @param {Object} options - Header options
 * @param {string|Element} target - Optional target element or selector (default: 'header')
 */
function initHeader(options = {}, target = 'header') {
    const header = typeof target === 'string' ? document.querySelector(target) : target;
    if (header) {
        header.innerHTML = createHeader(options);
        initHeaderBehaviors(header);
    }
}

/**
 * Initialize Footer
 * @param {string} activePage - Active page identifier
 * @param {string|Element} target - Optional target element or selector (default: 'footer')
 */
function initFooter(activePage = 'accueil', target = 'footer') {
    const footer = typeof target === 'string' ? document.querySelector(target) : target;
    if (footer) {
        footer.innerHTML = createFooter(activePage);
    }
}

/**
 * Initialize Header Behaviors (scroll, search toggle)
 * @param {Element} headerElement - The header element to initialize behaviors for
 */
function initHeaderBehaviors(headerElement = null) {
    const header = headerElement || document.querySelector('header');
    if (!header) return;

    // Header scroll behavior
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Mobile search toggle
    const searchToggle = document.getElementById('search-toggle');
    const mobileSearch = document.getElementById('mobile-search');

    if (searchToggle && mobileSearch) {
        searchToggle.addEventListener('click', () => {
            mobileSearch.classList.toggle('active');
            const icon = searchToggle.querySelector('i');
            if (mobileSearch.classList.contains('active')) {
                icon.classList.remove('fa-search');
                icon.classList.add('fa-times');
                const searchInput = document.getElementById('search-bar-mobile');
                if (searchInput) searchInput.focus();
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-search');
            }
        });
    }

    // Update basket count
    updateBasketCount();
}

/**
 * Update basket count from API
 */
async function updateBasketCount() {
    const basketCountElements = document.querySelectorAll('.basket-count');

    // Get user ID from Auth if available
    const userData = typeof Auth !== 'undefined' ? Auth.getUserData() : JSON.parse(localStorage.getItem('userData'));
    const userId = userData ? userData.user_id : null;

    if (!userId) {
        basketCountElements.forEach(el => {
            el.textContent = '0';
            el.style.display = 'none';
        });
        return;
    }

    try {
        const token = typeof Auth !== 'undefined' ? Auth.getToken() : localStorage.getItem('authToken');
        const baseURL = window.config?.baseURL || 'http://localhost:3006';
        const response = await fetch(`${baseURL}/api/basket/count?user_id=${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const count = data.itemCount || 0;
            basketCountElements.forEach(el => {
                el.textContent = count;
                el.style.display = count > 0 ? 'flex' : 'none';
            });
        }
    } catch (error) {
        console.error('Error fetching basket count:', error);
    }
}

/**
 * Go back function
 */
function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = basePath + 'index.html';
    }
}

// Export for use
window.ShekComponents = {
    initHeader,
    initFooter,
    updateBasketCount,
    goBack
};
