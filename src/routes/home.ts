import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { NotFoundError } from "../errors/index.js";
import { auth } from "../lib/auth.js";
import { ErrorSchema, getHomeInfoResponseSchema } from "../schemas/index.js";
import { GetHomeInfo } from "../usecases/GetHomeInfo.js";

const homeRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:date",
    schema: {
      tags: ["Home"],
      summary: "Get home page info for the user",
      params: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
      }),
      response: {
        200: getHomeInfoResponseSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        if (!session) {
          return reply.status(401).send({
            error: "Unauthorized",
            code: "UNAUTHORIZED",
          });
        }
        
        const getHomeInfo = new GetHomeInfo();
        const result = await getHomeInfo.execute({
          userId: session.user.id,
          date: request.params.date,
        });
        
        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: error.message,
            code: "NOT_FOUND_ERROR",
          });
        }
        return reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });
};

export default homeRoutes;
