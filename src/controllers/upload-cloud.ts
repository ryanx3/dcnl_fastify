import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { uploadDnclCloud } from "../use-cases/upload-dncl-cloud";
import { sendEmail } from "../utils/send-email";
import { saveErrorFile } from "../utils/error-file";
import { authenticateCloud } from "../use-cases/authenticate-cloud";
import { logRequest } from "../utils/log-request";

const createBodySchema = z.object({
  doNotCallListName: z.string().nonempty({ message: "Nome da DNCL é obrigatório" }),
  number: z.string().nonempty({ message: "Número é obrigatório" }),
});


export async function uploadCloudController(
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
    const token = await authenticateCloud();

    const result = await uploadDnclCloud({ doNotCallListName, number, token });

    await logRequest({
      environment: "Cloud",
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
        await sendEmail({
          bodyData: body,
          errorData: result.message,
          environment: "Cloud"
        });
        return reply.status(500).send({ message: "Erro" });
    }

  } catch (error: any) {
    // Log do erro
    await logRequest({
      environment: "Cloud",
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
    await sendEmail({
      bodyData: body,
      errorData: error,
      environment: "Cloud"
    });

    return reply.status(500).send({ message: "Erro" });
  }
}
