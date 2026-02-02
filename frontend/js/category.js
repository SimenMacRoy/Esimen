// Category page with JWT authentication

// Use global config if available
const config = window.config || { baseURL: 'http://localhost:3006' };

function getUserId() {
    const userData = Auth.getUserData();
    return userData ? userData.user_id : null;
}

document.addEventListener('DOMContentLoaded', () => {
    // Wait for components to be initialized
    setTimeout(initCategoryPage, 100);
});

function initCategoryPage() {
    const categoryList = document.getElementById('category-list');
    const tabItems = document.querySelectorAll('.tab-item');
    const navCategories = document.getElementById('nav-categories');
    const navAccueil = document.getElementById('nav-accueil');
    const navBasket = document.getElementById('nav-basket');
    const navProfile = document.getElementById('nav-profile');
    const searchBar = document.getElementById('search-bar');
    const searchResultsContainer = document.getElementById('search-results');
    const clearSearch = document.getElementById('clear-search');
    const basketContainer = document.querySelector('.basket-container');
    const basketCountElement = document.querySelector('.basket-count');

    const switchActiveTab = (selectedTab) => {
        if (!selectedTab) return;
        tabItems.forEach(tab => tab.classList.remove('active'));
        selectedTab.classList.add('active');
    };

    const switchActiveNavTab = (selectedNav) => {
        if (!selectedNav) return;
        [navAccueil, navCategories, navBasket, navProfile].forEach(nav => {
            if (nav) nav.classList.remove('active');
        });
        selectedNav.classList.add('active');
    };

    // Hide search results initially
    if (searchResultsContainer) {
        searchResultsContainer.style.display = 'none';
    }

    const loadCategories = async (departmentName) => {
        if (!categoryList) return;

        // Show loader
        categoryList.innerHTML = '<div class="loader-container"><div class="loader"></div><p>Chargement...</p></div>';

        try {
            const response = await fetch(`${config.baseURL}/api/categories?department=${departmentName}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const categories = await response.json();
            categoryList.innerHTML = '';

            if (categories.length === 0) {
                categoryList.innerHTML = '<p>Aucune categorie disponible.</p>';
                return;
            }

            categories.forEach(category => {
                const categoryCard = document.createElement('div');
                categoryCard.classList.add('category-card');
                categoryCard.innerHTML = `<h3>${category.category_name}</h3>`;

                categoryCard.addEventListener('click', () => {
                    window.location.href = `products.html?category_id=${category.category_id}&departmentName=${encodeURIComponent(departmentName)}`;
                });

                categoryList.appendChild(categoryCard);
            });

        } catch (error) {
            console.error('Error loading categories:', error);
            categoryList.innerHTML = '<p>Impossible de charger les categories. Veuillez reessayer.</p>';
        }
    };

    // Search bar events
    if (searchBar) {
        searchBar.addEventListener('input', () => {
            if (clearSearch) {
                clearSearch.style.display = searchBar.value.trim() !== '' ? 'flex' : 'none';
            }
        });

        searchBar.addEventListener('input', (event) => {
            const query = event.target.value;
            if (query.length > 1) {
                searchCategories(query);
            } else if (searchResultsContainer) {
                searchResultsContainer.style.display = 'none';
            }
        });
    }

    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            if (searchBar) searchBar.value = '';
            clearSearch.style.display = 'none';
            if (searchResultsContainer) searchResultsContainer.style.display = 'none';
            if (searchBar) searchBar.focus();
        });
    }

    // Tab click events
    if (tabItems.length > 0) {
        tabItems.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const departmentName = tab.getAttribute('data-department');
                switchActiveTab(tab);
                loadCategories(departmentName);
            });
        });
    }

    // Load default tab
    const defaultTab = document.querySelector('.tab-item[data-department="femme"]');
    if (defaultTab) {
        switchActiveTab(defaultTab);
        loadCategories('Femme');
    }

    // Set active nav
    if (navCategories) {
        switchActiveNavTab(navCategories);
    }

    // Nav click events
    if (navAccueil) {
        navAccueil.addEventListener('click', () => {
            switchActiveNavTab(navAccueil);
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

    if (navCategories) {
        navCategories.addEventListener('click', () => {
            switchActiveNavTab(navCategories);
        });
    }

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
                    window.location.href = `products.html?category_id=${category.category_id}&departmentName=${category.department_name}`;
                });

                searchResultsContainer.appendChild(resultItem);
            });
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

    async function fetchBasketCount() {
        const userId = getUserId();
        if (!userId || !basketCountElement) return;

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

    if (basketContainer) {
        basketContainer.addEventListener('click', () => {
            window.location.href = 'basket.html';
        });
    }

    fetchBasketCount();
}

function goBack() {
    window.history.back();
}
