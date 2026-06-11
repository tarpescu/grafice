export interface Employee {
  id: string;
  name: string;
  role: 'MED' | 'AS';
  contractHours: number; // e.g. 168
  active: boolean;
}

export type ShiftType = 'Z' | 'N' | '8' | 'CO' | 'CIC' | 'L' | '-';

export interface MonthSchedule {
  year: number;
  month: number; // 0-11 (Jan is 0, Dec is 11)
  // employeeId -> day (1..31) -> ShiftType
  shifts: { [employeeId: string]: { [day: number]: ShiftType } };
}

export interface DayInfo {
  day: number;
  isWeekend: boolean;
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
}

// Helper to get all days in a month along with weekend info
export function getDaysInMonth(year: number, month: number): DayInfo[] {
  const date = new Date(year, month + 1, 0);
  const numDays = date.getDate();
  const days: DayInfo[] = [];
  
  for (let d = 1; d <= numDays; d++) {
    const dayDate = new Date(year, month, d);
    const dayOfWeek = dayDate.getDay();
    days.push({
      day: d,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dayOfWeek,
    });
  }
  return days;
}

export interface EmployeeCalculations {
  totalWorked: number;
  nightHours: number;
  overtime50: number;
  overtime100: number;
  unworkedHours: number;
}

export function calculateEmployeeHours(
  employee: Employee,
  employeeShifts: { [day: number]: ShiftType },
  year: number,
  month: number
): EmployeeCalculations {
  const days = getDaysInMonth(year, month);
  let totalWorked = 0;
  let nightHours = 0;
  let overtime100 = 0; // Weekend hours
  let unworkedHours = 0;

  days.forEach((dayInfo) => {
    const shift = employeeShifts[dayInfo.day] || '-';
    let shiftHours = 0;
    let shiftNight = 0;

    switch (shift) {
      case 'Z':
        shiftHours = 12;
        shiftNight = 0;
        break;
      case 'N':
        shiftHours = 12;
        shiftNight = 8; // Standard 8 hours of night (22:00 - 06:00)
        break;
      case '8':
        shiftHours = 8;
        shiftNight = 0;
        break;
      case 'CO':
      case 'CIC':
        // Concediu - doesn't count as worked hours in the "Total ore lucrate" column
        // but it is not "unworked" in a negative sense. However, let's track it
        break;
      case 'L':
      case '-':
      default:
        break;
    }

    totalWorked += shiftHours;
    nightHours += shiftNight;

    // Weekend hours count as 100% overtime
    if (dayInfo.isWeekend && shiftHours > 0) {
      overtime100 += shiftHours;
    }
  });

  // Overtime 50% is when total hours exceed the contract hours, excluding weekend hours already counted at 100%
  let overtime50 = 0;
  
  if (totalWorked > employee.contractHours) {
    const totalOvertime = totalWorked - employee.contractHours;
    // Overtime 100% has priority. Overtime 50% is the remaining overtime.
    overtime50 = Math.max(0, totalOvertime - overtime100);
  }

  // Calculate unworked hours (if they worked less than contract)
  if (totalWorked < employee.contractHours) {
    unworkedHours = employee.contractHours - totalWorked;
  }

  return {
    totalWorked,
    nightHours,
    overtime50,
    overtime100,
    unworkedHours,
  };
}
