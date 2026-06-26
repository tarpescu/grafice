import type { Employee, ShiftType, DayInfo } from './calculations';
import { getDaysInMonth, getWorkingDaysCount } from './calculations';

export type LockedShifts = { [employeeId: string]: { [day: number]: ShiftType } | undefined };

interface CoverageRequirement {
  minDayShifts: number;
  maxDayShifts: number;
  minNightShifts: number;
  maxNightShifts: number;
}

export interface SchedulerRequirements {
  AS: CoverageRequirement;
}

export interface ValidationWarning {
  employeeId: string;
  day: number;
  message: string;
  severity: 'error' | 'warning';
}

export function validateSchedule(
  employees: Employee[],
  shifts: { [employeeId: string]: { [day: number]: ShiftType } },
  year: number,
  month: number
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const days = getDaysInMonth(year, month);

  employees.forEach((emp) => {
    const empShifts = shifts[emp.id] || {};

    days.forEach((dayInfo) => {
      const d = dayInfo.day;
      const currentShift = empShifts[d] || '-';

      if (currentShift === '-') return;

      if (emp.shiftPattern === '8h' && (currentShift === 'Z' || currentShift === 'N')) {
        warnings.push({
          employeeId: emp.id,
          day: d,
          message: `${emp.name} este configurat exclusiv pentru ture de 8 ore, dar are repartizată tura de 12h (${currentShift})!`,
          severity: 'error',
        });
      }

      if (currentShift === 'N') {
        const nextDayShift = empShifts[d + 1];
        if (nextDayShift && nextDayShift !== '-' && nextDayShift !== 'CO' && nextDayShift !== 'CIC') {
          warnings.push({
            employeeId: emp.id,
            day: d + 1,
            message: `${emp.name} lucrează după o tură de noapte (N pe data de ${d}). Codul Muncii cere repaus obligatoriu!`,
            severity: 'error',
          });
        }
      }
    });
  });

  return warnings;
}

export function getRemainingActiveDays(
  empId: string,
  startDay: number,
  days: DayInfo[],
  lockedShifts: LockedShifts
) {
  let count = 0;
  for (let day = startDay; day <= days.length; day++) {
    const locked = lockedShifts[empId]?.[day];
    if (locked !== 'CO' && locked !== 'CIC') {
      count++;
    }
  }
  return Math.max(1, count);
}

export function getEmployeeCOWeekdays(
  empId: string,
  weekdays: DayInfo[],
  lockedShifts: LockedShifts
) {
  return weekdays.filter(day => lockedShifts[empId]?.[day.day] === 'CO' || lockedShifts[empId]?.[day.day] === 'CIC').length;
}

export function getEmployeeTargetHours(
  empId: string,
  weekdays: DayInfo[],
  lockedShifts: LockedShifts,
  workingDays: number
) {
  const coWeekdays = getEmployeeCOWeekdays(empId, weekdays, lockedShifts);
  return Math.max(0, workingDays - coWeekdays) * 8;
}

export function filterEligibleCandidates(
  employees: Employee[],
  d: number,
  daysLength: number,
  shiftType: 'N' | 'Z',
  shifts: { [employeeId: string]: { [day: number]: ShiftType } },
  lockedShifts: LockedShifts,
  hoursTracker: { [employeeId: string]: number },
  weekdays: DayInfo[],
  workingDays: number,
  minRequiredHours: number
) {
  return employees.filter((emp) => {
    if (shifts[emp.id][d] !== '-') return false;
    
    if (d > 1 && shifts[emp.id][d - 1] === 'N') return false;
    
    if (shiftType === 'N') {
      if (d > 2 && shifts[emp.id][d - 2] === 'N') return false;
      if (d < daysLength && lockedShifts[emp.id]?.[d + 1] === 'N') return false;
    }

    const targetHours = getEmployeeTargetHours(emp.id, weekdays, lockedShifts, workingDays);
    if (hoursTracker[emp.id] + minRequiredHours > targetHours) return false;

    return true;
  });
}

