// Categories and Departments API Tests
const { getTestDb, BASE_URL } = require('./testHelper');

describe('Categories API', () => {
    let db;

    beforeAll(async () => {
        db = await getTestDb();
    });

    afterAll(async () => {
        if (db) await db.end();
    });

    describe('GET /api/departments', () => {
        it('should return all departments', async () => {
            const response = await fetch(`${BASE_URL}/api/departments`);
            const departments = await response.json();

            expect(response.status).toBe(200);
            expect(Array.isArray(departments)).toBe(true);
            expect(departments.length).toBeGreaterThan(0);
            expect(departments[0]).toHaveProperty('department_id');
            expect(departments[0]).toHaveProperty('department_name');
        });
    });

    describe('GET /api/all-categories', () => {
        it('should return all categories', async () => {
            const response = await fetch(`${BASE_URL}/api/all-categories`);
            const categories = await response.json();

            expect(response.status).toBe(200);
            expect(Array.isArray(categories)).toBe(true);
            expect(categories.length).toBeGreaterThan(0);
            expect(categories[0]).toHaveProperty('category_id');
            expect(categories[0]).toHaveProperty('category_name');
        });
    });

    describe('GET /api/categories', () => {
        it('should return categories for a specific department', async () => {
            const response = await fetch(`${BASE_URL}/api/categories?department=Femme`);
            const categories = await response.json();

            expect(response.status).toBe(200);
            expect(Array.isArray(categories)).toBe(true);
        });

        it('should return empty array for non-existent department', async () => {
            const response = await fetch(`${BASE_URL}/api/categories?department=NonExistent`);
            const categories = await response.json();

            expect(response.status).toBe(200);
            expect(Array.isArray(categories)).toBe(true);
            expect(categories.length).toBe(0);
        });
    });

    describe('GET /api/search-categories', () => {
        it('should search categories by query', async () => {
            const response = await fetch(`${BASE_URL}/api/search-categories?query=robe`);
            const results = await response.json();

            expect(response.status).toBe(200);
            expect(Array.isArray(results)).toBe(true);
        });

        it('should return results with department info', async () => {
            const response = await fetch(`${BASE_URL}/api/search-categories?query=pant`);
            const results = await response.json();

            expect(response.status).toBe(200);
            if (results.length > 0) {
                expect(results[0]).toHaveProperty('category_name');
                expect(results[0]).toHaveProperty('department_name');
            }
        });
    });

    describe('Database Category Data', () => {
        it('should have 4 departments', async () => {
            const [rows] = await db.query('SELECT COUNT(*) as count FROM DEPARTMENT');
            expect(rows[0].count).toBe(4);
        });

        it('should have multiple categories', async () => {
            const [rows] = await db.query('SELECT COUNT(*) as count FROM CATEGORY');
            expect(rows[0].count).toBeGreaterThan(5);
        });

        it('should have department-category relationships', async () => {
            const [rows] = await db.query('SELECT COUNT(*) as count FROM DEPARTMENT_CATEGORY');
            expect(rows[0].count).toBeGreaterThan(10);
        });

        it('should have expected departments', async () => {
            const [rows] = await db.query('SELECT department_name FROM DEPARTMENT ORDER BY department_name');
            const names = rows.map(r => r.department_name);

            expect(names).toContain('Femme');
            expect(names).toContain('Homme');
            expect(names).toContain('Enfant');
            expect(names).toContain('Linge de Maison');
        });
    });
});
