import sql from "mssql";

const pumaPools: Map<string, sql.ConnectionPool> = new Map();

export async function connectPumaDb(
  databaseName: string,
): Promise<sql.ConnectionPool> {
  console.log({
    PUMA_USER: process.env.PUMA_USER,
    PUMA_PASSWORD: process.env.PUMA_PASSWORD,
    PUMA_SERVER: process.env.PUMA_SERVER,
    PUMA_PORT: process.env.PUMA_PORT,
  });
  const existing = pumaPools.get(databaseName);
  if (existing && existing.connected) return existing;

  const sqlConfig = {
    user: process.env.PUMA_USER!,
    password: process.env.PUMA_PASSWORD!,
    server: process.env.PUMA_SERVER!,
    port: parseInt(process.env.PUMA_PORT ?? "1433"),
    database: databaseName,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      requestTimeout: 600000,
    },
  };

  try {
    const pool = new sql.ConnectionPool(sqlConfig);
    await pool.connect();
    console.log(`✅ Conectado ao PUMA DB (${databaseName})`);
    pumaPools.set(databaseName, pool);
    return pool;
  } catch (err) {
    console.error("❌ Erro ao conectar no PUMA DB:", err);
    throw err;
  }
}
