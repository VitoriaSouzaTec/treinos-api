import z from "zod"

import { WeekDay } from "../generated/prisma/enums.js"

export const ErrorSchema = z.object({
    error: z.string(),
    code: z.string(),
})

export const workoutPlanSchema = z.object({
    id: z.uuid(),
    name: z.string().trim().min(1),
    workoutDays: z.array(
        z.object({
            name: z.string().trim().min(1),
            weekDay: z.enum(WeekDay),
            isRest: z.boolean().default(false),
            estimatedDurationInSeconds: z.number().min(1),
            coverImageUrl: z.string().url().optional(),
            exercises: z.array(
                z.object({
                    order: z.number().min(0),
                    name: z.string().trim().min(1),
                    sets: z.number().min(1),
                    reps: z.number().min(1),
                    restTimeInSeconds: z.number().min(1),
                })
            ),
        })
    ),
})

export const startWorkoutSessionResponseSchema = z.object({
    userWorkoutSessionId: z.string().uuid(),
})

export const updateWorkoutSessionBodySchema = z.object({
    completedAt: z.string().datetime(), // ISO 8601 string
})

export const updateWorkoutSessionResponseSchema = z.object({
    id: z.string().uuid(),
    completedAt: z.string().datetime(),
    startedAt: z.string().datetime(),
})