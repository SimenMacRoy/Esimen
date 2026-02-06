// Configuration du frontend
// ============================================
// IMPORTANT: Modifier cette URL pour la production
// En local: 'http://localhost:3006'
// En production: 'https://votre-app.railway.app' (URL fournie par Railway)
// ============================================

var config = {
    baseURL: 'https://esimen-production.up.railway.app',
    stripePublicKey: null, // Will be loaded from backend

    // Load Stripe key from backend
    async loadStripeKey() {
        if (this.stripePublicKey) return this.stripePublicKey;
        try {
            const response = await fetch(`${this.baseURL}/api/stripe-config`);
            const data = await response.json();
            this.stripePublicKey = data.publishableKey;
            return this.stripePublicKey;
        } catch (error) {
            console.error('Failed to load Stripe config:', error);
            return null;
        }
    }
};

// Rendre la config disponible globalement
window.config = config;

// Support pour Node.js (tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}