export function sortCandidatesByDensity(
  candidates: Employee[],
  d: number,
  shifts: { [employeeId: string]: { [day: number]: ShiftType } },
  hoursTracker: { [employeeId: string]: number },
  weekdays: DayInfo[],
  workingDays: number,
  lockedShifts: LockedShifts,
  getRemainingActiveDaysFn: (empId: string, startDay: number) => number,
  targetPattern: 'Z' | 'completedRest'
) {
  candidates.sort((a, b) => {
    const targetHoursA = getEmployeeTargetHours(a.id, weekdays, lockedShifts, workingDays);
    const targetHoursB = getEmployeeTargetHours(b.id, weekdays, lockedShifts, workingDays);
    
    const remainingActiveDaysA = getRemainingActiveDaysFn(a.id, d);
    const remainingActiveDaysB = getRemainingActiveDaysFn(b.id, d);

    const densityA = (targetHoursA - hoursTracker[a.id]) / remainingActiveDaysA;
    const densityB = (targetHoursB - hoursTracker[b.id]) / remainingActiveDaysB;

    if (Math.abs(densityA - densityB) > 0.5) {
      return densityB - densityA;
    }

    if (targetPattern === 'Z') {
      const workedZYesterdayA = d > 1 && shifts[a.id][d - 1] === 'Z';
      const workedZYesterdayB = d > 1 && shifts[b.id][d - 1] === 'Z';
      if (workedZYesterdayA && !workedZYesterdayB) return -1;
      if (!workedZYesterdayA && workedZYesterdayB) return 1;
    } else if (targetPattern === 'completedRest') {
      const completedRestA = d > 3 && shifts[a.id][d - 3] === 'N' && shifts[a.id][d - 2] === '-' && shifts[a.id][d - 1] === '-';
      const completedRestB = d > 3 && shifts[b.id][d - 3] === 'N' && shifts[b.id][d - 2] === '-' && shifts[b.id][d - 1] === '-';
      if (completedRestA && !completedRestB) return -1;
      if (!completedRestA && completedRestB) return 1;
    }

    return densityB - densityA + (Math.random() * 0.1 - 0.05);
  });
}

