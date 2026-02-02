const config = {
    baseURL: 'http://localhost:3006', // Update this IP dynamically as needed
};

document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for components to be initialized
    setTimeout(initApp, 100);
});

function initApp() {
    const productList = document.getElementById('product-list');

    // These elements are loaded dynamically, so we need to get them after components init
    const tabItems = document.querySelectorAll('.tab-item');
    const navAccueil = document.getElementById('nav-accueil');
    const navCategories = document.getElementById('nav-categories');
    const navBasket = document.getElementById('nav-basket');
    const navProfile = document.getElementById('nav-profile');
    const searchBar = document.getElementById('search-bar');
    const searchResultsContainer = document.getElementById('search-results');
    const clearSearch = document.getElementById('clear-search');
    const basketContainer = document.querySelector('.basket-container');
    const basketCountElement = document.querySelector('.basket-count');

    // Function to switch the active department tab (top menu)
    const switchActiveTab = (selectedTab) => {
        if (!selectedTab) return;
        tabItems.forEach(tab => tab.classList.remove('active'));
        selectedTab.classList.add('active');
    };

    // Hide search results initially
    if (searchResultsContainer) {
        searchResultsContainer.style.display = 'none';
    }

    // Function to switch the active navigation tab (bottom menu)
    const switchActiveNavTab = (selectedNav) => {
        if (!selectedNav) return;
        if (navAccueil) navAccueil.classList.remove('active');
        if (navCategories) navCategories.classList.remove('active');
        if (navBasket) navBasket.classList.remove('active');
        if (navProfile) navProfile.classList.remove('active');
        selectedNav.classList.add('active');
    };

    // Function to start image slideshow
    const startImageSlideshow = (imageContainer, images) => {
        let currentIndex = 0;
        const imgElement = document.createElement('img');
        imageContainer.appendChild(imgElement);

        const changeImage = () => {
            // Prepend baseURL for images hosted on backend
            const imagePath = images[currentIndex];
            imgElement.src = imagePath.startsWith('http') ? imagePath : `${config.baseURL}${imagePath}`;
            imgElement.alt = `Image ${currentIndex + 1}`;
            currentIndex = (currentIndex + 1) % images.length;
        };

        changeImage();
        setInterval(changeImage, 2000);
    };

    // Function to fetch and display products based on the selected department
    const loadProducts = async (department) => {
        if (!productList) return;

        // Show loader
        productList.innerHTML = '<div class="loader-container"><div class="loader"></div><p>Chargement...</p></div>';

        try {
            const response = await fetch(`${config.baseURL}/api/products?department=${department}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const products = Array.isArray(data) ? data : (data.products || []);
            productList.innerHTML = '';

            if (products.length === 0) {
                productList.innerHTML = '<p>Aucun produit disponible dans cette categorie.</p>';
                return;
            }

            // Display products
            products.forEach(product => {
                const productCard = document.createElement('div');
                productCard.classList.add('product-card');

                const imageContainer = document.createElement('div');
                imageContainer.classList.add('image-container');

                if (product.images && product.images.length > 1) {
                    startImageSlideshow(imageContainer, product.images);
                } else {
                    const img = document.createElement('img');
                    img.src = `${config.baseURL}${product.images[0] || '/uploads/default_image.jpg'}`;
                    img.alt = product.name;
                    imageContainer.appendChild(img);
                }

                const productDetails = document.createElement('div');
                productDetails.classList.add('product-details');

                // Stock badge
                let stockBadge = '';
                if (product.stock <= 0) {
                    stockBadge = '<span class="stock-badge out-of-stock">Rupture</span>';
                } else if (product.stock <= 5) {
                    stockBadge = `<span class="stock-badge low-stock">${product.stock} restants</span>`;
                } else {
                    stockBadge = `<span class="stock-badge in-stock">En stock</span>`;
                }

                // Like count badge
                const likeCount = product.like_count || 0;
                const likeBadge = likeCount > 0 ? `<span class="like-badge"><i class="fas fa-thumbs-up"></i> ${likeCount}</span>` : '';

                productDetails.innerHTML = `
                    <h3>${product.name}</h3>
                    <p class="price">CA$ ${product.price}</p>
                    <div class="product-badges">
                        ${stockBadge}
                        ${likeBadge}
                    </div>
                `;

                // Quick add to cart button
                const quickAddBtn = document.createElement('button');
                quickAddBtn.className = 'quick-add-btn';
                quickAddBtn.innerHTML = '<i class="fas fa-plus"></i>';
                quickAddBtn.title = 'Ajouter au panier';
                quickAddBtn.onclick = (e) => {
                    e.stopPropagation();
                    addToCart(product.product_id, product.name, product.stock);
                };

                if (product.stock <= 0) {
                    quickAddBtn.disabled = true;
                    quickAddBtn.title = 'Rupture de stock';
                }

                imageContainer.appendChild(quickAddBtn);
                productCard.appendChild(imageContainer);
                productCard.appendChild(productDetails);

                productCard.addEventListener('click', () => {
                    window.location.href = `html/product-details.html?product_id=${product.product_id}`;
                });

                productList.appendChild(productCard);
            });
        } catch (error) {
            console.error('Error loading products:', error);
            productList.innerHTML = '<div class="error-message"><p>Impossible de charger les produits. Veuillez reessayer.</p><button onclick="location.reload()">Reessayer</button></div>';
        }
    };

    // Function to fetch categories or departments and navigate
    const searchCategories = async (query) => {
        if (!searchResultsContainer) return;

        try {
            const response = await fetch(`${config.baseURL}/api/search-categories?query=${query}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const categories = await response.json();
            searchResultsContainer.innerHTML = '';

            if (categories.length === 0) {
                searchResultsContainer.style.display = 'none';
                return;
            }

            searchResultsContainer.style.display = 'block';
            categories.forEach(category => {
                const resultItem = document.createElement('div');
                resultItem.classList.add('search-result-item');
                resultItem.textContent = `${category.category_name} (${category.department_name})`;

                resultItem.addEventListener('click', () => {
                    window.location.href = `html/products.html?category_id=${category.category_id}&departmentName=${category.department_name}`;
                });

                searchResultsContainer.appendChild(resultItem);
            });
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

    // Event listener for search input
    if (searchBar) {
        searchBar.addEventListener('input', (event) => {
            const query = event.target.value;
            if (query.length > 1) {
                searchCategories(query);
            } else if (searchResultsContainer) {
                searchResultsContainer.style.display = 'none';
            }
        });

        // Show or hide the clear icon based on input value
        searchBar.addEventListener('input', () => {
            if (clearSearch) {
                clearSearch.style.display = searchBar.value.trim() !== '' ? 'flex' : 'none';
            }
        });
    }

    // Clear the search bar when the clear icon is clicked
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            if (searchBar) searchBar.value = '';
            clearSearch.style.display = 'none';
            if (searchResultsContainer) searchResultsContainer.style.display = 'none';
            if (searchBar) searchBar.focus();
        });
    }

    // Set up event listeners for department tab clicks (top menu)
    if (tabItems.length > 0) {
        tabItems.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const department = tab.getAttribute('data-department');
                switchActiveTab(tab);
                loadProducts(department);
            });
        });
    }

    // Add event listeners to navigation tabs (bottom menu)
    if (navAccueil) {
        navAccueil.addEventListener('click', () => {
            switchActiveNavTab(navAccueil);
        });
    }

    if (navCategories) {
        navCategories.addEventListener('click', () => {
            switchActiveNavTab(navCategories);
        });
    }

    if (navBasket) {
        navBasket.addEventListener('click', () => {
            switchActiveNavTab(navBasket);
        });
    }

    if (navProfile) {
        navProfile.addEventListener('click', () => {
            switchActiveNavTab(navProfile);
        });
    }

    // Load products for "Tout" by default when the page loads
    const defaultTab = document.querySelector('.tab-item[data-department="tout"]');
    if (defaultTab) {
        switchActiveTab(defaultTab);
        loadProducts('tout');
    }

    // Ensure "Accueil" is the active navigation tab by default
    if (navAccueil) {
        switchActiveNavTab(navAccueil);
    }

    // Fetch the basket count from the backend
    async function fetchBasketCount() {
        const userId = getUserId();
        if (!userId || !basketCountElement) return;

        try {
            const response = await fetch(`${config.baseURL}/api/basket/count?user_id=${userId}`);
            if (response.ok) {
                const data = await response.json();
                basketCountElement.textContent = data.itemCount || 0;
            } else {
                console.error('Error fetching basket count:', response.statusText);
                basketCountElement.textContent = 0;
            }
        } catch (error) {
            console.error('Error fetching basket count:', error);
            basketCountElement.textContent = 0;
        }
    }

    // Navigate to the basket page when the basket icon is clicked
    if (basketContainer) {
        basketContainer.addEventListener('click', () => {
            window.location.href = 'html/basket.html';
        });
    }

    // Fetch and update the basket count on page load
    fetchBasketCount();
}

function getUserId() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    return userData ? userData.user_id : null;
}

function goBack() {
    window.history.back();
}

async function addToCart(productId, productName, stock) {
    if (stock <= 0) return;

    const userId = getUserId();
    if (!userId) {
        showToast('Veuillez vous connecter pour ajouter au panier', 'info');
        window.location.href = 'html/profile.html?register=true';
        return;
    }

    try {
        const res = await fetch(`${config.baseURL}/api/basket`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                userId: userId,
                productId: productId,
                quantity: 1
            })
        });

        if (!res.ok) throw new Error();
        showToast(`${productName} ajoute au panier!`, 'success');

        // Update basket count in header
        if (typeof ShekComponents !== 'undefined') {
            ShekComponents.updateBasketCount();
        }
    } catch (error) {
        showToast('Erreur lors de l\'ajout au panier', 'error');
    }
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
