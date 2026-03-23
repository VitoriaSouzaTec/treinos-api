import { NotFoundError, SessionAlreadyStartedError,WorkoutPlanNotActiveError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

// Data Transfer Object
interface InputDto {
  userId: string;
  planId: string;
  dayId: string;
}

interface OutputDto {
  userWorkoutSessionId: string;
}

export class StartWorkoutSession {
  async execute(dto: InputDto): Promise<OutputDto> {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { id: dto.planId },
      include: { workoutDays: true },
    });

    if (!workoutPlan) {
      throw new NotFoundError("Workout plan not found");
    }

    if (workoutPlan.userId !== dto.userId) {
      throw new NotFoundError("Workout plan not found");
    }

    if (!workoutPlan.isActive) {
      throw new WorkoutPlanNotActiveError("Workout plan is not active");
    }

    const workoutDay = workoutPlan.workoutDays.find(
      (day) => day.id === dto.dayId
    );

    if (!workoutDay) {
      throw new NotFoundError("Workout day not found in this plan");
    }

    const activeSession = await prisma.workoutSession.findFirst({
      where: {
        workoutDayId: dto.dayId,
        completedAt: null,
      },
    });

    if (activeSession) {
      throw new SessionAlreadyStartedError("A session is already started for this day");
    }

    const newSession = await prisma.workoutSession.create({
      data: {
        workoutDayId: dto.dayId,
        startedAt: new Date(),
      },
    });

    return {
      userWorkoutSessionId: newSession.id,
    };
  }
}
