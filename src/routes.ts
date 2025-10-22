import { FastifyInstance } from "fastify";
import { uploadCloudController } from "./controllers/upload-cloud";
import { uploadOnPremController } from "./controllers/upload-on-prem";

export function appRoutes(app: FastifyInstance) { 
  app.post("/upload-dncl-cloud", uploadCloudController)
  app.post("/upload-dncl-on-prem", uploadOnPremController)
}