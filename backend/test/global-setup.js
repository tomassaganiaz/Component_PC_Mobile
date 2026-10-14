/**
 * globalSetup de Jest (e2e): asegura la base de datos de test y limpia el
 * esquema antes de correr las suites. Se ejecuta una vez, antes de todo.
 */
require("dotenv").config();

const { Client } = require("pg");

const TEST_DB = "ers_components_test";
const base = {
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  user: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "postgres",
};

module.exports = async () => {
  const admin = new Client({ ...base, database: "postgres" });
  await admin.connect();
  const exists = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [TEST_DB],
  );
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${TEST_DB}"`);
  }
  await admin.end();

  const db = new Client({ ...base, database: TEST_DB });
  await db.connect();
  await db.query("DROP SCHEMA IF EXISTS public CASCADE");
  await db.query("CREATE SCHEMA public");
  await db.end();
};
