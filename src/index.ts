import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "dotenv";
import { registerSearchRoute } from "./routes/search.js";
import { registerResolveRoute } from "./routes/resolve.js";
import { registerIngestRoute } from "./routes/ingest.js";

config();

const app = Fastify({ logger: true });

// CORS for your UI
await app.register(cors, {
  origin: true, // allow http://localhost:* by default
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});

app.get("/", async () => ({ ok: true }));

await registerSearchRoute(app);
await registerResolveRoute(app);
await registerIngestRoute(app);

const port = Number(process.env.PORT || 8080);
app.listen({ port, host: "0.0.0.0" })
  .then(addr => app.log.info(`Server listening on ${addr}`))
  .catch(err => { app.log.error(err); process.exit(1); });
