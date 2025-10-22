import https from "node:https";
import { AltitudeOnPrem } from "../config/api";

export async function uploadDnclOnPrem(
  doNotCallListName: string,
  number: string,
  token: string,
) {
  try {
    const bodyRequest = {
      doNotCallListName,
      number,
      discriminator: "DNCL_LOADER",
    };

    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await AltitudeOnPrem.put(
      "/api/instance/instanceManager/addToDoNotCallList",
      bodyRequest,
      config
    );

    if (response.status === 200) {
      return { status: "success", message: "OK" };
    }

    return { status: "error", data: response.data };
  } catch (error: any) {
    const apiError = error.response?.data;

    if (apiError?.code === "DuplicateKey") {
      return { status: "duplicate", message: "JA_EXISTE_ON_PREM" };
    }

    console.error("❌ Erro ao enviar para Do Not Call List:", apiError ?? error.message);
    return { status: "error", message: apiError ?? error.message };
  }
}
