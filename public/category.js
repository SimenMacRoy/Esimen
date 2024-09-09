document.addEventListener('DOMContentLoaded', () => {
    const categoryList = document.getElementById('category-list');
    const tabItems = document.querySelectorAll('.tab-item'); // Top menu department tabs
    const navCategories = document.getElementById('nav-categories'); // "Categorie" navigation tab (bottom menu)
    const navAccueil = document.getElementById('nav-accueil'); // "Accueil" navigation tab (bottom menu)

    // Function to switch the active department tab in the top menu
    const switchActiveTab = (selectedTab) => {
        tabItems.forEach(tab => tab.classList.remove('active')); // Remove active class from all tabs
        selectedTab.classList.add('active'); // Add active class to the clicked tab
    };

    // Function to switch the active navigation tab in the bottom menu
    const switchActiveNavTab = (selectedNav) => {
        [navAccueil, navCategories].forEach(nav => nav.classList.remove('active')); // Remove active class from both navigation tabs
        selectedNav.classList.add('active'); // Add active class to the clicked navigation tab
    };

    // Function to fetch and display categories based on the selected department
    const loadCategories = async (department) => {
        try {
            const response = await fetch(`http://localhost:3006/api/categories?department=${department}`);
            
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
                    window.location.href = `http://localhost:3006/products.html?category_id=${category.category_id}`;
                });

                categoryList.appendChild(categoryCard);
            });

        } catch (error) {
            console.error('Error loading categories:', error);
            categoryList.innerHTML = '<p>Unable to load categories. Please try again later.</p>';
        }
    };

    // Add event listeners for department tabs in the top menu
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            const department = tab.getAttribute('data-department');
            switchActiveTab(tab);  // Switch active tab
            loadCategories(department);  // Load categories for the selected department
        });
    });

    // Load "Femme" categories by default on page load
    const defaultTab = document.querySelector('.tab-item[data-department="femme"]');
    switchActiveTab(defaultTab);  // Set "Femme" as the default active tab
    loadCategories('femme');  // Load "Femme" categories by default

    // Ensure "Categorie" is the active navigation tab on page load
    switchActiveNavTab(navCategories);  // Set "Categorie" as the default active nav tab

    // Event listener for "Accueil" navigation tab to redirect to the homepage
    navAccueil.addEventListener('click', () => {
        switchActiveNavTab(navAccueil);  // Set "Accueil" as active
        window.location.href = 'http://localhost:3006/index.html';  // Redirect to homepage
    });
});