export function autoGenerateSchedule(
  employees: Employee[],
  year: number,
  month: number,
  lockedShifts: { [employeeId: string]: { [day: number]: ShiftType } } = {},
  requirements: SchedulerRequirements = {
    AS: { minDayShifts: 2, maxDayShifts: 2, minNightShifts: 2, maxNightShifts: 2 },
  }
): { [employeeId: string]: { [day: number]: ShiftType } } {
  const days = getDaysInMonth(year, month);
  const workingDays = getWorkingDaysCount(year, month);
  const weekdays = days.filter(d => !d.isWeekend);
  const daysLength = days.length;
  
  const shifts: { [employeeId: string]: { [day: number]: ShiftType } } = {};
  const hoursTracker: { [employeeId: string]: number } = {};

  const getRemainingActiveDaysBound = (empId: string, startDay: number) => 
    getRemainingActiveDays(empId, startDay, days, lockedShifts);

  employees.forEach((emp) => {
    shifts[emp.id] = {};
    hoursTracker[emp.id] = 0;
    
    days.forEach((dayInfo) => {
      const locked = lockedShifts[emp.id]?.[dayInfo.day];
      if (locked && locked !== '-') {
        shifts[emp.id][dayInfo.day] = locked;
        if (locked === 'Z' || locked === 'N') hoursTracker[emp.id] += 12;
        if (locked === '8') hoursTracker[emp.id] += 8;
        if (locked === '4') hoursTracker[emp.id] += 4;
      } else {
        shifts[emp.id][dayInfo.day] = '-';
      }
    });
  });

  employees.forEach((emp) => {
    if (emp.shiftPattern === '8h') {
      const targetShifts = Math.max(0, workingDays - getEmployeeCOWeekdays(emp.id, weekdays, lockedShifts));

      days.forEach((dayInfo) => {
        const locked = lockedShifts[emp.id]?.[dayInfo.day];
        if (!locked || locked === '-') {
          shifts[emp.id][dayInfo.day] = '8';
          hoursTracker[emp.id] += 8;
        }
      });

      const assignedDays = days.filter(d => shifts[emp.id][d.day] === '8');
      const toRemove = assignedDays.length - targetShifts;
      
      if (toRemove > 0) {
        const removableDays = assignedDays.filter(d => !lockedShifts[emp.id]?.[d.day] && !d.isHoliday);
        const actualRemove = Math.min(toRemove, removableDays.length);
        for (let i = 0; i < actualRemove; i++) {
          const index = Math.floor((i * removableDays.length) / actualRemove);
          const dayInfo = removableDays[index];
          shifts[emp.id][dayInfo.day] = '-';
          hoursTracker[emp.id] -= 8;
        }
      }
    }
  });

  days.forEach((dayInfo) => {
    const d = dayInfo.day;

    (['AS'] as const).forEach((role) => {
      const roleReq = requirements[role];
      const roleEmployees = employees.filter((emp) => emp.active && emp.role === role);
      const normalEmployees = roleEmployees.filter((emp) => emp.shiftPattern !== '8h');

      let assignedDayCount = 0;
      let assignedNightCount = 0;
      roleEmployees.forEach((emp) => {
        const existing = shifts[emp.id][d];
        if (emp.shiftPattern !== '8h') {
          if (existing === 'Z' || existing === '8' || existing === '4') assignedDayCount++;
        }
        if (existing === 'N') assignedNightCount++;
      });

      const scheduleShifts = (
        shiftsNeeded: number,
        shiftType: 'N' | 'Z',
        minRequiredHours: number,
        targetPattern: 'Z' | 'completedRest'
      ) => {
        let count = 0;
        for (let i = 0; i < shiftsNeeded; i++) {
          const candidates = filterEligibleCandidates(
            normalEmployees, d, daysLength, shiftType, shifts,
            lockedShifts, hoursTracker, weekdays, workingDays, minRequiredHours
          );

          if (candidates.length === 0) break;

          sortCandidatesByDensity(
            candidates, d, shifts, hoursTracker, weekdays, workingDays,
            lockedShifts, getRemainingActiveDaysBound, targetPattern
          );

          const selected = candidates[0];
          
          let actualShiftType: ShiftType = shiftType;
          if (shiftType === 'Z') {
            actualShiftType = dayInfo.isWeekend
              ? 'Z'
              : (() => {
                  const targetHours = getEmployeeTargetHours(selected.id, weekdays, lockedShifts, workingDays);
                  const remaining = targetHours - hoursTracker[selected.id];
                  if (remaining >= 12) return 'Z';
                  if (remaining >= 8) return '8';
                  return '4';
                })();
          }

          shifts[selected.id][d] = actualShiftType;
          if (actualShiftType === 'Z' || actualShiftType === 'N') hoursTracker[selected.id] += 12;
          else if (actualShiftType === '8') hoursTracker[selected.id] += 8;
          else if (actualShiftType === '4') hoursTracker[selected.id] += 4;

          count++;
        }
        return count;
      };

      const minNightsNeeded = Math.max(0, roleReq.minNightShifts - assignedNightCount);
      assignedNightCount += scheduleShifts(minNightsNeeded, 'N', 12, 'Z');

      const maxNightsNeeded = Math.max(0, Math.max(roleReq.minNightShifts, roleReq.maxNightShifts) - assignedNightCount);
      assignedNightCount += scheduleShifts(maxNightsNeeded, 'N', 12, 'Z');

      const minRequiredDayHours = dayInfo.isWeekend ? 12 : 4;
      
      const minDaysNeeded = Math.max(0, roleReq.minDayShifts - assignedDayCount);
      assignedDayCount += scheduleShifts(minDaysNeeded, 'Z', minRequiredDayHours, 'completedRest');

      const maxDaysNeeded = Math.max(0, Math.max(roleReq.minDayShifts, roleReq.maxDayShifts) - assignedDayCount);
      assignedDayCount += scheduleShifts(maxDaysNeeded, 'Z', minRequiredDayHours, 'completedRest');
    });
  });

  return shifts;
}
