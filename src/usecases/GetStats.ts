import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

dayjs.extend(utc);

interface InputDto {
  userId: string;
  from: string;
  to: string;
}

interface OutputDto {
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    { workoutDayCompleted: boolean; workoutDayStarted: boolean }
  >;
  completedWorkoutsCount: number;
  conclusionRate: number;
  totalTimeInSeconds: number;
}

export class GetStats {
  async execute(dto: InputDto): Promise<OutputDto> {
    const fromDate = dayjs(dto.from).utc().startOf("day");
    const toDate = dayjs(dto.to).utc().endOf("day");

    const sessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: { userId: dto.userId },
        },
        startedAt: {
          gte: fromDate.toDate(),
          lte: toDate.toDate(),
        },
      },
    });

    let completedWorkoutsCount = 0;
    let totalTimeInSeconds = 0;
    const consistencyByDay: Record<
      string,
      { workoutDayCompleted: boolean; workoutDayStarted: boolean }
    > = {};

    for (const session of sessions) {
      const sessionDateStr = dayjs(session.startedAt).utc().format("YYYY-MM-DD");
      if (!consistencyByDay[sessionDateStr]) {
        consistencyByDay[sessionDateStr] = {
          workoutDayStarted: false,
          workoutDayCompleted: false,
        };
      }
      
      consistencyByDay[sessionDateStr].workoutDayStarted = true;
      
      if (session.completedAt) {
        consistencyByDay[sessionDateStr].workoutDayCompleted = true;
        completedWorkoutsCount++;
        
        const started = dayjs(session.startedAt);
        const completed = dayjs(session.completedAt);
        const diffInSeconds = completed.diff(started, "second");
        if (diffInSeconds > 0) {
          totalTimeInSeconds += diffInSeconds;
        }
      }
    }

    const conclusionRate =
      sessions.length > 0 ? completedWorkoutsCount / sessions.length : 0;

    const activeWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: { userId: dto.userId, isActive: true },
      include: {
        workoutDays: true,
      },
    });

    let streak = 0;
    if (activeWorkoutPlan) {
      const currentDate = dayjs().utc();
      const weekDaysMap: WeekDay[] = [
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
      ];
      
      const activePlanWeekDays = new Set(
        activeWorkoutPlan.workoutDays.map((d) => d.weekDay)
      );

      const completedSessionsAll = await prisma.workoutSession.findMany({
        where: {
          workoutDay: { workoutPlan: { userId: dto.userId } },
          completedAt: { not: null },
        },
        select: { startedAt: true },
      });

      const completedDatesSet = new Set(
        completedSessionsAll.map((s) => dayjs(s.startedAt).utc().format("YYYY-MM-DD"))
      );

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
    }

    return {
      workoutStreak: streak,
      consistencyByDay,
      completedWorkoutsCount,
      conclusionRate,
      totalTimeInSeconds,
    };
  }
}
