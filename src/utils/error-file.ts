import fs from "fs";
import path from "path";

export async function saveErrorFile(error: any, bodyData?: any) {
  try {
    const errorsDir = path.resolve("./errors");

    if (!fs.existsSync(errorsDir)) {
      fs.mkdirSync(errorsDir, { recursive: true });
    }

    const now = new Date();
    const fileName = `${now.toISOString().replace(/:/g, "-")}.json`;

    const content = {
      timestamp: now.toISOString(),
      error: typeof error === "string" ? { message: error } : error,
      body: bodyData ?? null,
    };

    fs.writeFileSync(
      path.join(errorsDir, fileName),
      JSON.stringify(content, null, 2), 
      "utf-8"
    );

    console.log(`✅ Arquivo de erro salvo: ${fileName}`);
  } catch (err) {
    console.error("❌ Erro ao salvar arquivo de erro:", err);
  }
}
