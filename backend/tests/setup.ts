// Set required env vars BEFORE any module imports run in test files.
// dotenv.config() does NOT override existing env vars, so these take priority over .env.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/nitsat_test';
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.JWT_EXPIRES_IN = '1h';
process.env.PORT = '3001';
