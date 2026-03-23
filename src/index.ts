import "dotenv/config";

import fastifySwagger from "@fastify/swagger";

import Fastify from "fastify";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

import { auth } from "./lib/auth.js";
import fastifyCors from "@fastify/cors";
import fastifyApiReference from "@scalar/fastify-api-reference";

import workoutPlanRoutes from "./routes/workout-plan.js";

const app = Fastify({
  logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Treinos API",
      description: "API de treinos",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3030",
        description: "Localhost",
      },
    ],
  },
  transform: jsonSchemaTransform,
});


// precisa colocar await pq funciona de forma assincrona tem que esperar o fastify registrar os plugins pra criar as rotas 

await app.register(fastifyCors, {
  origin: "http://localhost:3000",
  credentials: true,
})

// registro de documentacao com scalar
await app.register(fastifyApiReference, {
  routePrefix: "/docs",
  configuration: {
    sources: [

      {
        title: "Treinos API",
        slug: "treinos-api",
        url: "/swagger.json",
      },
      {
        title: "Auth API",
        slug: "auth-api",
        url: "/api/auth/open-api/generate-schema",
      },
    ],
  },
});


// routes
await app.register(workoutPlanRoutes, { prefix: "/workout-plans" });

// Controller



app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/swagger.json",
  schema: {
    hide: true,
  },

  handler: async () => {
    return app.swagger();
  },
});

app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    try {
      // Construct request URL
      const url = new URL(request.url, `http://${request.headers.host}`);

      // Convert Fastify headers to standard Headers object
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, value.toString());
      });
      // Create Fetch API-compatible request
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });
      // Process authentication request
      const response = await auth.handler(req);
      // Forward response to client
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.send(response.body ? await response.text() : null);
    } catch (error) {
      app.log.error(error);
      reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE"
      });
    }
  }
});

const start = async () => {
  try {
    const port = Number(process.env.PORT);
    await app.listen({ port });
    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
