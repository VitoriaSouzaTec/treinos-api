import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

interface InputDto {
    userId: string;
    name: string;
    workoutDays: Array<{
        name: string;
        weekDay: WeekDay;
        isRest: boolean;
        estimatedDurationInSeconds: number;
        coverImageUrl?: string;
        exercises: Array<{
            name: string;
            order: number;
            sets: number;
            reps: number;
            restTimeInSeconds: number;
        }>;
    }>;
}

interface OutputDto {
    id: string;
    name: string;
    workoutDays: Array<{
        name: string;
        weekDay: WeekDay;
        isRest: boolean;
        estimatedDurationInSeconds: number;
        coverImageUrl?: string;
        exercises: Array<{
            name: string;
            order: number;
            sets: number;
            reps: number;
            restTimeInSeconds: number;
        }>;
    }>;
}

export class CreateWorkoutPlan {
    async execute(dto: InputDto): Promise<OutputDto> {
        return await prisma.$transaction(async (tx) => {
            const existWorkoutPlan = await tx.workoutPlan.findFirst({
                where: { userId: dto.userId, isActive: true },
            });

            if (existWorkoutPlan) {
                await tx.workoutPlan.update({
                    where: { id: existWorkoutPlan.id },
                    data: { isActive: false },
                });
            }

            const workoutPlan = await tx.workoutPlan.create({
                data: {
                    userId: dto.userId,
                    name: dto.name,
                    workoutDays: {
                        create: dto.workoutDays.map((day) => ({
                            name: day.name,
                            weekDay: day.weekDay,
                            isRest: day.isRest,
                            estimatedDurationInSeconds: day.estimatedDurationInSeconds,
                            coverImageUrl: day.coverImageUrl,
                            exercises: {
                                create: day.exercises.map((exercise) => ({
                                    name: exercise.name,
                                    order: exercise.order,
                                    sets: exercise.sets,
                                    reps: exercise.reps,
                                    restTimeInSeconds: exercise.restTimeInSeconds,
                                })),
                            },
                        })),
                    },
                },
                include: {
                    workoutDays: {
                        include: {
                            exercises: true,
                        },
                    },
                },
            });

            return {
                id: workoutPlan.id,
                name: workoutPlan.name,
                workoutDays: workoutPlan.workoutDays.map((day) => ({
                    name: day.name,
                    weekDay: day.weekDay,
                    isRest: day.isRest,
                    estimatedDurationInSeconds: day.estimatedDurationInSeconds,
                    coverImageUrl: day.coverImageUrl ?? undefined,
                    exercises: day.exercises.map((exercise) => ({
                        name: exercise.name,
                        order: exercise.order,
                        sets: exercise.sets,
                        reps: exercise.reps,
                        restTimeInSeconds: exercise.restTimeInSeconds,
                    })),
                })),
            };
        });
    }
}