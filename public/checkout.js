const config = {
    baseURL: 'http://192.168.2.147:3006', // Update this IP dynamically as needed
};

document.addEventListener('DOMContentLoaded', async () => {

    
    const stripe = Stripe('pk_test_51PIRk7DIrmiE2Hgb4lLVD99VQnFg7uWaAhtEBBBzLIixaLhcQ9FOuhkSonPw8SozcgiS19efR92rNwYX6kQ7TRvT00YayxN2sq'); // Replace with your actual public key
    const elements = stripe.elements();
    const cardElement = elements.create('card', {
        hidePostalCode: true, // Hide Stripe's built-in postal code input
    });
    cardElement.mount('#card-element');

    // Retrieve subtotal from localStorage
    const subtotal = parseFloat(localStorage.getItem('subtotal')) || 0;
    const taxes = subtotal * 0.15;
    const delivery = subtotal * 0.10;
    const total = subtotal + taxes + delivery;
    const checkoutForm = document.getElementById('checkout-form');


    if (subtotal === 0) {
        alert("Votre panier est vide. Veuillez ajouter des articles avant de procéder au paiement.");
        window.location.href = `${config.baseURL}/basket.html`;
        return; // Stop further processing
    }

    // Display values on the page
    document.getElementById('subtotal-price').textContent = `CA$ ${subtotal.toFixed(2)}`;
    document.getElementById('taxes-price').textContent = `CA$ ${taxes.toFixed(2)}`;
    document.getElementById('delivery-price').textContent = `CA$ ${delivery.toFixed(2)}`;
    document.getElementById('total-price').textContent = `CA$ ${total.toFixed(2)}`;

    
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
    
        const cardHolderName = document.getElementById('card-holder').value;
        const postalCode = document.getElementById('postal-code').value;
        const userId = getUserId(); // Ensure this fetches the logged-in user's ID
    
        const { paymentMethod, error } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
            billing_details: {
                name: cardHolderName,
                address: {
                    postal_code: postalCode
                },
            },
        });
    
        if (error) {
            alert(`Erreur de paiement: ${error.message}`);
            return;
        }
    
        // Send payment method to your server to create a payment intent
        try {
            const response = await fetch(`${config.baseURL}/api/payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId, // Include user ID in the request
                    amount: Math.round(total * 100),
                    currency: 'cad',
                    paymentMethodId: paymentMethod.id,
                }),
            });
    
            const result = await response.json();
            if (result.success) {
                alert('Paiement accepté. Un courriel de confirmation vous a été envoyé.');
                window.location.href = '/index.html'; // Redirect to homepage
            } else {
                alert(`Échec du paiement: ${result.error}`);
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            alert('Une erreur s\'est produite. Veuillez réessayer plus tard.');
        }
    });
    
});
function getUserId() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    return userData ? userData.user_id : null;
}
