import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

interface Dto {
    userId: string;
    name: string;
    workoutDays: Array<{
        name: string;
        weekDay: WeekDay;
        isRestDay: boolean;
        estimatedDurationMinutes: number;
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
    async execute(dto: Dto) {
        const result = await prisma.$transaction(async (tx) => {
            const existWorkoutPlan = await tx.workoutPlan.findFirst({
                where: { userId: dto.userId, isActive: true },
            });

            //   transiction - atomicidade

            if (existWorkoutPlan) {
                await tx.workoutPlan.update({
                    where: { id: existWorkoutPlan.id },
                    data: { isActive: false },
                });
            }

            return await tx.workoutPlan.create({
                data: {
                    userId: dto.userId,
                    name: dto.name,
                    workoutDays: {
                        create: dto.workoutDays.map((day) => ({
                            name: day.name,
                            weekDay: day.weekDay,
                            isRest: day.isRestDay,
                            estimatedDurationInSeconds: day.estimatedDurationMinutes * 60,
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
            });
        });

        return result;
    }
}