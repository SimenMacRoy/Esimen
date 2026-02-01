// Authentication API Tests
const { getTestDb, generateUserToken, generateAdminToken, testData, BASE_URL } = require('./testHelper');

describe('Authentication API', () => {
    let db;

    beforeAll(async () => {
        db = await getTestDb();
    });

    afterAll(async () => {
        if (db) await db.end();
    });

    describe('POST /api/users/check (Login)', () => {
        it('should return error for invalid credentials', async () => {
            const response = await fetch(`${BASE_URL}/api/users/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'nonexistent@email.com',
                    password: 'wrongpassword'
                })
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.isRegistered).toBe(false);
        });

        it('should return error for wrong password', async () => {
            const response = await fetch(`${BASE_URL}/api/users/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'jean.dupont@email.com',
                    password: 'wrongpassword'
                })
            });
            const data = await response.json();

            expect(data.isRegistered).not.toBe(true);
        });
    });

    describe('POST /api/users/register', () => {
        it('should register a new user successfully', async () => {
            const newUser = {
                ...testData.newUser,
                email: `test.${Date.now()}@email.com`
            };

            const response = await fetch(`${BASE_URL}/api/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data).toHaveProperty('token');
            expect(data).toHaveProperty('user_id');

            // Cleanup: delete the test user
            if (data.user_id) {
                await db.query('DELETE FROM USERS WHERE user_id = ?', [data.user_id]);
            }
        });

        it('should reject registration with existing email', async () => {
            const response = await fetch(`${BASE_URL}/api/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Test',
                    surname: 'User',
                    email: 'jean.dupont@email.com', // Already exists
                    password: 'testpassword'
                })
            });
            const data = await response.json();

            expect(data.success).not.toBe(true);
        });
    });

    describe('Protected Routes', () => {
        it('should reject requests without token', async () => {
            const response = await fetch(`${BASE_URL}/api/users/update`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Updated' })
            });

            expect(response.status).toBe(401);
        });

        it('should accept requests with valid token (not return 401)', async () => {
            const token = generateUserToken();

            const response = await fetch(`${BASE_URL}/api/users/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: 'Jean',
                    surname: 'Dupont',
                    email: 'jean.dupont@email.com',
                    phone: '514-555-0002'
                })
            });

            // Should not return 401 (unauthorized) when token is valid
            expect(response.status).not.toBe(401);
        });
    });

    describe('Admin Routes', () => {
        it('should reject non-admin access to admin routes', async () => {
            const userToken = generateUserToken();

            const response = await fetch(`${BASE_URL}/api/add-products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify(testData.newProduct)
            });

            expect(response.status).toBe(403);
        });
    });

    describe('Database User Data', () => {
        it('should have users in the database', async () => {
            const [rows] = await db.query('SELECT COUNT(*) as count FROM USERS');
            expect(rows[0].count).toBeGreaterThan(0);
        });

        it('should have an admin user', async () => {
            const [rows] = await db.query('SELECT * FROM USERS WHERE is_admin = 1');
            expect(rows.length).toBeGreaterThan(0);
        });

        it('should have hashed passwords', async () => {
            const [rows] = await db.query('SELECT password FROM USERS LIMIT 1');
            expect(rows[0].password).toMatch(/^\$2[aby]?\$/); // bcrypt hash pattern
        });
    });
});
