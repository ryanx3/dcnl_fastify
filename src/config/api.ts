import axios from "axios";
import https from "node:https";

export const AltitudeCloud = axios.create({
  baseURL: "https://pluricall.altitudecloud.com/uAgentWeb8",
    httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
})

export const AltitudeOnPrem = axios.create({
  baseURL: "https://agent.tejo.cc/uAgentWeb8",
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});