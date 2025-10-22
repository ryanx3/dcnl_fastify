import axios from "axios";
import https from "node:https";
import { env } from "../env";
import { AltitudeCloud } from "../config/api";

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
}

interface TokenErrorResponse {
  error: string
  error_description: string
}

export async function authenticateCloud() {
  try {
    const bodyRequest = new URLSearchParams({
      username: env.USER_CLOUD,
      password: env.PASSWORD_CLOUD,
      grant_type: "password",
      instanceaddress: env.INSTANCE_CLOUD,
      secureaccess: "false",
      authenticationType: "Uci",
      forced: "true",
      operation: "login",
    });

    const config: Parameters<typeof axios.post>[2] = {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    };

    const response = await AltitudeCloud.post<TokenResponse>(
      "/token",
      bodyRequest,
      config
    );

    return response.data.access_token
  } catch (error: any) {
    if (axios.isAxiosError<TokenErrorResponse>(error)) {
      const apiError = error.response?.data

      if (apiError?.error_description?.includes('AuthenticationFailed')) {
        throw new Error('Usuário ou senha incorretos no Altitude Cloud.')
      }

      console.error(
        'Altitude Cloud auth error:',
        error.response?.data,
        error.response?.status,
      )

      throw new Error(
        apiError?.error_description ?? 'Erro ao autenticar com o Altitude.',
      )
    }

    console.error(error)
    throw new Error('Erro desconhecido ao tentar autenticar com o Altitude.')
  }
}

