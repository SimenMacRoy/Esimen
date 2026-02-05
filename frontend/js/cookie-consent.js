// ============================================
// COOKIE CONSENT BANNER - Shek's House
// ============================================

const CookieConsent = {
    // Check if user has already accepted cookies
    hasConsented() {
        return localStorage.getItem('cookieConsent') === 'accepted';
    },

    // Save consent
    saveConsent() {
        localStorage.setItem('cookieConsent', 'accepted');
        localStorage.setItem('cookieConsentDate', new Date().toISOString());
    },

    // Create and show the banner
    init() {
        // Don't show if already consented
        if (this.hasConsented()) return;

        // Create banner element
        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.className = 'cookie-banner';
        banner.innerHTML = `
            <div class="cookie-content">
                <div class="cookie-icon">
                    <i class="fas fa-cookie-bite"></i>
                </div>
                <div class="cookie-text">
                    <h4>Ce site utilise des temoins (cookies)</h4>
                    <p>Nous utilisons des temoins pour ameliorer votre experience, personnaliser le contenu et analyser notre trafic. En continuant a utiliser ce site, vous acceptez notre utilisation des temoins.</p>
                </div>
                <div class="cookie-actions">
                    <button class="btn-cookie-accept" id="accept-cookies">
                        <i class="fas fa-check"></i> Accepter
                    </button>
                    <a href="privacy.html" class="btn-cookie-learn">En savoir plus</a>
                </div>
            </div>
        `;

        // Add styles
        this.addStyles();

        // Add to page
        document.body.appendChild(banner);

        // Show with animation
        setTimeout(() => banner.classList.add('show'), 100);

        // Handle accept button
        document.getElementById('accept-cookies').addEventListener('click', () => {
            this.saveConsent();
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 300);
        });
    },

    // Add CSS styles
    addStyles() {
        if (document.getElementById('cookie-consent-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'cookie-consent-styles';
        styles.textContent = `
            .cookie-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #fff;
                padding: 20px;
                z-index: 99999;
                box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
                transform: translateY(100%);
                transition: transform 0.3s ease;
            }

            .cookie-banner.show {
                transform: translateY(0);
            }

            .cookie-content {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                gap: 20px;
                flex-wrap: wrap;
            }

            .cookie-icon {
                font-size: 40px;
                color: #ff4500;
                flex-shrink: 0;
            }

            .cookie-text {
                flex: 1;
                min-width: 200px;
            }

            .cookie-text h4 {
                margin: 0 0 8px 0;
                font-size: 16px;
                font-weight: 600;
            }

            .cookie-text p {
                margin: 0;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.8);
                line-height: 1.5;
            }

            .cookie-actions {
                display: flex;
                gap: 12px;
                flex-shrink: 0;
            }

            .btn-cookie-accept {
                padding: 12px 24px;
                background: linear-gradient(135deg, #ff4500, #ff6b35);
                color: #fff;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                font-family: inherit;
            }

            .btn-cookie-accept:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(255, 69, 0, 0.4);
            }

            .btn-cookie-learn {
                padding: 12px 20px;
                background: transparent;
                color: rgba(255, 255, 255, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                font-size: 13px;
                text-decoration: none;
                transition: all 0.2s ease;
            }

            .btn-cookie-learn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }

            @media (max-width: 768px) {
                .cookie-banner {
                    padding: 16px;
                }

                .cookie-content {
                    flex-direction: column;
                    text-align: center;
                    gap: 16px;
                }

                .cookie-icon {
                    font-size: 32px;
                }

                .cookie-text h4 {
                    font-size: 15px;
                }

                .cookie-text p {
                    font-size: 12px;
                }

                .cookie-actions {
                    width: 100%;
                    flex-direction: column;
                }

                .btn-cookie-accept,
                .btn-cookie-learn {
                    width: 100%;
                    justify-content: center;
                    text-align: center;
                }
            }
        `;
        document.head.appendChild(styles);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    CookieConsent.init();
});
