import type { Employee, ShiftType } from './calculations';
import { getDaysInMonth } from './calculations';

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
  
  // Initialize shifts structure
  const shifts: { [employeeId: string]: { [day: number]: ShiftType } } = {};
  
  // Track accumulated hours per employee during generation
  const hoursTracker: { [employeeId: string]: number } = {};
  
  employees.forEach((emp) => {
    shifts[emp.id] = {};
    hoursTracker[emp.id] = 0;
    
    // Copy locked/manual shifts first (e.g. CO, CIC, or custom user shifts)
    days.forEach((dayInfo) => {
      const locked = lockedShifts[emp.id]?.[dayInfo.day];
      if (locked && locked !== '-') {
        shifts[emp.id][dayInfo.day] = locked;
        // Add hours to tracker
        if (locked === 'Z' || locked === 'N') hoursTracker[emp.id] += 12;
        if (locked === '8') hoursTracker[emp.id] += 8;
      } else {
        shifts[emp.id][dayInfo.day] = '-';
      }
    });
  });

  // Schedule day by day
  days.forEach((dayInfo) => {
    const d = dayInfo.day;

    // We process each role separately
    (['MED', 'AS'] as const).forEach((role) => {
      const roleReq = requirements[role];
      const roleEmployees = employees.filter((emp) => emp.active && emp.role === role);

      // Determine how many Day / Night shifts are already locked for this day
      let assignedDayCount = 0;
      let assignedNightCount = 0;

      roleEmployees.forEach((emp) => {
        const existing = shifts[emp.id][d];
        if (existing === 'Z' || existing === '8') assignedDayCount++;
        if (existing === 'N') assignedNightCount++;
      });

      // 1. Schedule Night Shifts first (as they have stricter rest constraints)
      const nightsNeeded = Math.max(0, roleReq.nightShifts - assignedNightCount);
      for (let n = 0; n < nightsNeeded; n++) {
        // Find eligible employees for night shift
        const candidates = roleEmployees.filter((emp) => {
          // Must not already have a shift today
          if (shifts[emp.id][d] !== '-') return false;
          // Must not have worked N yesterday
          if (d > 1 && shifts[emp.id][d - 1] === 'N') return false;
          // Must not have N scheduled tomorrow (if locked)
          if (d < days.length && shifts[emp.id][d + 1] === 'N') return false;
          
          return true;
        });

        if (candidates.length === 0) break; // No candidates available

        // Sort candidates:
        // Priority to employees who are furthest behind their contract hours
        // Add a tiny bit of randomness to avoid scheduling the same pattern every time
        candidates.sort((a, b) => {
          const ratioA = hoursTracker[a.id] / a.contractHours;
          const ratioB = hoursTracker[b.id] / b.contractHours;
          return ratioA - ratioB + (Math.random() * 0.1 - 0.05);
        });

        const selected = candidates[0];
        shifts[selected.id][d] = 'N';
        hoursTracker[selected.id] += 12;
      }

      // 2. Schedule Day Shifts
      const daysNeeded = Math.max(0, roleReq.dayShifts - assignedDayCount);
      for (let df = 0; df < daysNeeded; df++) {
        // Find eligible employees for day shift
        const candidates = roleEmployees.filter((emp) => {
          // Must not already have a shift today
          if (shifts[emp.id][d] !== '-') return false;
          // Must not have worked N yesterday
          if (d > 1 && shifts[emp.id][d - 1] === 'N') return false;

          return true;
        });

        if (candidates.length === 0) break;

        // Sort candidates by lowest hour ratio
        candidates.sort((a, b) => {
          const ratioA = hoursTracker[a.id] / a.contractHours;
          const ratioB = hoursTracker[b.id] / b.contractHours;
          return ratioA - ratioB + (Math.random() * 0.1 - 0.05);
        });

        const selected = candidates[0];
        // Decide whether to assign Z (12h) or 8 (8h) based on what's closer to matching target
        // For ATI, typical shifts are Z (12h) or 8h. Let's use Z (12h) on weekends, and Z or 8 on weekdays.
        const shiftType: ShiftType = dayInfo.isWeekend ? 'Z' : '8';
        shifts[selected.id][d] = shiftType;
        hoursTracker[selected.id] += shiftType === 'Z' ? 12 : 8;
      }
    });
  });

  return shifts;
}
