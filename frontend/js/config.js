// Configuration du frontend
// ============================================
// IMPORTANT: Modifier cette URL pour la production
// En local: 'http://localhost:3006'
// En production: 'https://votre-app.railway.app' (URL fournie par Railway)
// ============================================
const config = {
    baseURL: 'http://localhost:3006',

    // Stripe public key (la clé de test pour le dev, clé live pour prod)
    stripePublicKey: 'pk_test_51PIRk7DIrmiE2Hgb4lLVD99VQnFg7uWaAhtEBBBzLIixaLhcQ9FOuhkSonPw8SozcgiS19efR92rNwYX6kQ7TRvT00YayxN2sq'
};

// Rendre la config disponible globalement
window.config = config;

// Support pour Node.js (tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}
