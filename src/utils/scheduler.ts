import type { Employee, ShiftType } from './calculations';
import { getDaysInMonth, getWorkingDaysCount } from './calculations';

export interface CoverageRequirement {
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

// Check constraints and return warning messages
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

      // Rule 0: 8h employees cannot have Z or N shifts
      if (emp.shiftPattern === '8h' && (currentShift === 'Z' || currentShift === 'N')) {
        warnings.push({
          employeeId: emp.id,
          day: d,
          message: `${emp.name} este configurat exclusiv pentru ture de 8 ore, dar are repartizată tura de 12h (${currentShift})!`,
          severity: 'error',
        });
      }

      // Rule 1: No consecutive night shifts without rest
      // If worked N on day d, cannot work on day d + 1
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

      // Rule 2: Cannot work two shifts on the same day (handled by data structure: 1 shift per day)
    });
  });

  return warnings;
}

// Core scheduling algorithm
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
  
  // Initialize shifts structure
  const shifts: { [employeeId: string]: { [day: number]: ShiftType } } = {};
  
  // Track accumulated hours per employee during generation
  const hoursTracker: { [employeeId: string]: number } = {};

  // Helper to count remaining active days for an employee starting from day `d`
  const getRemainingActiveDays = (empId: string, startDay: number) => {
    let count = 0;
    for (let day = startDay; day <= days.length; day++) {
      const locked = lockedShifts[empId]?.[day];
      if (locked !== 'CO' && locked !== 'CIC') {
        count++;
      }
    }
    return Math.max(1, count); // Avoid division by zero
  };

  // 1. Copy locked shifts first
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

  // 2. Pre-schedule 8h employees to meet their exact target shifts (can be on weekdays or weekends)
  employees.forEach((emp) => {
    if (emp.shiftPattern === '8h') {
      const coWeekdays = weekdays.filter(d => lockedShifts[emp.id]?.[d.day] === 'CO' || lockedShifts[emp.id]?.[d.day] === 'CIC').length;
      const adjustedWorkingDays = Math.max(0, workingDays - coWeekdays);
      const targetShifts = adjustedWorkingDays;

      // Pre-schedule '8' on ALL days (weekdays and weekends) that are not locked
      days.forEach((dayInfo) => {
        const locked = lockedShifts[emp.id]?.[dayInfo.day];
        if (!locked || locked === '-') {
          shifts[emp.id][dayInfo.day] = '8';
          hoursTracker[emp.id] += 8;
        }
      });

      // Count current '8' shifts assigned
      const assignedDays = days.filter(d => shifts[emp.id][d.day] === '8');
      const toRemove = assignedDays.length - targetShifts;
      
      if (toRemove > 0) {
        // Find days that are assigned '8', NOT locked, and NOT a holiday
        const removableDays = assignedDays.filter(d => !lockedShifts[emp.id]?.[d.day] && !d.isHoliday);
        // Remove shifts evenly across the month to create days off
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

  // 3. Schedule Normal Rotation Employees day-by-day (staggered Z N - - pattern)
  days.forEach((dayInfo) => {
    const d = dayInfo.day;

    (['AS'] as const).forEach((role) => {
      const roleReq = requirements[role];
      const roleEmployees = employees.filter((emp) => emp.active && emp.role === role);
      const normalEmployees = roleEmployees.filter((emp) => emp.shiftPattern !== '8h');

      // Count existing assigned/locked shifts for this role today (excluding 8h employees from the day shift count)
      let assignedDayCount = 0;
      let assignedNightCount = 0;
      roleEmployees.forEach((emp) => {
        const existing = shifts[emp.id][d];
        if (emp.shiftPattern !== '8h') {
          if (existing === 'Z' || existing === '8' || existing === '4') assignedDayCount++;
        }
        if (existing === 'N') assignedNightCount++;
      });

      // A. Schedule Night Shifts (N)
      // A1. Schedule up to minNightShifts (Hard requirement)
      const minNightsNeeded = Math.max(0, roleReq.minNightShifts - assignedNightCount);
      for (let n = 0; n < minNightsNeeded; n++) {
        const candidates = normalEmployees.filter((emp) => {
          if (shifts[emp.id][d] !== '-') return false; // Already has a shift today
          if (d > 1 && shifts[emp.id][d - 1] === 'N') return false; // Worked N yesterday (must rest day 1)
          if (d > 2 && shifts[emp.id][d - 2] === 'N') return false; // Worked N 2 days ago (must rest day 2)
          if (d < days.length && lockedShifts[emp.id]?.[d + 1] === 'N') return false; // Night shift locked tomorrow

          // Strict hours check: adding 12 hours must not exceed target hours
          const coWeekdays = weekdays.filter(day => lockedShifts[emp.id]?.[day.day] === 'CO' || lockedShifts[emp.id]?.[day.day] === 'CIC').length;
          const targetHours = Math.max(0, workingDays - coWeekdays) * 8;
          if (hoursTracker[emp.id] + 12 > targetHours) return false;

          return true;
        });

        if (candidates.length === 0) break;

        // Sort candidates:
        // 1. Prioritize density of remaining active hours (higher density first)
        // 2. Priority to employees who worked Z yesterday (pattern continuation Z -> N)
        candidates.sort((a, b) => {
          const coWeekdaysA = weekdays.filter(day => lockedShifts[a.id]?.[day.day] === 'CO' || lockedShifts[a.id]?.[day.day] === 'CIC').length;
          const coWeekdaysB = weekdays.filter(day => lockedShifts[b.id]?.[day.day] === 'CO' || lockedShifts[b.id]?.[day.day] === 'CIC').length;
          const targetHoursA = Math.max(0, workingDays - coWeekdaysA) * 8;
          const targetHoursB = Math.max(0, workingDays - coWeekdaysB) * 8;
          
          const remainingActiveDaysA = getRemainingActiveDays(a.id, d);
          const remainingActiveDaysB = getRemainingActiveDays(b.id, d);

          const densityA = (targetHoursA - hoursTracker[a.id]) / remainingActiveDaysA;
          const densityB = (targetHoursB - hoursTracker[b.id]) / remainingActiveDaysB;

          // Prioritize density first if there is a significant difference in hours needed per active day
          if (Math.abs(densityA - densityB) > 0.5) {
            return densityB - densityA;
          }

          const workedZYesterdayA = d > 1 && shifts[a.id][d - 1] === 'Z';
          const workedZYesterdayB = d > 1 && shifts[b.id][d - 1] === 'Z';

          if (workedZYesterdayA && !workedZYesterdayB) return -1;
          if (!workedZYesterdayA && workedZYesterdayB) return 1;

          return densityB - densityA + (Math.random() * 0.1 - 0.05);
        });

        const selected = candidates[0];
        shifts[selected.id][d] = 'N';
        hoursTracker[selected.id] += 12;
        assignedNightCount++;
      }

      // A2. Schedule additional night shifts up to maxNightShifts (Soft requirement: only if candidates are under target hours)
      const maxNightsNeeded = Math.max(0, Math.max(roleReq.minNightShifts, roleReq.maxNightShifts) - assignedNightCount);
      for (let n = 0; n < maxNightsNeeded; n++) {
        const candidates = normalEmployees.filter((emp) => {
          if (shifts[emp.id][d] !== '-') return false;
          if (d > 1 && shifts[emp.id][d - 1] === 'N') return false;
          if (d > 2 && shifts[emp.id][d - 2] === 'N') return false;
          if (d < days.length && lockedShifts[emp.id]?.[d + 1] === 'N') return false;

          // Soft constraint: only candidates who will NOT exceed their target hours
          const coWeekdays = weekdays.filter(day => lockedShifts[emp.id]?.[day.day] === 'CO' || lockedShifts[emp.id]?.[day.day] === 'CIC').length;
          const targetHours = Math.max(0, workingDays - coWeekdays) * 8;
          if (hoursTracker[emp.id] + 12 > targetHours) return false;

          return true;
        });

        if (candidates.length === 0) break;

        candidates.sort((a, b) => {
          const coWeekdaysA = weekdays.filter(day => lockedShifts[a.id]?.[day.day] === 'CO' || lockedShifts[a.id]?.[day.day] === 'CIC').length;
          const coWeekdaysB = weekdays.filter(day => lockedShifts[b.id]?.[day.day] === 'CO' || lockedShifts[b.id]?.[day.day] === 'CIC').length;
          const targetHoursA = Math.max(0, workingDays - coWeekdaysA) * 8;
          const targetHoursB = Math.max(0, workingDays - coWeekdaysB) * 8;
          
          const remainingActiveDaysA = getRemainingActiveDays(a.id, d);
          const remainingActiveDaysB = getRemainingActiveDays(b.id, d);

          const densityA = (targetHoursA - hoursTracker[a.id]) / remainingActiveDaysA;
          const densityB = (targetHoursB - hoursTracker[b.id]) / remainingActiveDaysB;

          // Prioritize density first if there is a significant difference in hours needed per active day
          if (Math.abs(densityA - densityB) > 0.5) {
            return densityB - densityA;
          }

          const workedZYesterdayA = d > 1 && shifts[a.id][d - 1] === 'Z';
          const workedZYesterdayB = d > 1 && shifts[b.id][d - 1] === 'Z';

          if (workedZYesterdayA && !workedZYesterdayB) return -1;
          if (!workedZYesterdayA && workedZYesterdayB) return 1;

          return densityB - densityA + (Math.random() * 0.1 - 0.05);
        });

        const selected = candidates[0];
        shifts[selected.id][d] = 'N';
        hoursTracker[selected.id] += 12;
        assignedNightCount++;
      }

      // B. Schedule Day Shifts (Z)
      // B1. Schedule up to minDayShifts (Hard requirement)
      const minDaysNeeded = Math.max(0, roleReq.minDayShifts - assignedDayCount);
      for (let df = 0; df < minDaysNeeded; df++) {
        const candidates = normalEmployees.filter((emp) => {
          if (shifts[emp.id][d] !== '-') return false; // Already has a shift today
          if (d > 1 && shifts[emp.id][d - 1] === 'N') return false; // Cannot work day shift right after Night

          // Strict hours check: adding minimum possible hours (12h on weekend, 4h on weekday) must not exceed target hours
          const coWeekdays = weekdays.filter(day => lockedShifts[emp.id]?.[day.day] === 'CO' || lockedShifts[emp.id]?.[day.day] === 'CIC').length;
          const targetHours = Math.max(0, workingDays - coWeekdays) * 8;
          const minRequiredHours = dayInfo.isWeekend ? 12 : 4;
          if (hoursTracker[emp.id] + minRequiredHours > targetHours) return false;

          return true;
        });

        if (candidates.length === 0) break;

        // Sort candidates:
        // 1. Prioritize density of remaining active hours (higher density first)
        // 2. Priority to employees who completed their 2-day rest cycle after N (N -> - -> - -> Z)
        candidates.sort((a, b) => {
          const coWeekdaysA = weekdays.filter(day => lockedShifts[a.id]?.[day.day] === 'CO' || lockedShifts[a.id]?.[day.day] === 'CIC').length;
          const coWeekdaysB = weekdays.filter(day => lockedShifts[b.id]?.[day.day] === 'CO' || lockedShifts[b.id]?.[day.day] === 'CIC').length;
          const targetHoursA = Math.max(0, workingDays - coWeekdaysA) * 8;
          const targetHoursB = Math.max(0, workingDays - coWeekdaysB) * 8;
          
          const remainingActiveDaysA = getRemainingActiveDays(a.id, d);
          const remainingActiveDaysB = getRemainingActiveDays(b.id, d);

          const densityA = (targetHoursA - hoursTracker[a.id]) / remainingActiveDaysA;
          const densityB = (targetHoursB - hoursTracker[b.id]) / remainingActiveDaysB;

          // Prioritize density first if there is a significant difference in hours needed per active day
          if (Math.abs(densityA - densityB) > 0.5) {
            return densityB - densityA;
          }

          const completedRestA = d > 3 && shifts[a.id][d - 3] === 'N' && shifts[a.id][d - 2] === '-' && shifts[a.id][d - 1] === '-';
          const completedRestB = d > 3 && shifts[b.id][d - 3] === 'N' && shifts[b.id][d - 2] === '-' && shifts[b.id][d - 1] === '-';

          if (completedRestA && !completedRestB) return -1;
          if (!completedRestA && completedRestB) return 1;

          return densityB - densityA + (Math.random() * 0.1 - 0.05);
        });

        const selected = candidates[0];
        
        // Decide shift type: Z (12h), 8 (8h) or 4 (4h) based on remaining hours
        const shiftType: ShiftType = dayInfo.isWeekend
          ? 'Z'
          : (() => {
              const coWeekdays = weekdays.filter(day => lockedShifts[selected.id]?.[day.day] === 'CO' || lockedShifts[selected.id]?.[day.day] === 'CIC').length;
              const targetHours = Math.max(0, workingDays - coWeekdays) * 8;
              const remaining = targetHours - hoursTracker[selected.id];
              if (remaining >= 12) return 'Z';
              if (remaining >= 8) return '8';
              return '4';
            })();

        shifts[selected.id][d] = shiftType;
        if (shiftType === 'Z') hoursTracker[selected.id] += 12;
        else if (shiftType === '8') hoursTracker[selected.id] += 8;
        else if (shiftType === '4') hoursTracker[selected.id] += 4;
        assignedDayCount++;
      }

      // B2. Schedule additional day shifts up to maxDayShifts (Soft requirement: only if candidates are under target hours)
      const maxDaysNeeded = Math.max(0, Math.max(roleReq.minDayShifts, roleReq.maxDayShifts) - assignedDayCount);
      for (let df = 0; df < maxDaysNeeded; df++) {
        const candidates = normalEmployees.filter((emp) => {
          if (shifts[emp.id][d] !== '-') return false;
          if (d > 1 && shifts[emp.id][d - 1] === 'N') return false;

          // Soft constraint: only candidates who have not yet reached their target hours
          // Soft constraint: only candidates who will NOT exceed their target hours
          const coWeekdays = weekdays.filter(day => lockedShifts[emp.id]?.[day.day] === 'CO' || lockedShifts[emp.id]?.[day.day] === 'CIC').length;
          const targetHours = Math.max(0, workingDays - coWeekdays) * 8;
          const minRequiredHours = dayInfo.isWeekend ? 12 : 4;
          if (hoursTracker[emp.id] + minRequiredHours > targetHours) return false;

          return true;
        });

        if (candidates.length === 0) break;

        candidates.sort((a, b) => {
          const coWeekdaysA = weekdays.filter(day => lockedShifts[a.id]?.[day.day] === 'CO' || lockedShifts[a.id]?.[day.day] === 'CIC').length;
          const coWeekdaysB = weekdays.filter(day => lockedShifts[b.id]?.[day.day] === 'CO' || lockedShifts[b.id]?.[day.day] === 'CIC').length;
          const targetHoursA = Math.max(0, workingDays - coWeekdaysA) * 8;
          const targetHoursB = Math.max(0, workingDays - coWeekdaysB) * 8;
          
          const remainingActiveDaysA = getRemainingActiveDays(a.id, d);
          const remainingActiveDaysB = getRemainingActiveDays(b.id, d);

          const densityA = (targetHoursA - hoursTracker[a.id]) / remainingActiveDaysA;
          const densityB = (targetHoursB - hoursTracker[b.id]) / remainingActiveDaysB;

          // Prioritize density first if there is a significant difference in hours needed per active day
          if (Math.abs(densityA - densityB) > 0.5) {
            return densityB - densityA;
          }

          const completedRestA = d > 3 && shifts[a.id][d - 3] === 'N' && shifts[a.id][d - 2] === '-' && shifts[a.id][d - 1] === '-';
          const completedRestB = d > 3 && shifts[b.id][d - 3] === 'N' && shifts[b.id][d - 2] === '-' && shifts[b.id][d - 1] === '-';

          if (completedRestA && !completedRestB) return -1;
          if (!completedRestA && completedRestB) return 1;

          return densityB - densityA + (Math.random() * 0.1 - 0.05);
        });

        const selected = candidates[0];
        
        // Decide shift type: Z (12h), 8 (8h) or 4 (4h) based on remaining hours
        const shiftType: ShiftType = dayInfo.isWeekend
          ? 'Z'
          : (() => {
              const coWeekdays = weekdays.filter(day => lockedShifts[selected.id]?.[day.day] === 'CO' || lockedShifts[selected.id]?.[day.day] === 'CIC').length;
              const targetHours = Math.max(0, workingDays - coWeekdays) * 8;
              const remaining = targetHours - hoursTracker[selected.id];
              if (remaining >= 12) return 'Z';
              if (remaining >= 8) return '8';
              return '4';
            })();

        shifts[selected.id][d] = shiftType;
        if (shiftType === 'Z') hoursTracker[selected.id] += 12;
        else if (shiftType === '8') hoursTracker[selected.id] += 8;
        else if (shiftType === '4') hoursTracker[selected.id] += 4;
        assignedDayCount++;
      }
    });
  });

  return shifts;
}
