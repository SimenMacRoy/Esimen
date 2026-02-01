// Test setup file
require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test cleanup
afterAll(async () => {
    // Close any open connections
    await new Promise(resolve => setTimeout(resolve, 500));
});
