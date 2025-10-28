import { AltitudeOnPrem } from "../config/api";

export async function removeDnclOnPrem(
  doNotCallListName: string,
  number: string,
  token: string,
) {
  try {
    const bodyRequest = {
      doNotCallListName,
      number,
      discriminator: "DNCL_REMOVER",
    };

    const response = await AltitudeOnPrem.delete(
      "/api/instance/instanceManager/fromDoNotCallList",
      {
        data: bodyRequest,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }
      },
    );

    if (response.status === 200) {
      return { status: "success", message: "OK" };
    }

    return { status: "error", data: response.data };
  } catch (error: any) {
    const apiError = error.response?.data;
    console.error("❌ Erro ao remover da Do Not Call List:", apiError ?? error.message);
    return { status: "error", message: apiError ?? error.message };
  }
}
