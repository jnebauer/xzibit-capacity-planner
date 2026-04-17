import {
  AvailabilityRecord,
  CompanyClosure,
  PlanningStaffMember,
  getDateFromISOWeek,
  getWeekRange,
  roundTo,
  startOfIsoWeek,
  toDate,
  toDateString,
} from '@/lib/capacityPlanning';

export interface WeeklyCapacityBreakdown {
  week: string;
  internalCapacity: number;
  contractorCapacity: number;
  totalCapacity: number;
}

export interface CapacityWarning {
  week: string;
  demand: number;
  capacity: number;
  overload: number;
  overloadPercentage: number;
}

function expandDatesInRange(startDate: string, endDate: string): string[] {
  const start = toDate(startDate);
  const end = toDate(endDate);
  if (!start || !end) return [];

  const dates: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const finalDate = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  while (cursor <= finalDate) {
    dates.push(toDateString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function buildClosureDates(closures: CompanyClosure[]): Set<string> {
  const dates = new Set<string>();
  closures.forEach((closure) => {
    expandDatesInRange(closure.startDate, closure.endDate).forEach((date) => dates.add(date));
  });
  return dates;
}

function buildAvailabilityMaps(staff: PlanningStaffMember[]): {
  unavailableDatesByStaff: Map<string, Set<string>>;
  availableDatesByStaff: Map<string, Set<string>>;
} {
  const unavailableDatesByStaff = new Map<string, Set<string>>();
  const availableDatesByStaff = new Map<string, Set<string>>();

  staff.forEach((member) => {
    member.availability.forEach((record: AvailabilityRecord) => {
      const dates = expandDatesInRange(record.startDate, record.endDate);
      const isExplicitAvailability = record.absenceType === 'Available';
      const targetMap = isExplicitAvailability ? availableDatesByStaff : unavailableDatesByStaff;
      const existing = targetMap.get(member.id) || new Set<string>();
      dates.forEach((date) => existing.add(date));
      targetMap.set(member.id, existing);
    });
  });

  return { unavailableDatesByStaff, availableDatesByStaff };
}

function isMemberAvailableOnDate(
  member: PlanningStaffMember,
  dateString: string,
  unavailableDatesByStaff: Map<string, Set<string>>,
  availableDatesByStaff: Map<string, Set<string>>,
  closureDates: Set<string>
): boolean {
  if (closureDates.has(dateString)) {
    return false;
  }

  const unavailableDates = unavailableDatesByStaff.get(member.id);
  const availableDates = availableDatesByStaff.get(member.id);

  if (member.employeeType === 'contractor') {
    const explicitlyAvailable = availableDates?.has(dateString) ?? false;
    const explicitlyUnavailable = unavailableDates?.has(dateString) ?? false;
    return explicitlyAvailable && !explicitlyUnavailable;
  }

  return !(unavailableDates?.has(dateString) ?? false);
}

export function calculateWeeklyCapacity(
  staff: PlanningStaffMember[],
  closures: CompanyClosure[],
  startDate: Date,
  endDate: Date
): WeeklyCapacityBreakdown[] {
  const weeks = getWeekRange(startDate, endDate);
  const closureDates = buildClosureDates(closures);
  const { unavailableDatesByStaff, availableDatesByStaff } = buildAvailabilityMaps(staff);

  return weeks.map((week) => {
    const weekStart = startOfIsoWeek(getDateFromISOWeek(week));
    let internalCapacity = 0;
    let contractorCapacity = 0;

    staff.forEach((member) => {
      let availableDays = 0;

      for (let dayOffset = 0; dayOffset < 5; dayOffset += 1) {
        const checkDate = new Date(weekStart);
        checkDate.setUTCDate(checkDate.getUTCDate() + dayOffset);
        const dateString = toDateString(checkDate);

        if (isMemberAvailableOnDate(member, dateString, unavailableDatesByStaff, availableDatesByStaff, closureDates)) {
          availableDays += 1;
        }
      }

      const weeklyHours = member.dailyHours * member.utilisation * availableDays;
      if (member.employeeType === 'contractor') {
        contractorCapacity += weeklyHours;
      } else {
        internalCapacity += weeklyHours;
      }
    });

    return {
      week,
      internalCapacity: roundTo(internalCapacity),
      contractorCapacity: roundTo(contractorCapacity),
      totalCapacity: roundTo(internalCapacity + contractorCapacity),
    };
  });
}

export function capacityBreakdownToMap(capacity: WeeklyCapacityBreakdown[]): Record<string, number> {
  return capacity.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.week] = item.totalCapacity;
    return accumulator;
  }, {});
}

export function detectCapacityWarnings(
  weeklyDemand: Record<string, number>,
  weeklyCapacity: Record<string, number>
): CapacityWarning[] {
  return Object.entries(weeklyDemand).reduce<CapacityWarning[]>((accumulator, [week, demand]) => {
    const capacity = weeklyCapacity[week] || 0;
    if (demand <= capacity) return accumulator;

    const overload = demand - capacity;
    accumulator.push({
      week,
      demand: roundTo(demand),
      capacity: roundTo(capacity),
      overload: roundTo(overload),
      overloadPercentage: capacity > 0 ? roundTo((overload / capacity) * 100) : 100,
    });
    return accumulator;
  }, []);
}
