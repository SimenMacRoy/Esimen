// Products page with JWT authentication

// Use global config from config.js (fallback for local dev)
if (typeof config === 'undefined') {
    var config = window.config || { baseURL: 'http://localhost:3006' };
}

function getUserId() {
    const userData = Auth.getUserData();
    return userData ? userData.user_id : null;
}

document.addEventListener('DOMContentLoaded', () => {
    const productList = document.getElementById('product-list');
    const navAccueil = document.getElementById('nav-accueil');
    const navCategories = document.getElementById('nav-categories');
    const navBasket = document.getElementById('nav-basket');
    const navProfile = document.getElementById('nav-profile');
    const searchBar = document.getElementById('search-bar');
    const searchResultsContainer = document.getElementById('search-results');
    const clearSearch = document.getElementById('clear-search');
    const basketContainer = document.querySelector('.basket-container');
    const basketCountElement = document.querySelector('.basket-count');

    const getParamsFromURL = () => {
        const params = new URLSearchParams(window.location.search);
        return {
            categoryId: params.get('category_id'),
            departmentName: params.get('departmentName')
        };
    };

    searchResultsContainer.style.display = 'none';

    const switchActiveNavTab = (selectedNav) => {
        [navAccueil, navCategories, navBasket, navProfile].forEach(nav => nav.classList.remove('active'));
        selectedNav.classList.add('active');
    };

    switchActiveNavTab(navCategories);

    navAccueil.addEventListener('click', () => {
        switchActiveNavTab(navAccueil);
        window.location.href = '../index.html';
    });

    navBasket.addEventListener('click', () => {
        switchActiveNavTab(navBasket);
        window.location.href = 'basket.html';
    });

    navProfile.addEventListener('click', () => {
        switchActiveNavTab(navProfile);
        window.location.href = 'profile.html';
    });

    const startImageSlideshow = (imageContainer, images) => {
        let currentIndex = 0;
        const imgElement = document.createElement('img');
        imageContainer.appendChild(imgElement);

        const changeImage = () => {
            const imagePath = images[currentIndex];
            imgElement.src = imagePath.startsWith('http') ? imagePath : `${config.baseURL}${imagePath}`;
            imgElement.alt = `Image ${currentIndex + 1}`;
            currentIndex = (currentIndex + 1) % images.length;
        };

        changeImage();
        setInterval(changeImage, 2000);
    };

    const loadProducts = async () => {
        const { categoryId, departmentName } = getParamsFromURL();

        if (!categoryId || !departmentName) {
            productList.innerHTML = '<p>No category or department selected.</p>';
            return;
        }

        try {
            const response = await fetch(`${config.baseURL}/api/products_cat?category_id=${categoryId}&departmentName=${departmentName}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const products = await response.json();

            if (!Array.isArray(products)) {
                console.error('Invalid response format:', products);
                productList.innerHTML = '<p>Unable to load products. Please try again later.</p>';
                return;
            }

            productList.innerHTML = '';

            if (products.length === 0) {
                productList.innerHTML = '<p>No products available in this category and department.</p>';
                return;
            }

            products.forEach(product => {
                const productCard = document.createElement('div');
                productCard.classList.add('product-card');

                const imageContainer = document.createElement('div');
                imageContainer.classList.add('image-container');

                if (product.images && product.images.length > 0) {
                    startImageSlideshow(imageContainer, product.images);
                } else {
                    const img = document.createElement('img');
                    img.src = '../assets/images/default_image.jpg';
                    img.alt = product.name;
                    img.style.width = '300px';
                    img.style.height = '300px';
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

                productDetails.innerHTML = `
                    <h3>${product.name}</h3>
                    <p class="price">CA$ ${product.price}</p>
                    ${stockBadge}
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
                    window.location.href = `product-details.html?product_id=${product.product_id}`;
                });

                productList.appendChild(productCard);
            });
        } catch (error) {
            console.error('Error loading products:', error);
            productList.innerHTML = '<p>Unable to load products. Please try again later.</p>';
        }
    };

    loadProducts();

    const searchCategories = async (query) => {
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
                    window.location.href = `products.html?category_id=${category.category_id}&departmentName=${encodeURIComponent(category.department_name)}`;
                });

                searchResultsContainer.appendChild(resultItem);
            });
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

    searchBar.addEventListener('input', (event) => {
        const query = event.target.value;
        if (query.length > 1) {
            searchCategories(query);
        } else {
            searchResultsContainer.style.display = 'none';
        }
    });

    searchBar.addEventListener('input', () => {
        if (searchBar.value.trim() !== '') {
            clearSearch.style.display = 'flex';
        } else {
            clearSearch.style.display = 'none';
        }
    });

    clearSearch.addEventListener('click', () => {
        searchBar.value = '';
        clearSearch.style.display = 'none';
        searchResultsContainer.style.display = 'none';
        searchBar.focus();
    });

    async function fetchBasketCount() {
        const userId = getUserId();
        if (!userId) return;

        try {
            const response = await fetch(`${config.baseURL}/api/basket/count?user_id=${userId}`, {
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });
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

    basketContainer.addEventListener('click', () => {
        window.location.href = 'basket.html';
    });

    fetchBasketCount();
});

function goBack() {
    window.history.back();
}

async function addToCart(productId, productName, stock) {
    if (stock <= 0) return;

    const userId = getUserId();
    if (!userId) {
        showToast('Veuillez vous connecter pour ajouter au panier', 'info');
        window.location.href = 'profile.html?register=true';
        return;
    }

    try {
        const res = await fetch(`${config.baseURL}/api/basket`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({
                userId: userId,
                productId: productId,
                quantity: 1
            })
        });

        if (!res.ok) throw new Error();
        showToast(`${productName} ajoute au panier!`, 'success');
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
