
// Initialize the search bar with event listeners and handlers
const initSearchBar = (searchBarElement, searchResultsContainer) => {
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

                // Add event listener to navigate to the products in this category
                resultItem.addEventListener('click', () => {
                    window.location.href = `${config.baseURL}/searchResults.html?category_id=${category.category_id}&departmentName=${category.department_name}`;
                });

                searchResultsContainer.appendChild(resultItem);
            });
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

    // Event listener for search input
    searchBarElement.addEventListener('input', (event) => {
        const query = event.target.value;
        if (query.length > 1) {
            searchCategories(query); // Call the search function with the input
        } else {
            searchResultsContainer.style.display = 'none';
        }
    });
};
