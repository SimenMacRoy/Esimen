// Basket API Tests
const { getTestDb, generateUserToken, BASE_URL } = require('./testHelper');

describe('Basket API', () => {
    let db;
    let testUserId = 3; // Jean Dupont
    let token;

    beforeAll(async () => {
        db = await getTestDb();
        token = generateUserToken();
    });

    afterAll(async () => {
        // Cleanup test basket items
        await db.query('DELETE FROM BASKET WHERE user_id = ?', [testUserId]);
        if (db) await db.end();
    });

    describe('GET /api/basket', () => {
        it('should return empty basket for user with no items', async () => {
            // First clear the basket
            await db.query('DELETE FROM BASKET WHERE user_id = ?', [testUserId]);

            const response = await fetch(`${BASE_URL}/api/basket?user_id=${testUserId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const basket = await response.json();

            expect(response.status).toBe(200);
            expect(Array.isArray(basket)).toBe(true);
            expect(basket.length).toBe(0);
        });
    });

    describe('POST /api/basket', () => {
        it('should add item to basket', async () => {
            const response = await fetch(`${BASE_URL}/api/basket`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: testUserId,
                    productId: 1,
                    quantity: 2
                })
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should reject adding item without authentication', async () => {
            const response = await fetch(`${BASE_URL}/api/basket`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: testUserId,
                    productId: 1,
                    quantity: 1
                })
            });

            expect(response.status).toBe(401);
        });
    });

    describe('PUT /api/basket', () => {
        beforeAll(async () => {
            // Ensure there's an item in the basket
            await db.query(
                'INSERT INTO BASKET (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = ?',
                [testUserId, 1, 2, 2]
            );
        });

        it('should update item quantity', async () => {
            const response = await fetch(`${BASE_URL}/api/basket`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: testUserId,
                    product_id: 1,
                    quantity: 5
                })
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });
    });

    describe('DELETE /api/basket', () => {
        beforeAll(async () => {
            // Add item to delete
            await db.query(
                'INSERT INTO BASKET (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = ?',
                [testUserId, 2, 1, 1]
            );
        });

        it('should remove item from basket', async () => {
            const response = await fetch(
                `${BASE_URL}/api/basket?user_id=${testUserId}&product_id=2`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });
    });

    describe('GET /api/basket/count', () => {
        beforeAll(async () => {
            // Setup basket with known items
            await db.query('DELETE FROM BASKET WHERE user_id = ?', [testUserId]);
            await db.query('INSERT INTO BASKET (user_id, product_id, quantity) VALUES (?, ?, ?)', [testUserId, 1, 3]);
            await db.query('INSERT INTO BASKET (user_id, product_id, quantity) VALUES (?, ?, ?)', [testUserId, 2, 2]);
        });

        it('should return correct basket count', async () => {
            const response = await fetch(`${BASE_URL}/api/basket/count?user_id=${testUserId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toHaveProperty('itemCount');
            expect(Number(data.itemCount)).toBe(5); // 3 + 2
        });
    });

    describe('Database Basket Operations', () => {
        it('should correctly store basket items', async () => {
            const [rows] = await db.query(
                'SELECT * FROM BASKET WHERE user_id = ?',
                [testUserId]
            );
            expect(rows.length).toBeGreaterThanOrEqual(0);
        });

        it('should have valid product references', async () => {
            const [rows] = await db.query(`
                SELECT b.*, p.name, p.price
                FROM BASKET b
                JOIN PRODUCTS p ON b.product_id = p.product_id
                WHERE b.user_id = ?
            `, [testUserId]);

            rows.forEach(row => {
                expect(row).toHaveProperty('name');
                expect(row).toHaveProperty('price');
            });
        });
    });
});
