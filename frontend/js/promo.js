/**
 * Promo Code Management System
 * Handles promotional codes with server-side validation
 */

// Use global config if available
if (!window.config) {
    window.config = { baseURL: 'http://localhost:3006' };
}

const PromoCodeSystem = {
    // Currently applied coupon
    appliedCoupon: null,

    /**
     * Validate a promo code with server
     * @param {string} code - The promo code to validate
     * @param {number} cartTotal - The cart total
     * @param {number} cartItems - Number of items in cart
     * @returns {Object} Validation result
     */
    async validateCode(code, cartTotal, cartItems = 0) {
        if (!code || code.trim() === '') {
            return {
                valid: false,
                error: 'Veuillez entrer un code promo'
            };
        }

        // Check if user is logged in
        if (!Auth.isLoggedIn()) {
            return {
                valid: false,
                error: 'Connectez-vous pour utiliser un code promo'
            };
        }

        try {
            const response = await fetch(`${window.config.baseURL}/api/coupons/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({
                    code: code.trim(),
                    cart_total: cartTotal,
                    cart_items: cartItems
                })
            });

            const result = await response.json();

            if (result.valid) {
                return {
                    valid: true,
                    coupon: result.coupon,
                    discountAmount: result.coupon.discount_amount,
                    discountPercent: result.coupon.discount_type === 'percentage' ? result.coupon.discount_value : null,
                    type: result.coupon.discount_type,
                    description: result.coupon.description,
                    code: result.coupon.code
                };
            } else {
                return {
                    valid: false,
                    error: result.error || 'Code promo invalide'
                };
            }
        } catch (err) {
            console.error('Error validating promo code:', err);
            // Fall back to local validation if server is unavailable
            return this.validateCodeLocal(code, cartTotal);
        }
    },

    /**
     * Local validation fallback (for offline or demo mode)
     */
    validateCodeLocal(code, subtotal) {
        const normalizedCode = code.trim().toUpperCase();
        const localCodes = {
            'BIENVENUE10': {
                discount_value: 10,
                discount_type: 'percentage',
                min_purchase_amount: 0,
                max_discount_amount: 50,
                description: '10% de reduction'
            },
            'SHEK20': {
                discount_value: 20,
                discount_type: 'percentage',
                min_purchase_amount: 50,
                max_discount_amount: 100,
                description: '20% de reduction (min. 50$)'
            },
            'SAVE15': {
                discount_value: 15,
                discount_type: 'fixed_amount',
                min_purchase_amount: 30,
                max_discount_amount: 15,
                description: '15$ de reduction'
            }
        };

        const promo = localCodes[normalizedCode];

        if (!promo) {
            return {
                valid: false,
                error: 'Code promo invalide',
                code: null
            };
        }

        if (subtotal < promo.min_purchase_amount) {
            return {
                valid: false,
                error: `Achat minimum de ${promo.min_purchase_amount}$ requis`,
                code: normalizedCode
            };
        }

        let discountAmount;
        if (promo.discount_type === 'percentage') {
            discountAmount = subtotal * (promo.discount_value / 100);
            if (promo.max_discount_amount && discountAmount > promo.max_discount_amount) {
                discountAmount = promo.max_discount_amount;
            }
        } else {
            discountAmount = promo.discount_value;
        }

        return {
            valid: true,
            code: normalizedCode,
            discountAmount: discountAmount,
            discountPercent: promo.discount_type === 'percentage' ? promo.discount_value : null,
            type: promo.discount_type,
            description: promo.description,
            coupon: {
                code: normalizedCode,
                discount_type: promo.discount_type,
                discount_value: promo.discount_value,
                discount_amount: discountAmount
            }
        };
    },

    /**
     * Apply a promo code
     * @param {string} code - The promo code
     * @param {number} cartTotal - The cart total
     * @param {number} cartItems - Number of items
     * @returns {Object} Application result with new totals
     */
    async applyCode(code, cartTotal, cartItems = 0) {
        const validation = await this.validateCode(code, cartTotal, cartItems);

        if (!validation.valid) {
            return validation;
        }

        // Store applied coupon
        this.appliedCoupon = validation.coupon;
        this.saveAppliedPromo(validation);

        return {
            ...validation,
            newSubtotal: cartTotal - validation.discountAmount,
            savings: validation.discountAmount
        };
    },

    /**
     * Record coupon usage after order completion
     * @param {number} orderId - The order ID
     * @param {number} originalAmount - Original cart amount
     * @param {number} discountApplied - Discount amount applied
     * @param {number} finalAmount - Final amount after discount
     */
    async recordUsage(orderId, originalAmount, discountApplied, finalAmount) {
        if (!this.appliedCoupon || !this.appliedCoupon.coupon_id) return;

        try {
            await fetch(`${window.config.baseURL}/api/coupons/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({
                    coupon_id: this.appliedCoupon.coupon_id,
                    order_id: orderId,
                    original_amount: originalAmount,
                    discount_applied: discountApplied,
                    final_amount: finalAmount
                })
            });
        } catch (err) {
            console.error('Error recording coupon usage:', err);
        }
    },

    /**
     * Save applied promo to localStorage
     */
    saveAppliedPromo(promoData) {
        localStorage.setItem('appliedPromo', JSON.stringify({
            code: promoData.code,
            coupon_id: promoData.coupon?.coupon_id,
            discountAmount: promoData.discountAmount,
            discountPercent: promoData.discountPercent,
            type: promoData.type,
            description: promoData.description
        }));
    },

    /**
     * Get currently applied promo
     */
    getAppliedPromo() {
        const stored = localStorage.getItem('appliedPromo');
        if (stored) {
            const promo = JSON.parse(stored);
            this.appliedCoupon = promo;
            return promo;
        }
        return null;
    },

    /**
     * Remove applied promo
     */
    removeAppliedPromo() {
        this.appliedCoupon = null;
        localStorage.removeItem('appliedPromo');
    },

    /**
     * Recalculate discount with current cart total
     * @param {number} newCartTotal - Updated cart total
     * @returns {Object|null} Updated discount info or null
     */
    async recalculateDiscount(newCartTotal, cartItems = 0) {
        const appliedPromo = this.getAppliedPromo();
        if (!appliedPromo) return null;

        // Re-validate with new cart total
        const validation = await this.validateCode(appliedPromo.code, newCartTotal, cartItems);

        if (validation.valid) {
            this.saveAppliedPromo(validation);
            return validation;
        } else {
            // Coupon no longer valid with new cart total
            this.removeAppliedPromo();
            return null;
        }
    }
};

// Export for use
window.PromoCodeSystem = PromoCodeSystem;
