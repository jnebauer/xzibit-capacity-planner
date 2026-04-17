import { describe, expect, it } from 'vitest';
import { calculateWeeklyCapacity } from '@/lib/capacityEngine';
import { getWeekRange, PlanningCurve, PlanningProject, PlanningStaffMember } from '@/lib/capacityPlanning';
import { aggregateDemandForProjects } from '@/lib/rulesEngine';

describe('Phase 1 demand engine', () => {
  it('allocates project hours through the selected curve and respects the probability threshold', () => {
    const planningWeeks = getWeekRange(new Date('2026-01-05'), new Date('2026-02-02'));

    const flatCurve: PlanningCurve = {
      curveId: 'custom-build-flat-v1',
      version: 'v1.0.0',
      jobType: 'Custom Build',
      taskType: 'Build',
      weeklyPercentages: JSON.stringify({
        progressValues: Array.from({ length: 100 }, (_, index) => (index + 1) / 100),
        curveValues: Array.from({ length: 100 }, () => 1),
        normalizationValue: 100,
      }),
    };

    const includedProject: PlanningProject = {
      id: 'project-1',
      jobNumber: 'J001',
      jobName: 'Included project',
      jobType: 'Custom Build',
      probability: 80,
      workshopStartDate: new Date('2026-01-05'),
      weeksInWorkshop: 4,
      truckLoadDate: new Date('2026-01-26'),
      onsiteWeeks: 1,
      cnc: 0,
      build: 100,
      paint: 0,
      av: 0,
      packAndLoad: 0,
      tradeOnsite: 0,
    };

    const excludedProject: PlanningProject = {
      ...includedProject,
      id: 'project-2',
      jobNumber: 'J002',
      probability: 40,
      build: 200,
    };

    const result = aggregateDemandForProjects(
      [includedProject, excludedProject],
      [flatCurve],
      [{ jobType: 'Custom Build', taskType: 'Build', defaultCurveId: 'custom-build-flat-v1' }],
      planningWeeks,
      60
    );

    expect(result.projectResults).toHaveLength(1);
    expect(Object.values(result.totals.build).reduce((sum, value) => sum + value, 0)).toBeCloseTo(100, 5);

    const activeWeeks = planningWeeks.filter((week) => result.totals.build[week] > 0);
    expect(activeWeeks).toHaveLength(4);
    activeWeeks.forEach((week) => {
      expect(result.totals.build[week]).toBeCloseTo(25, 5);
    });
  });
});

describe('Phase 1 capacity engine', () => {
  it('applies utilisation, contractor bookings, leave ranges, and company closures', () => {
    const staff: PlanningStaffMember[] = [
      {
        id: 'employee-1',
        name: 'Internal staff',
        dailyHours: 8,
        utilisation: 0.75,
        employeeType: 'employee',
        skills: { Build: true },
        availability: [
          {
            startDate: '2026-01-05',
            endDate: '2026-01-05',
            absenceType: 'Annual Leave',
          },
        ],
      },
      {
        id: 'contractor-1',
        name: 'Booked contractor',
        dailyHours: 10,
        utilisation: 1,
        employeeType: 'contractor',
        skills: { Build: true },
        availability: [
          {
            startDate: '2026-01-06',
            endDate: '2026-01-09',
            absenceType: 'Available',
          },
        ],
      },
    ];

    const closures = [
      {
        name: 'Public Holiday',
        startDate: '2026-01-07',
        endDate: '2026-01-07',
        closureType: 'Public Holiday',
      },
    ];

    const capacity = calculateWeeklyCapacity(
      staff,
      closures,
      new Date('2026-01-05'),
      new Date('2026-01-11')
    );

    expect(capacity).toHaveLength(1);
    expect(capacity[0].internalCapacity).toBeCloseTo(18, 5);
    expect(capacity[0].contractorCapacity).toBeCloseTo(30, 5);
    expect(capacity[0].totalCapacity).toBeCloseTo(48, 5);
  });
});
