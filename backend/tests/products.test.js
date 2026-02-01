// Products API Tests
const { getTestDb, BASE_URL } = require('./testHelper');

describe('Products API', () => {
    let db;

    beforeAll(async () => {
        db = await getTestDb();
    });

    afterAll(async () => {
        if (db) await db.end();
    });

    describe('GET /api/products', () => {
        it('should return a list of products', async () => {
            const response = await fetch(`${BASE_URL}/api/products`);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toHaveProperty('products');
            expect(Array.isArray(data.products)).toBe(true);
            expect(data.products.length).toBeGreaterThan(0);
        });

        it('should return products with or without pagination', async () => {
            const response = await fetch(`${BASE_URL}/api/products?page=1&limit=5`);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toHaveProperty('products');
            expect(Array.isArray(data.products)).toBe(true);
            expect(data.products.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/products/:id', () => {
        it('should return a specific product by ID', async () => {
            const response = await fetch(`${BASE_URL}/api/products/1`);
            const product = await response.json();

            expect(response.status).toBe(200);
            expect(product).toHaveProperty('product_id', 1);
            expect(product).toHaveProperty('name');
            expect(product).toHaveProperty('price');
            expect(product).toHaveProperty('images');
        });

        it('should return 404 for non-existent product', async () => {
            const response = await fetch(`${BASE_URL}/api/products/99999`);

            expect(response.status).toBe(404);
        });
    });

    describe('GET /api/products_cat', () => {
        it('should return products by category and department', async () => {
            const response = await fetch(
                `${BASE_URL}/api/products_cat?category_id=1&departmentName=Femme`
            );
            const products = await response.json();

            expect(response.status).toBe(200);
            expect(Array.isArray(products)).toBe(true);
        });
    });

    describe('Database Product Data', () => {
        it('should have products in the database', async () => {
            const [rows] = await db.query('SELECT COUNT(*) as count FROM PRODUCTS');
            expect(rows[0].count).toBeGreaterThan(0);
        });

        it('should have product images linked', async () => {
            const [rows] = await db.query('SELECT COUNT(*) as count FROM PRODUCT_IMAGES');
            expect(rows[0].count).toBeGreaterThan(0);
        });

        it('should have valid department and category relationships', async () => {
            const [rows] = await db.query(`
                SELECT p.product_id, p.name, d.department_name, c.category_name
                FROM PRODUCTS p
                JOIN DEPARTMENT d ON p.department_id = d.department_id
                JOIN CATEGORY c ON p.category_id = c.category_id
                LIMIT 5
            `);
            expect(rows.length).toBeGreaterThan(0);
            expect(rows[0]).toHaveProperty('department_name');
            expect(rows[0]).toHaveProperty('category_name');
        });
    });
});
