const config = {
    baseURL: 'http://192.168.2.147:3006', // Update this IP dynamically as needed
};

document.addEventListener('DOMContentLoaded', async () => {
    const departmentSelect = document.getElementById('department-id');
    const categorySelect = document.getElementById('category-id');
    const form = document.getElementById('modify-product-form');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product_id');

    // Fetch departments and populate select menu
    try {
        const deptResponse = await fetch(`${config.baseURL}/api/departments`);
        const departments = await deptResponse.json();

        departments.forEach(department => {
            const option = document.createElement('option');
            option.value = department.department_id;
            option.textContent = `${department.department_id} - ${department.department_name}`;
            departmentSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching departments:', error);
    }

    // Fetch categories and populate select menu
    try {
        const catResponse = await fetch(`${config.baseURL}/api/all-categories`);
        const categories = await catResponse.json();
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.category_id;
            option.textContent = `${category.category_id} - ${category.category_name}`;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
    }

    // Preload product details
    async function loadProductDetails() {
        console.log(productId);
        try {
            const response = await fetch(`${config.baseURL}/api/products/${productId}`);
            const product = await response.json();

            document.getElementById('name').value = product.name;
            document.getElementById('description').value = product.description;
            document.getElementById('stock').value = product.stock;
            document.getElementById('price').value = product.price;

            // Pre-select department and category
            if (product.department_id) {
                departmentSelect.value = product.department_id;
            }
            if (product.category_id) {
                categorySelect.value = product.category_id;
            }
        } catch (error) {
            console.error('Error loading product details:', error);
        }
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        formData.append('product_id', productId);

        try {
            const response = await fetch(`${config.baseURL}/api/products/${productId}`, {
                method: 'PUT',
                body: formData,
            });

            const result = await response.json();
            if (result.success) {
                alert('Produit modifié avec succès!');
                form.reset(); // Optionally reset the form after success
                window.location.href = `${config.baseURL}/manage-products.html`;
            } else {
                alert(`Erreur: ${result.error}`);
            }
        } catch (error) {
            console.error('Error updating product:', error);
            alert('Une erreur est survenue.');
        }
    });

    // Load product details on page load
    loadProductDetails();
});
