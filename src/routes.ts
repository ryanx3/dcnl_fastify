import { FastifyInstance } from "fastify";
import { uploadCloudController } from "./controllers/upload-cloud";
import { uploadOnPremController } from "./controllers/upload-on-prem";
import { removeAllController } from "./controllers/remove-all";

export function appRoutes(app: FastifyInstance) { 
  app.post("/upload-dncl-cloud", uploadCloudController)
  app.post("/upload-dncl-on-prem", uploadOnPremController)
  app.delete("/remove-all", removeAllController)
}