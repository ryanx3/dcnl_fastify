import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import sql from "mssql";

import { authenticateCloud } from "../use-cases/authenticate-cloud";
import { authenticateOnPrem } from "../use-cases/authenticate-on-prem";
import { removeDnclCloud } from "../use-cases/remove-dncl-cloud";
import { removeDnclOnPrem } from "../use-cases/remove-dncl-on-premise";
import { sendEmailRemove } from "../utils/send-email-remove";
import { saveErrorFile } from "../utils/error-file";
import { logRequest } from "../utils/log-request";
import { connectPumaDb } from "../databases/puma";

const bodySchema = z.object({
  doNotCallListName: z.string().nonempty(),
  number: z.string().nonempty(),
  cloud: z
    .object({
      username: z.string().nonempty(),
      password: z.string().nonempty(),
    })
    .optional(),
  onPrem: z
    .object({
      username: z.string().nonempty(),
      password: z.string().nonempty(),
    })
    .optional(),
});

type LogStatus = "OK" | "ERROR" | null;
type FinalStatus = "OK" | "PARTIAL" | "ERROR";

async function saveRemovalLogToDb(data: {
  phone_number: string;
  dncl_list_name: string;
  login_cloud?: string | null;
  login_onprem?: string | null;
  cloud_status?: LogStatus;
  onprem_status?: LogStatus;
  status: FinalStatus;
}) {
  const pool = await connectPumaDb("easy8");
  await pool.request()
    .input("phone_number", sql.VarChar(20), data.phone_number)
    .input("dncl_list_name", sql.VarChar(255), data.dncl_list_name)
    .input("login_cloud", sql.VarChar(100), data.login_cloud ?? null)
    .input("login_onprem", sql.VarChar(100), data.login_onprem ?? null)
    .input("cloud_status", sql.VarChar(10), data.cloud_status ?? null)
    .input("onprem_status", sql.VarChar(10), data.onprem_status ?? null)
    .input("status", sql.VarChar(20), data.status)
    .query(`
      INSERT INTO plc_dncl_removed
        (phone_number, dncl_list_name, login_cloud, login_onprem, cloud_status, onprem_status, status)
      VALUES
        (@phone_number, @dncl_list_name, @login_cloud, @login_onprem, @cloud_status, @onprem_status, @status)
    `);
}

function resolveFinalStatus(cloudStatus: LogStatus, onPremStatus: LogStatus): FinalStatus {
  if (cloudStatus === "OK" && onPremStatus === "OK") return "OK";
  if (cloudStatus === "OK" || onPremStatus === "OK") return "PARTIAL";
  return "ERROR";
}

export async function removeAllController(
  request: FastifyRequest,
  reply: FastifyReply
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
    const { doNotCallListName, number, cloud, onPrem } = bodySchema.parse(body);

    if (!cloud && !onPrem) {
      return reply.status(400).send({
        message: "É necessário informar credentials Cloud ou OnPrem",
      });
    }

    const results: any = {};
    const errors: any[] = [];

    let cloudStatus: LogStatus = null;
    let onPremStatus: LogStatus = null;

    if (cloud) {
      try {
        const tokenCloud = await authenticateCloud(cloud);
        const r = await removeDnclCloud({ doNotCallListName, number, token: tokenCloud });
        results.cloud = r;
        cloudStatus = r?.status === "success" ? "OK" : "ERROR";
      } catch (err) {
        cloudStatus = "ERROR";
        errors.push({ env: "Cloud", error: err });
      }
    }

    if (onPrem) {
      try {
        const tokenOnPrem = await authenticateOnPrem(onPrem);
        const r = await removeDnclOnPrem(doNotCallListName, number, tokenOnPrem);
        results.onPrem = r;
        onPremStatus = r?.status === "success" ? "OK" : "ERROR";
      } catch (err) {
        onPremStatus = "ERROR";
        errors.push({ env: "OnPremise", error: err });
      }
    }

    // compute final status
    const finalStatus = resolveFinalStatus(cloudStatus, onPremStatus);

    // save log to DB (no passwords)
    try {
      await saveRemovalLogToDb({
        phone_number: number,
        dncl_list_name: doNotCallListName,
        login_cloud: cloud?.username ?? null,
        login_onprem: onPrem?.username ?? null,
        cloud_status: cloudStatus,
        onprem_status: onPremStatus,
        status: finalStatus,
      });
    } catch (dbErr) {
      // não falhar a operação por causa do log, mas salve erro de log
      console.error("Erro ao salvar log no DB:", dbErr);
      await saveErrorFile(dbErr, { body });
      // opcional: enviar email sobre falha de log
      await sendEmailRemove({
        bodyData: body,
        errorData: dbErr,
        environment: "Logging",
      });
    }

    // request logging (arquivo / monitoring)
    await logRequest({
      environment: "Unified",
      ip: clientIp,
      method: request.method,
      url: request.url,
      headers: request.headers,
      body,
      response: results,
    });

    // respostas ao cliente
    if (errors.length === 0) {
      return reply.status(200).send({ message: "Remoção concluída", results });
    }

    for (const e of errors) {
      await saveErrorFile(e.error, body);
      await sendEmailRemove({
        bodyData: body,
        errorData: e.error,
        environment: e.env,
      });
    }

    return reply.status(207).send({
      message: "Remoção parcialmente concluída",
      success: results,
      failed: errors,
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        message: "Validation error",
        issues: error.format(),
      });
    }

    await saveErrorFile(error, body);
    await sendEmailRemove({
      bodyData: body,
      errorData: error,
      environment: "Unified",
    });

    return reply.status(500).send({ message: "Erro interno" });
  }
}
