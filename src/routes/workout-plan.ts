import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { NotFoundError, SessionAlreadyStartedError, WorkoutPlanNotActiveError } from "../errors/index.js";
import { auth } from "../lib/auth.js";
import { ErrorSchema, getWorkoutPlanByIdResponseSchema, startWorkoutSessionResponseSchema, updateWorkoutSessionBodySchema, updateWorkoutSessionResponseSchema, workoutPlanSchema } from "../schemas/index.js";
import { CreateWorkoutPlan } from "../usecases/CreateWorkoutPlan.js";
import { GetWorkoutPlanById } from "../usecases/GetWorkoutPlanById.js";
import { StartWorkoutSession } from "../usecases/StartWorkoutSession.js";
import { UpdateWorkoutSession } from "../usecases/UpdateWorkoutSession.js";
const workoutPlanRoutes = async (app: FastifyInstance) => {
    app.withTypeProvider<ZodTypeProvider>().route({
  method: "POST",
  url: "/",
  schema: {
    body: workoutPlanSchema.omit({ id: true }),
 response: {
      201: workoutPlanSchema,
      400: ErrorSchema,
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
      const createWorkoutPlan = new CreateWorkoutPlan();
      const result = await createWorkoutPlan.execute({
        userId: session.user.id,
        name: request.body.name,
        workoutDays: request.body.workoutDays,
      });
      return reply.status(201).send(result);
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

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/:id/days/:dayId/sessions",
    schema: {
      tags: ["Workout Plan"],
      summary: "Start a workout session for a given day",
      params: z.object({
        id: z.string().uuid(),
        dayId: z.string().uuid(),
      }),
      response: {
        201: startWorkoutSessionResponseSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
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
        const startWorkoutSession = new StartWorkoutSession();
        const result = await startWorkoutSession.execute({
          userId: session.user.id,
          planId: request.params.id,
          dayId: request.params.dayId,
        });
        return reply.status(201).send(result);
      } catch (error) {
        app.log.error(error);
        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: error.message,
            code: "NOT_FOUND_ERROR",
          });
        }
        if (error instanceof WorkoutPlanNotActiveError) {
          return reply.status(400).send({
            error: error.message,
            code: "BAD_REQUEST_ERROR",
          });
        }
        if (error instanceof SessionAlreadyStartedError) {
          return reply.status(409).send({
            error: error.message,
            code: "CONFLICT_ERROR",
          });
        }
        return reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "PATCH",
    url: "/:id/days/:dayId/sessions/:sessionId",
    schema: {
      tags: ["Workout Plan"],
      summary: "Update/Complete a workout session",
      params: z.object({
        id: z.string().uuid(),
        dayId: z.string().uuid(),
        sessionId: z.string().uuid(),
      }),
      body: updateWorkoutSessionBodySchema,
      response: {
        200: updateWorkoutSessionResponseSchema,
        400: ErrorSchema,
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
        const updateWorkoutSession = new UpdateWorkoutSession();
        const result = await updateWorkoutSession.execute({
          userId: session.user.id,
          planId: request.params.id,
          dayId: request.params.dayId,
          sessionId: request.params.sessionId,
          completedAt: request.body.completedAt,
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
        if (error instanceof WorkoutPlanNotActiveError) {
          return reply.status(400).send({
            error: error.message,
            code: "BAD_REQUEST_ERROR",
          });
        }
        return reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:id",
    schema: {
      tags: ["Workout Plan"],
      summary: "Get a workout plan by id",
      params: z.object({
        id: z.string().uuid(),
      }),
      response: {
        200: getWorkoutPlanByIdResponseSchema,
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
        const getWorkoutPlan = new GetWorkoutPlanById();
        const result = await getWorkoutPlan.execute({
          userId: session.user.id,
          planId: request.params.id,
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
}

export default workoutPlanRoutes;
