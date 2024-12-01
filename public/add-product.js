const config = {
    baseURL: 'http://192.168.2.147:3006', // Update this IP dynamically as needed
};

document.addEventListener('DOMContentLoaded', async () => {
    const departmentSelect = document.getElementById('department-id');
    const categorySelect = document.getElementById('category-id');

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

    // Handle form submission
    const form = document.getElementById('add-product-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        
        try {
            const response = await fetch(`${config.baseURL}/api/add-products`, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (result.success) {
                alert('Produit ajouté avec succès!');
                form.reset();
            } else {
                alert(`Erreur: ${result.error}`);
            }
        } catch (error) {
            console.error('Error adding product:', error);
            alert('Une erreur est survenue.');
        }
    });
});
