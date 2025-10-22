import https from "node:https";
import { AltitudeCloud } from "../config/api";

export interface UploadDnclBodyParams {
  doNotCallListName: string,
  number: string,
  token: string,
}

export async function uploadDnclCloud({
  doNotCallListName,
  number,
  token } : UploadDnclBodyParams
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
      }
    };

    const response = await AltitudeCloud.put(
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
      return { status: "duplicate", message: "JA_EXISTE_CLOUD" };
    }

    console.error("❌ Erro ao enviar para Do Not Call List:", apiError ?? error.message);
    return { status: "error", message: apiError ?? error.message };
  }
}
