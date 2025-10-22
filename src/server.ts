import fastify, { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { env } from "./env";
import { appRoutes } from "./routes";
import { logRequest } from "./utils/log-request";


const app = fastify({
  logger: {
    level: "debug",
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
      }
    }
  },
});

// Hook para capturar erros globais (como body vazio)
app.setErrorHandler(async (error, request, reply) => {
  const clientIpHeader = request.headers["x-forwarded-for"];
  const clientIp =
    typeof clientIpHeader === "string"
      ? clientIpHeader
      : Array.isArray(clientIpHeader)
      ? clientIpHeader[0]
      : request.ip || "unknown";

  await logRequest({
    environment: "GLOBAL",
    ip: clientIp,
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.body,
    error: {
      message: error.message,
      code: error.code,
      stack: error.stack,
    },
  });

  reply.status(error.statusCode ?? 500).send({
    message: error.message,
  });
});

app.register(appRoutes);

app.listen({
  host: "0.0.0.0",
  port: 3333,
}).then(() => console.log(`Server running on port ${env.PORT}`));
