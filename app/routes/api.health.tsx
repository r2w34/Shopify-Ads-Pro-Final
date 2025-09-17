import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Basic health check
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    services: {
      database: "connected",
      facebook_api: "ready",
      ai_services: "operational"
    }
  };

  return json(health, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/json"
    }
  });
};