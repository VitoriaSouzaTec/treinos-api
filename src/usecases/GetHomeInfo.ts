import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { NotFoundError } from "../errors/index.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

dayjs.extend(utc);

interface InputDto {
  userId: string;
  date: string;
}

interface OutputDto {
  activeWorkoutPlanId: string;
  todayWorkoutDay: {
    workoutPlanId: string;
    id: string;
    name: string;
    isRest: boolean;
    weekDay: string;
    estimatedDurationInSeconds: number;
    coverImageUrl?: string;
    exercisesCount: number;
  } | null;
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    { workoutDayCompleted: boolean; workoutDayStarted: boolean }
  >;
}

export class GetHomeInfo {
  async execute(dto: InputDto): Promise<OutputDto> {
    const activeWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: { userId: dto.userId, isActive: true },
      include: {
        workoutDays: {
          include: {
            exercises: true,
          },
        },
      },
    });

    if (!activeWorkoutPlan) {
      throw new NotFoundError("No active workout plan found");
    }

    const currentDate = dayjs(dto.date).utc();
    const dayOfWeekIndex = currentDate.day();
    const weekDaysMap: WeekDay[] = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ];
    const currentWeekDay = weekDaysMap[dayOfWeekIndex];

    const todayWorkoutDayRaw = activeWorkoutPlan.workoutDays.find(
      (day) => day.weekDay === currentWeekDay
    );

    let todayWorkoutDay = null;
    if (todayWorkoutDayRaw) {
      todayWorkoutDay = {
        workoutPlanId: activeWorkoutPlan.id,
        id: todayWorkoutDayRaw.id,
        name: todayWorkoutDayRaw.name,
        isRest: todayWorkoutDayRaw.isRest,
        weekDay: todayWorkoutDayRaw.weekDay,
        estimatedDurationInSeconds: todayWorkoutDayRaw.estimatedDurationInSeconds,
        coverImageUrl: todayWorkoutDayRaw.coverImageUrl ?? undefined,
        exercisesCount: todayWorkoutDayRaw.exercises.length,
      };
    }

    const startOfWeek = currentDate.startOf("week");
    const endOfWeek = currentDate.endOf("week");

    const weekSessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: { userId: dto.userId },
        },
        startedAt: {
          gte: startOfWeek.toDate(),
          lte: endOfWeek.toDate(),
        },
      },
    });

    const consistencyByDay: Record<
      string,
      { workoutDayCompleted: boolean; workoutDayStarted: boolean }
    > = {};

    for (let i = 0; i <= 6; i++) {
        const dateStr = startOfWeek.add(i, "day").format("YYYY-MM-DD");
        consistencyByDay[dateStr] = {
          workoutDayCompleted: false,
          workoutDayStarted: false,
        };
    }

    for (const session of weekSessions) {
      const sessionDateStr = dayjs(session.startedAt).utc().format("YYYY-MM-DD");
      if (consistencyByDay[sessionDateStr]) {
        consistencyByDay[sessionDateStr].workoutDayStarted = true;
        if (session.completedAt) {
          consistencyByDay[sessionDateStr].workoutDayCompleted = true;
        }
      }
    }

    const activePlanWeekDays = new Set(
      activeWorkoutPlan.workoutDays.map((d) => d.weekDay)
    );

    const completedSessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: { workoutPlan: { userId: dto.userId } },
        completedAt: { not: null },
      },
      select: { startedAt: true },
    });

    const completedDatesSet = new Set(
      completedSessions.map((s) => dayjs(s.startedAt).utc().format("YYYY-MM-DD"))
    );

    let streak = 0;
    let daysToLookBack = 0;
    let streakBroken = false;

    while (!streakBroken && daysToLookBack < 365) {
      const checkDate = currentDate.subtract(daysToLookBack, "day");
      const checkDateStr = checkDate.format("YYYY-MM-DD");
      const checkWeekDay = weekDaysMap[checkDate.day()];

      if (activePlanWeekDays.has(checkWeekDay)) {
        if (completedDatesSet.has(checkDateStr)) {
          streak++;
        } else {
          if (daysToLookBack !== 0) {
            streakBroken = true;
          }
        }
      }
      daysToLookBack++;
    }

    return {
      activeWorkoutPlanId: activeWorkoutPlan.id,
      todayWorkoutDay,
      workoutStreak: streak,
      consistencyByDay,
    };
  }
}
