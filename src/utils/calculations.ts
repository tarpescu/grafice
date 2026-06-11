export interface Employee {
  id: string;
  name: string;
  role: 'MED' | 'AS';
  norm: number; // e.g. 1.0, 0.75, 0.5
  active: boolean;
  shiftPattern?: 'normal' | '8h';
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
  isHoliday: boolean;
}

// Helper to get all Romanian legal holidays for a given year as YYYY-MM-DD strings
export function getRomanianLegalHolidays(year: number): Set<string> {
  const holidays = new Set<string>();
  
  const addFixed = (m: number, d: number) => {
    holidays.add(`${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  };

  addFixed(1, 1);   // Anul Nou
  addFixed(1, 2);   // Anul Nou
  addFixed(1, 6);   // Boboteaza
  addFixed(1, 7);   // Sf. Ioan
  addFixed(1, 24);  // Ziua Unirii
  addFixed(5, 1);   // Ziua Muncii
  addFixed(6, 1);   // Ziua Copilului
  addFixed(8, 15);  // Sf. Maria
  addFixed(11, 30); // Sf. Andrei
  addFixed(12, 1);  // Ziua Nationala
  addFixed(12, 25); // Craciun
  addFixed(12, 26); // Craciun

  // Orthodox Easter calculation
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const julianMonth = Math.floor((d + e + 114) / 31);
  const julianDay = ((d + e + 114) % 31) + 1;
  const offset = Math.floor(year / 100) - Math.floor(year / 400) - 2;
  
  // Orthodox Easter Sunday Date
  const easter = new Date(year, julianMonth - 1, julianDay + offset);
  
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const da = String(date.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  };

  // Good Friday (Vinerea Mare) - 2 days before Easter
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.add(formatDate(goodFriday));

  // Easter Sunday and Easter Monday
  holidays.add(formatDate(easter));
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays.add(formatDate(easterMonday));

  // Pentecost Sunday & Monday (Rusalii) - 50 & 51 days after Easter
  const pentecostSunday = new Date(easter);
  pentecostSunday.setDate(easter.getDate() + 50);
  holidays.add(formatDate(pentecostSunday));

  const pentecostMonday = new Date(pentecostSunday);
  pentecostMonday.setDate(pentecostSunday.getDate() + 1);
  holidays.add(formatDate(pentecostMonday));

  return holidays;
}

// Helper to get all days in a month along with weekend and holiday info
export function getDaysInMonth(year: number, month: number): DayInfo[] {
  const date = new Date(year, month + 1, 0);
  const numDays = date.getDate();
  const days: DayInfo[] = [];
  const holidays = getRomanianLegalHolidays(year);
  
  const formatDate = (d: number) => {
    const y = year;
    const mo = String(month + 1).padStart(2, '0');
    const da = String(d).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  };

  for (let d = 1; d <= numDays; d++) {
    const dayDate = new Date(year, month, d);
    const dayOfWeek = dayDate.getDay();
    const dateStr = formatDate(d);
    days.push({
      day: d,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dayOfWeek,
      isHoliday: holidays.has(dateStr),
    });
  }
  return days;
}

// Helper to get number of working days in a month (excluding weekends and legal holidays on weekdays)
export function getWorkingDaysCount(year: number, month: number): number {
  const days = getDaysInMonth(year, month);
  // Filter out weekends and legal holidays that fall on a weekday
  return days.filter(d => !d.isWeekend && !d.isHoliday).length;
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
  const workingDays = getWorkingDaysCount(year, month);
  const computedContractHours = Math.round(workingDays * 8 * employee.norm);

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
  
  if (totalWorked > computedContractHours) {
    const totalOvertime = totalWorked - computedContractHours;
    // Overtime 100% has priority. Overtime 50% is the remaining overtime.
    overtime50 = Math.max(0, totalOvertime - overtime100);
  }

  // Calculate unworked hours (if they worked less than contract)
  if (totalWorked < computedContractHours) {
    unworkedHours = computedContractHours - totalWorked;
  }

  return {
    totalWorked,
    nightHours,
    overtime50,
    overtime100,
    unworkedHours,
  };
}
