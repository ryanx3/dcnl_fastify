import axios from "axios";
import { env } from "../env";
import { AltitudeOnPrem } from "../config/api";

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

export async function authenticateOnPrem() {
  try {
    const bodyRequest = new URLSearchParams({
      username: env.USER_ON_PREM,
      password: env.PASSWORD_ON_PREM,
      grant_type: "password",
      instanceaddress: env.INSTANCE_ON_PREM,
      secureaccess: "false",
      authenticationType: "Uci",
      forced: "true",
      operation: "login",
    });

    const config: Parameters<typeof axios.post>[2] = {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    };

    const response = await AltitudeOnPrem.post<TokenResponse>(
      "/token",
      bodyRequest,
      config
    );

    return response.data.access_token;
  } catch (error: any) {
    if (axios.isAxiosError<TokenErrorResponse>(error)) {
      const apiError = error.response?.data

      if (apiError?.error_description?.includes('AuthenticationFailed')) {
        throw new Error('Usuário ou senha incorretos no Altitude Cloud.')
      }

      console.error(
        'Altitude OnPrem auth error:',
        error.response?.data,
        error.response?.status,
      )

      throw new Error(
        apiError?.error_description ?? 'Erro ao autenticar com o Altitude On Premise.',
      )
    }

    console.error(error)
    throw new Error('Erro desconhecido ao tentar autenticar com o Altitude.')
  }
  }