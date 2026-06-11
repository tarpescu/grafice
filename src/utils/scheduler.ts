import type { Employee, ShiftType } from './calculations';
import { getDaysInMonth, getWorkingDaysCount } from './calculations';

export interface CoverageRequirement {
  dayShifts: number;
  nightShifts: number;
}

export interface SchedulerRequirements {
  MED: CoverageRequirement;
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
    MED: { dayShifts: 1, nightShifts: 1 },
    AS: { dayShifts: 2, nightShifts: 2 },
  }
): { [employeeId: string]: { [day: number]: ShiftType } } {
  const days = getDaysInMonth(year, month);
  const workingDays = getWorkingDaysCount(year, month);
  const weekdays = days.filter(d => !d.isWeekend);
  
  // Initialize shifts structure
  const shifts: { [employeeId: string]: { [day: number]: ShiftType } } = {};
  
  // Track accumulated hours per employee during generation
  const hoursTracker: { [employeeId: string]: number } = {};
  
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
      const targetShifts = Math.round(adjustedWorkingDays * emp.norm);

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

    (['MED', 'AS'] as const).forEach((role) => {
      const roleReq = requirements[role];
      const roleEmployees = employees.filter((emp) => emp.active && emp.role === role);
      const normalEmployees = roleEmployees.filter((emp) => emp.shiftPattern !== '8h');

      // Count existing assigned/locked shifts for this role today
      let assignedDayCount = 0;
      let assignedNightCount = 0;
      roleEmployees.forEach((emp) => {
        const existing = shifts[emp.id][d];
        if (existing === 'Z' || existing === '8') assignedDayCount++;
        if (existing === 'N') assignedNightCount++;
      });

      // A. Schedule Night Shifts (N) - Stricter rest constraints
      const nightsNeeded = Math.max(0, roleReq.nightShifts - assignedNightCount);
      for (let n = 0; n < nightsNeeded; n++) {
        const candidates = normalEmployees.filter((emp) => {
          if (shifts[emp.id][d] !== '-') return false; // Already has a shift today
          if (d > 1 && shifts[emp.id][d - 1] === 'N') return false; // Worked N yesterday (must rest day 1)
          if (d > 2 && shifts[emp.id][d - 2] === 'N') return false; // Worked N 2 days ago (must rest day 2)
          if (d < days.length && lockedShifts[emp.id]?.[d + 1] === 'N') return false; // Night shift locked tomorrow

          return true;
        });

        if (candidates.length === 0) break;

        // Sort candidates:
        // Priority to employees who worked Z yesterday (pattern continuation Z -> N)
        candidates.sort((a, b) => {
          const coWeekdaysA = weekdays.filter(day => lockedShifts[a.id]?.[day.day] === 'CO' || lockedShifts[a.id]?.[day.day] === 'CIC').length;
          const coWeekdaysB = weekdays.filter(day => lockedShifts[b.id]?.[day.day] === 'CO' || lockedShifts[b.id]?.[day.day] === 'CIC').length;
          const targetHoursA = Math.round(Math.max(0, workingDays - coWeekdaysA) * 8 * a.norm);
          const targetHoursB = Math.round(Math.max(0, workingDays - coWeekdaysB) * 8 * b.norm);
          
          const ratioA = targetHoursA > 0 ? hoursTracker[a.id] / targetHoursA : 0;
          const ratioB = targetHoursB > 0 ? hoursTracker[b.id] / targetHoursB : 0;

          const workedZYesterdayA = d > 1 && shifts[a.id][d - 1] === 'Z';
          const workedZYesterdayB = d > 1 && shifts[b.id][d - 1] === 'Z';

          if (workedZYesterdayA && !workedZYesterdayB) return -1;
          if (!workedZYesterdayA && workedZYesterdayB) return 1;

          return ratioA - ratioB + (Math.random() * 0.1 - 0.05);
        });

        const selected = candidates[0];
        shifts[selected.id][d] = 'N';
        hoursTracker[selected.id] += 12;
        assignedNightCount++;
      }

      // B. Schedule Day Shifts (Z)
      const daysNeeded = Math.max(0, roleReq.dayShifts - assignedDayCount);
      for (let df = 0; df < daysNeeded; df++) {
        const candidates = normalEmployees.filter((emp) => {
          if (shifts[emp.id][d] !== '-') return false; // Already has a shift today
          if (d > 1 && shifts[emp.id][d - 1] === 'N') return false; // Cannot work day shift right after Night

          return true;
        });

        if (candidates.length === 0) break;

        // Sort candidates:
        // Priority to employees who completed their 2-day rest cycle after N (N -> - -> - -> Z)
        candidates.sort((a, b) => {
          const coWeekdaysA = weekdays.filter(day => lockedShifts[a.id]?.[day.day] === 'CO' || lockedShifts[a.id]?.[day.day] === 'CIC').length;
          const coWeekdaysB = weekdays.filter(day => lockedShifts[b.id]?.[day.day] === 'CO' || lockedShifts[b.id]?.[day.day] === 'CIC').length;
          const targetHoursA = Math.round(Math.max(0, workingDays - coWeekdaysA) * 8 * a.norm);
          const targetHoursB = Math.round(Math.max(0, workingDays - coWeekdaysB) * 8 * b.norm);
          
          const ratioA = targetHoursA > 0 ? hoursTracker[a.id] / targetHoursA : 0;
          const ratioB = targetHoursB > 0 ? hoursTracker[b.id] / targetHoursB : 0;

          const completedRestA = d > 3 && shifts[a.id][d - 3] === 'N' && shifts[a.id][d - 2] === '-' && shifts[a.id][d - 1] === '-';
          const completedRestB = d > 3 && shifts[b.id][d - 3] === 'N' && shifts[b.id][d - 2] === '-' && shifts[b.id][d - 1] === '-';

          if (completedRestA && !completedRestB) return -1;
          if (!completedRestA && completedRestB) return 1;

          return ratioA - ratioB + (Math.random() * 0.1 - 0.05);
        });

        const selected = candidates[0];
        
        // Decide shift type: Z (12h) or 8 (8h)
        const shiftType: ShiftType = dayInfo.isWeekend
          ? 'Z'
          : (() => {
              const coWeekdays = weekdays.filter(day => lockedShifts[selected.id]?.[day.day] === 'CO' || lockedShifts[selected.id]?.[day.day] === 'CIC').length;
              const targetHours = Math.round(Math.max(0, workingDays - coWeekdays) * 8 * selected.norm);
              const ratio = targetHours > 0 ? hoursTracker[selected.id] / targetHours : 0;
              return ratio < 0.75 ? 'Z' : '8';
            })();

        shifts[selected.id][d] = shiftType;
        hoursTracker[selected.id] += shiftType === 'Z' ? 12 : 8;
        assignedDayCount++;
      }
    });
  });

  // 4. Perform Weekend Swaps for 8h employees to handle weekend day coverage
  days.forEach((dayInfo) => {
    if (!dayInfo.isWeekend) return;
    const d = dayInfo.day;

    (['MED', 'AS'] as const).forEach((role) => {
      const roleReq = requirements[role];
      const roleEmployees = employees.filter((emp) => emp.active && emp.role === role);
      const shift8hEmployees = roleEmployees.filter((emp) => emp.shiftPattern === '8h');

      // Calculate current day shifts coverage (Z + 8) on this weekend day
      let assignedDayCount = 0;
      roleEmployees.forEach((emp) => {
        const shift = shifts[emp.id][d];
        if (shift === 'Z' || shift === '8') assignedDayCount++;
      });

      // If coverage is not met, look for 8h employees to swap their shifts to weekend
      const daysNeeded = Math.max(0, roleReq.dayShifts - assignedDayCount);
      if (daysNeeded === 0) return;

      for (let i = 0; i < daysNeeded; i++) {
        const eligibleSwappers: { emp: Employee; weekdayToSwap: number }[] = [];

        shift8hEmployees.forEach((emp) => {
          // Weekend day must be free and not locked
          if (shifts[emp.id][d] !== '-') return;
          if (lockedShifts[emp.id]?.[d]) return;

          // Find nearby weekday (offset of -2 to +3 days) where they are scheduled to work '8' and not locked
          const offsets = [-2, -1, 1, 2, 3];
          for (const offset of offsets) {
            const weekday = d + offset;
            if (weekday < 1 || weekday > days.length) continue;
            
            const targetDayInfo = days[weekday - 1];
            if (targetDayInfo.isWeekend) continue; // Must be a weekday

            if (shifts[emp.id][weekday] === '8' && !lockedShifts[emp.id]?.[weekday]) {
              eligibleSwappers.push({ emp, weekdayToSwap: weekday });
              break; // Found weekday shift to swap for this employee
            }
          }
        });

        if (eligibleSwappers.length === 0) break;

        // Sort by lowest hours ratio to balance shifts
        eligibleSwappers.sort((a, b) => {
          const coWeekdaysA = weekdays.filter(day => lockedShifts[a.emp.id]?.[day.day] === 'CO' || lockedShifts[a.emp.id]?.[day.day] === 'CIC').length;
          const coWeekdaysB = weekdays.filter(day => lockedShifts[b.emp.id]?.[day.day] === 'CO' || lockedShifts[b.emp.id]?.[day.day] === 'CIC').length;
          const targetHoursA = Math.round(Math.max(0, workingDays - coWeekdaysA) * 8 * a.emp.norm);
          const targetHoursB = Math.round(Math.max(0, workingDays - coWeekdaysB) * 8 * b.emp.norm);
          
          const ratioA = targetHoursA > 0 ? hoursTracker[a.emp.id] / targetHoursA : 0;
          const ratioB = targetHoursB > 0 ? hoursTracker[b.emp.id] / targetHoursB : 0;
          
          return ratioA - ratioB;
        });

        const selected = eligibleSwappers[0];
        
        // Swap: 
        // 1. Assign '8' to the weekend day
        shifts[selected.emp.id][d] = '8';
        // 2. Compensatory rest on the weekday
        shifts[selected.emp.id][selected.weekdayToSwap] = '-';
        
        assignedDayCount++;
      }
    });
  });

  return shifts;
}
