const config = {
    baseURL: 'http://192.168.2.147:3006', // Update this IP dynamically as needed
};

document.addEventListener('DOMContentLoaded', () => {
    const categoryList = document.getElementById('category-list');
    const tabItems = document.querySelectorAll('.tab-item'); // Top menu department tabs
    const navCategories = document.getElementById('nav-categories'); // "Categorie" navigation tab (bottom menu)
    const navAccueil = document.getElementById('nav-accueil'); // "Accueil" navigation tab (bottom menu)
    const navBasket = document.getElementById('nav-basket'); // 
    const navProfile = document.getElementById('nav-profile');
    const searchBar = document.getElementById('search-bar'); // Search bar input
    const searchResultsContainer = document.getElementById('search-results'); // Search results container
    const clearSearch = document.getElementById('clear-search');
    const basketContainer = document.querySelector('.basket-container');
    const basketCountElement = document.querySelector('.basket-count');

    // Function to switch the active department tab in the top menu
    const switchActiveTab = (selectedTab) => {
        tabItems.forEach(tab => tab.classList.remove('active')); // Remove active class from all tabs
        selectedTab.classList.add('active'); // Add active class to the clicked tab
    };

    // Function to switch the active navigation tab in the bottom menu
    const switchActiveNavTab = (selectedNav) => {
        [navAccueil, navCategories, navBasket, navProfile].forEach(nav => nav.classList.remove('active')); // Remove active class from both navigation tabs
        selectedNav.classList.add('active'); // Add active class to the clicked navigation tab
    };

    searchResultsContainer.style.display = 'none';

    // Function to fetch and display categories based on the selected department
    const loadCategories = async (departmentName) => {
        try {
            const response = await fetch(`${config.baseURL}/api/categories?department=${departmentName}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const categories = await response.json();
            console.log('Categories fetched:', categories);

            categoryList.innerHTML = ''; // Clear current category list

            if (categories.length === 0) {
                categoryList.innerHTML = '<p>No categories available in this department.</p>';
                return;
            }

            // Display categories dynamically
            categories.forEach(category => {
                const categoryCard = document.createElement('div');
                categoryCard.classList.add('category-card');
                categoryCard.innerHTML = `<h3>${category.category_name}</h3>`;

                // Navigate to product list for the clicked category
                categoryCard.addEventListener('click', () => {
                    window.location.href = `${config.baseURL}/products.html?category_id=${category.category_id}&departmentName=${departmentName}`;
                });

                categoryList.appendChild(categoryCard);
            });

        } catch (error) {
            console.error('Error loading categories:', error);
            categoryList.innerHTML = '<p>Unable to load categories. Please try again later.</p>';
        }
    };

       // Show or hide the clear icon based on input value
       searchBar.addEventListener('input', () => {
        if (searchBar.value.trim() !== '') {
            clearSearch.style.display = 'flex';
        } else {
            clearSearch.style.display = 'none';
        }
    });

    // Clear the search bar when the clear icon is clicked
    clearSearch.addEventListener('click', () => {
        searchBar.value = '';
        clearSearch.style.display = 'none';
        searchResultsContainer.style.display = 'none'; 
        //document.getElementById('search-results').innerHTML = ''; // Clear search results if applicable
        searchBar.focus(); // Refocus on the input
    });

    // Add event listeners for department tabs in the top menu
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            const departmentName = tab.getAttribute('data-department');
            switchActiveTab(tab);  // Switch active tab
            loadCategories(departmentName);  // Load categories for the selected department
        });
    });

    // Load "Femme" categories by default on page load
    const defaultTab = document.querySelector('.tab-item[data-department="femme"]');
    switchActiveTab(defaultTab);  // Set "Femme" as the default active tab
    loadCategories('Femme');  // Load "Femme" categories by default

    // Ensure "Categorie" is the active navigation tab on page load
    switchActiveNavTab(navCategories);  // Set "Categorie" as the default active nav tab

    // Event listener for "Accueil" navigation tab to redirect to the homepage
    navAccueil.addEventListener('click', () => {
        switchActiveNavTab(navAccueil);  // Set "Accueil" as active
        window.location.href = `${config.baseURL}/index.html`;  // Redirect to homepage
    });

    // Event listener for "Basket" navigation item
    navBasket.addEventListener('click', () => {
        switchActiveNavTab(navBasket); // Set "Basket" as the active nav tab
        window.location.href = `${config.baseURL}/basket.html`; // Redirect to the basket page
    });

    // Event listener for "Profile" navigation item
    navProfile.addEventListener('click', () => {
        switchActiveNavTab(navProfile); // Set "Profile" as the active nav tab
        window.location.href = `${config.baseURL}/profile.html`; // Redirect to the profile page
    });

    navCategories.addEventListener('click', () => {
        switchActiveNavTab(navCategories); // Set "Categories" as the active nav tab
        window.location.href = `${config.baseURL}/category.html`; // Redirect to the category page
    });

    // Search Bar Functionality

     // Function to fetch categories or departments and navigate to product.html
     const searchCategories = async (query) => {
        try {
            const response = await fetch(`${config.baseURL}/api/search-categories?query=${query}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const categories = await response.json();
            searchResultsContainer.innerHTML = ''; // Clear previous search results

            if (categories.length === 0) {
                searchResultsContainer.style.display = 'none';
                return;
            }

            // Display search results
            searchResultsContainer.style.display = 'block';
            categories.forEach(category => {
                const resultItem = document.createElement('div');
                resultItem.classList.add('search-result-item');
                resultItem.textContent = `${category.category_name} (${category.department_name})`;

                // Add event listener to navigate to the products page
                resultItem.addEventListener('click', () => {
                    // Navigate to product.html with the category_id and department name
                    
                    window.location.href = `products.html?category_id=${category.category_id}&departmentName=${category.department_name}`;
                });

                searchResultsContainer.appendChild(resultItem);
            });
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

    // Event listener for search input
    searchBar.addEventListener('input', (event) => {
        const query = event.target.value;
        if (query.length > 1) {
            searchCategories(query); // Call the search function with the input
        } else {
            searchResultsContainer.style.display = 'none';
        }
    });

    // Fetch the basket count from the backend
    async function fetchBasketCount() {
        const userId = getUserId(); // Replace with your logic to get the logged-in user's ID

        if (!userId) return;

        try {
            const response = await fetch(`${config.baseURL}/api/basket/count?user_id=${userId}`);
            if (response.ok) {
                const data = await response.json();
                basketCountElement.textContent = data.itemCount || 0; // Update the badge
            } else {
                console.error('Error fetching basket count:', response.statusText);
                basketCountElement.textContent = 0; // Fallback to 0
            }
        } catch (error) {
            console.error('Error fetching basket count:', error);
            basketCountElement.textContent = 0; // Fallback to 0
        }
    }

    // Navigate to the basket page when the basket icon is clicked
    basketContainer.addEventListener('click', () => {
        window.location.href = 'basket.html'; // Replace with your actual basket page URL
    });

    // Fetch and update the basket count on page load
    fetchBasketCount();

});
function goBack() {
    window.history.back(); // Navigate to the previous page
}
function getUserId() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    return userData ? userData.user_id : null;
}