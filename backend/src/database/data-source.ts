import { DataSource } from "typeorm";
import { config } from "dotenv";

config();

const databaseDriver = process.env.DATABASE_DRIVER || "sqlite";
const databaseFile = process.env.DATABASE_FILE || "./database.sqlite";

export default new DataSource({
  type: databaseDriver as any,
  database: databaseFile,
  // Conexión PostgreSQL alineada con app.module: la CLI de migraciones
  // (migration:run/generate) necesita host/usuario/contraseña — antes solo
  // funcionaba con sqlite y el flujo de producción era inutilizable.
  host: process.env.DATABASE_HOST || "localhost",
  port: Number(process.env.DATABASE_PORT || 5432),
  username: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "postgres",
  entities: [__dirname + "/../**/*.entity{.ts,.js}"],
  migrations: [__dirname + "/migrations/*{.ts,.js}"],
});
