const config = {
    baseURL: 'http://192.168.51.205:3006', // Update this IP dynamically as needed
};

document.addEventListener('DOMContentLoaded', async () => {
    const productDetailsSection = document.getElementById('product-details');

    // Get product ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const product_id = urlParams.get('product_id');

    if (product_id) {
        try {
            const response = await fetch(`${config.baseURL}/api/products/${product_id}`);
            if (!response.ok) {
                throw new Error('Product not found');
            }

            const product = await response.json();

            // Create container for image slideshow
            const imageContainer = document.createElement('div');
            imageContainer.classList.add('image-container');

            // Create an img element to show the current image
            const imgElement = document.createElement('img');
            imgElement.style.width = '300px';
            imgElement.style.height = '300px';
            imageContainer.appendChild(imgElement);

            let currentIndex = 0;

            // Function to change the image every 2 seconds
            const changeImage = () => {
                if (product.images && product.images.length > 0) {
                    imgElement.src = product.images[currentIndex];
                    imgElement.alt = `Image ${currentIndex + 1}`;
                    currentIndex = (currentIndex + 1) % product.images.length;
                } else {
                    imgElement.src = 'default_image.jpg'; // Fallback if no images
                    imgElement.alt = 'Default image';
                }
            };

            // Start the image slideshow
            changeImage(); // Show the first image immediately
            setInterval(changeImage, 2000); // Change image every 2 seconds

            // Display product details with image slideshow
            productDetailsSection.innerHTML = `
                <div class="product-detail-card">
                    <h1>${product.name}</h1>
                    <p>${product.description}</p>
                    <p class="price">${product.price}€</p>
                    <p>Stock: ${product.stock}</p>
                </div>
            `;
            productDetailsSection.insertBefore(imageContainer, productDetailsSection.firstChild);
        } catch (error) {
            console.error('Error loading product details:', error);
            productDetailsSection.innerHTML = '<p>Product details could not be loaded. Please try again later.</p>';
        }
    } else {
        productDetailsSection.innerHTML = '<p>No product found.</p>';
    }
});
