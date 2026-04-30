import "dotenv/config";

import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifyApiReference from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

import { auth } from "./lib/auth.js";
import aiRoutes from "./routes/ai.js";
import homeRoutes from "./routes/home.js";
import { meRoutes } from "./routes/me.js";
import statsRoutes from "./routes/stats.js";
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
await app.register(aiRoutes, { prefix: "/ai" });
await app.register(homeRoutes, { prefix: "/home" });
await app.register(statsRoutes, { prefix: "/stats" });
await app.register(meRoutes, { prefix: "/me" });
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
  schema: {
    hide: true,
  },
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
      
      
      for (const [key, value] of response.headers.entries()) {
        if (key.toLowerCase() === 'set-cookie') {
         
          continue;
        }
        reply.header(key, value);
      }
      

      const setCookies = (response.headers as any).getSetCookie?.() || response.headers.get('set-cookie');
      if (setCookies) {
        if (Array.isArray(setCookies)) {
          setCookies.forEach(cookie => reply.header('set-cookie', cookie));
        } else {
          reply.header('set-cookie', setCookies);
        }
      }

      const body = await response.text();
      reply.send(body || null);
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
