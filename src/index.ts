import "dotenv/config";

import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import z from "zod";

const app = Fastify({
  logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(fastifySwagger,{
  openapi:{
    info:{
      title:"Treinos API",
      description:"API de treinos",
      version:"1.0.0",
    },
    servers:[
      {
        url:"http://localhost:3030",
        description:"Localhost",
      },
    ],
  },
  transform:jsonSchemaTransform,
});

await app.register(fastifySwaggerUi,{
  routePrefix:"/docs",
})

// precisa colocar await pq funciona de forma assincrona tem que esperar o fastify registrar os plugins pra criar as rotas 

app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/",
  schema: {
    description: "Hello world",
    tags: ["Hello World"],
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  },
  handler: async () => {
    return {
      message: "Hello World",
    };
  },
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333;
    await app.listen({ port });
    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
