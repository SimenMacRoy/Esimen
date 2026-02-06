// Configuration du frontend
// ============================================
// IMPORTANT: Modifier cette URL pour la production
// En local: 'http://localhost:3006'
// En production: 'https://votre-app.railway.app' (URL fournie par Railway)
// ============================================

// Mode de l'application: 'development' ou 'production'
var APP_MODE = 'development'; // Changer en 'production' quand vous avez la cle Stripe live

var config = {
    baseURL: 'https://esimen-production.up.railway.app',

    // Stripe public keys
    // Pour passer en production: changer APP_MODE en 'production' et ajouter votre cle live
    stripePublicKey: APP_MODE === 'production'
        ? 'pk_live_VOTRE_CLE_LIVE_ICI'  // Remplacer par votre cle publishable live de Stripe
        : 'pk_test_51PIRk7DIrmiE2Hgb4lLVD99VQnFg7uWaAhtEBBBzLIixaLhcQ9FOuhkSonPw8SozcgiS19efR92rNwYX6kQ7TRvT00YayxN2sq'
};

// Rendre la config disponible globalement
window.config = config;

// Support pour Node.js (tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}
