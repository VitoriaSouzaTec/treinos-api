import z from "zod"

import { WeekDay } from "../generated/prisma/enums.js"

export const ErrorSchema = z.object({
    error: z.string(),
    code: z.string(),
})

export const workoutPlanSchema = z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(1),
    workoutDays: z.array(
        z.object({
            name: z.string().trim().min(1),
            weekDay: z.enum(WeekDay),
            isRest: z.boolean().default(false),
            estimatedDurationInSeconds: z.number().min(1),
            coverImageUrl: z.string().optional(),
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

export const getHomeInfoResponseSchema = z.object({
    activeWorkoutPlanId: z.string().uuid(),
    todayWorkoutDay: z.object({
        workoutPlanId: z.string().uuid(),
        id: z.string().uuid(),
        name: z.string(),
        isRest: z.boolean(),
        weekDay: z.string(),
        estimatedDurationInSeconds: z.number(),
        coverImageUrl: z.string().optional(),
        exercisesCount: z.number(),
    }).nullable(),
    workoutStreak: z.number(),
    consistencyByDay: z.record(
        z.string(),
        z.object({
            workoutDayCompleted: z.boolean(),
            workoutDayStarted: z.boolean(),
        })
    )
})

export const getWorkoutPlanByIdResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    workoutDays: z.array(
        z.object({
            id: z.string().uuid(),
            weekDay: z.string(),
            name: z.string(),
            isRest: z.boolean(),
            coverImageUrl: z.string().optional(),
            estimatedDurationInSeconds: z.number(),
            exercisesCount: z.number(),
        })
    )
})

export const getWorkoutDayByIdResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    isRest: z.boolean(),
    coverImageUrl: z.string().optional(),
    estimatedDurationInSeconds: z.number(),
    exercises: z.array(z.object({
        id: z.string().uuid(),
        name: z.string(),
        order: z.number(),
        workoutDayId: z.string().uuid(),
        sets: z.number(),
        reps: z.number(),
        restTimeInSeconds: z.number(),
    })),
    weekDay: z.string(),
    sessions: z.array(z.object({
        id: z.string().uuid(),
        workoutDayId: z.string().uuid(),
        startedAt: z.string().datetime().optional(),
        completedAt: z.string().datetime().optional(),
    })),
})

export const getStatsQuerySchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
})

export const getStatsResponseSchema = z.object({
    workoutStreak: z.number(),
    consistencyByDay: z.record(
        z.string(),
        z.object({
            workoutDayCompleted: z.boolean(),
            workoutDayStarted: z.boolean(),
        })
    ),
    completedWorkoutsCount: z.number(),
    conclusionRate: z.number(),
    totalTimeInSeconds: z.number(),
})