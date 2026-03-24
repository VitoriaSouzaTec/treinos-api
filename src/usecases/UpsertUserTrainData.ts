import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
  weightInGrams?: number;
  heightInCentimeters?: number;
  age?: number;
  bodyFatPercentage?: number;
}

interface OutputDto {
  id: string;
  name: string;
  weightInGrams?: number;
  heightInCentimeters?: number;
  age?: number;
  bodyFatPercentage?: number;
}

export class UpsertUserTrainData {
  async execute(dto: InputDto): Promise<OutputDto> {
    const user = await prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const updatedUser = await prisma.user.update({
      where: { id: dto.userId },
      data: {
        ...(dto.weightInGrams && { weightInGrams: dto.weightInGrams }),
        ...(dto.heightInCentimeters && { heightInCentimeters: dto.heightInCentimeters }),
        ...(dto.age && { age: dto.age }),
        ...(dto.bodyFatPercentage && { bodyFatPercentage: dto.bodyFatPercentage }),
      },
    });

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      weightInGrams: updatedUser.weightInGrams ?? undefined,
      heightInCentimeters: updatedUser.heightInCentimeters ?? undefined,
      age: updatedUser.age ?? undefined,
      bodyFatPercentage: updatedUser.bodyFatPercentage ?? undefined,
    };
  }
}
