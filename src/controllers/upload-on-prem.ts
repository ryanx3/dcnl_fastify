import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { sendEmailUpload } from "../utils/send-email-upload";
import { saveErrorFile } from "../utils/error-file";
import { logRequest } from "../utils/log-request";
import { uploadDnclOnPrem } from "../use-cases/upload-dncl-on-premise";
import { authenticateOnPrem } from "../use-cases/authenticate-on-prem";
import { env } from "../env";

const createBodySchema = z.object({
  doNotCallListName: z.string().nonempty({ message: "Nome da DNCL é obrigatório" }),
  number: z.string().nonempty({ message: "Número é obrigatório" }),
});


export async function uploadOnPremController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = request.body ?? {};
  const clientIpHeader = request.headers["x-forwarded-for"];
  const clientIp =
    typeof clientIpHeader === "string"
      ? clientIpHeader
      : Array.isArray(clientIpHeader)
        ? clientIpHeader[0]
        : request.ip || "unknown";

  try {
    const { doNotCallListName, number } = createBodySchema.parse(body);
    const token = await authenticateOnPrem({ username: env.USER_ON_PREM, password: env.PASSWORD_ON_PREM });

    const result = await uploadDnclOnPrem(doNotCallListName, number, token);

    await logRequest({
      environment: "OnPremise",
      ip: clientIp,
      method: request.method,
      url: request.url,
      headers: request.headers,
      body,
      response: result,
    });

    switch (result.status) {
      case "success":
        return reply.status(200).send({ message: result.message });
      case "duplicate":
        return reply.status(400).send({ message: result.message });
      case "error":
      default:
        await saveErrorFile(result.message, body);
        await sendEmailUpload({
          bodyData: body,
          errorData: result.message,
          environment: "OnPremise"
        });
        return reply.status(500).send({ message: "Erro" });
    }

  } catch (error: any) {
    await logRequest({
      environment: "OnPremise",
      ip: clientIp,
      method: request.method,
      url: request.url,
      headers: request.headers,
      body,
      error: error instanceof Error ? error.message : error,
    });

    if (error instanceof z.ZodError) {
      const issues = error.issues.map((err) => ({
        field: err.path.join(".") || "body",
        message: err.message,
      }));
      return reply.status(400).send({
        message: "Validation error",
        issues,
      });
    }

    await saveErrorFile(error, body);
    await sendEmailUpload({
      bodyData: body,
      errorData: error,
      environment: "OnPremise"
    });

    return reply.status(500).send({ message: "Erro" });
  }
}
