import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
}

interface OutputDto {
  id: string;
  name: string;
  weightInGrams?: number;
  heightInCentimeters?: number;
  age?: number;
  bodyFatPercentage?: number;
}

export class GetUserTrainData {
  async execute(dto: InputDto): Promise<OutputDto | null> {
    const user = await prisma.user.findUnique({
      where: { id: dto.userId },
      select: {
        id: true,
        name: true,
        weightInGrams: true,
        heightInCentimeters: true,
        age: true,
        bodyFatPercentage: true,
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (!user.weightInGrams && !user.heightInCentimeters && !user.age && !user.bodyFatPercentage) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      weightInGrams: user.weightInGrams ?? undefined,
      heightInCentimeters: user.heightInCentimeters ?? undefined,
      age: user.age ?? undefined,
      bodyFatPercentage: user.bodyFatPercentage ?? undefined,
    };
  }
}
