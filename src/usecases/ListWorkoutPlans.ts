import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
}

interface OutputDto {
  id: string;
  name: string;
  isActive: boolean;
}

export class ListWorkoutPlans {
  async execute(dto: InputDto): Promise<OutputDto[]> {
    const plans = await prisma.workoutPlan.findMany({
      where: { userId: dto.userId, isActive: true },
    });

    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      isActive: plan.isActive,
    }));
  }
}
