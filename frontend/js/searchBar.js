// Search bar functionality with debouncing

// Debounce function to limit API calls
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
};

const initSearchBar = (searchBarElement, searchResultsContainer, clearSearchBtn) => {
    // Detect if we're in a subdirectory (html/) or root
    const isSubPage = window.location.pathname.includes('/html/');
    const htmlPath = isSubPage ? '' : 'html/';

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
                    window.location.href = `${htmlPath}searchResults.html?category_id=${category.category_id}&departmentName=${encodeURIComponent(category.department_name)}`;
                });

                searchResultsContainer.appendChild(resultItem);
            });
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

    // Debounced search function - waits 300ms after user stops typing
    const debouncedSearch = debounce(searchCategories, 300);

    searchBarElement.addEventListener('input', (event) => {
        const query = event.target.value;
        if (query.length > 1) {
            debouncedSearch(query);
            if (clearSearchBtn) clearSearchBtn.style.display = 'flex';
        } else {
            searchResultsContainer.style.display = 'none';
            if (clearSearchBtn) clearSearchBtn.style.display = 'none';
        }
    });

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchBarElement.value = '';
            searchResultsContainer.style.display = 'none';
            clearSearchBtn.style.display = 'none';
            searchBarElement.focus();
        });
    }
};

// Track which search bars have been initialized
const initializedSearchBars = new Set();

// Function to initialize all search bars
const initAllSearchBars = () => {
    // Desktop search bar
    const searchBar = document.getElementById('search-bar');
    const searchResults = document.getElementById('search-results');
    const clearSearch = document.getElementById('clear-search');

    if (searchBar && searchResults && !initializedSearchBars.has('desktop')) {
        initSearchBar(searchBar, searchResults, clearSearch);
        initializedSearchBars.add('desktop');
    }

    // Mobile search bar
    const searchBarMobile = document.getElementById('search-bar-mobile');
    const searchResultsMobile = document.getElementById('search-results-mobile');
    const clearSearchMobile = document.getElementById('clear-search-mobile');

    if (searchBarMobile && searchResultsMobile && !initializedSearchBars.has('mobile')) {
        initSearchBar(searchBarMobile, searchResultsMobile, clearSearchMobile);
        initializedSearchBars.add('mobile');
    }
};

// Auto-initialize when DOM is ready and after dynamic components load
document.addEventListener('DOMContentLoaded', () => {
    // Initial attempt
    initAllSearchBars();

    // Retry after components.js has time to load dynamic header
    // This handles the case where header is dynamically generated
    setTimeout(initAllSearchBars, 150);
    setTimeout(initAllSearchBars, 300);
});

// Export for manual initialization if needed
window.initSearchBars = initAllSearchBars;
