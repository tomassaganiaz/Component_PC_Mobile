/// <reference types="jest" />
/**
 * Se ejecuta ANTES de cargar los módulos de cada suite e2e.
 * Fuerza la configuración hacia una base de datos de test y desactiva el
 * throttling para que las suites no fallén por rate-limit.
 */
process.env.NODE_ENV = "development";
process.env.DATABASE_HOST = process.env.DATABASE_HOST || "localhost";
process.env.DATABASE_PORT = process.env.DATABASE_PORT || "5432";
process.env.DATABASE_USER = process.env.DATABASE_USER || "postgres";
process.env.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || "postgres";
process.env.DATABASE_NAME = "ers_components_test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "e2e_test_secret_with_more_than_32_chars!!";
process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || "7d";
process.env.CORS_ORIGIN = "*";
process.env.THROTTLE_TTL = "60";
process.env.THROTTLE_LIMIT = "100000";
process.env.DATABASE_LOGGING = "false";
