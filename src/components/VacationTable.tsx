import { useState } from 'react';
import type { Employee, ShiftType } from '../utils/calculations';
import { getDaysInMonth } from '../utils/calculations';
import { Printer, FileDown, Trash2, CalendarRange, Table2, Upload, Download } from 'lucide-react';
import { ROMANIAN_MONTHS, MONTH_NAMES, MONTH_SHORT_NAMES } from '../utils/constants';
import { downloadAsJson, importFromJsonFile } from '../utils/fileHelpers';
import { PrintSignatures } from './PrintSignatures';

export interface EmployeeVacationInfo {
  jobTitle: string;
  seniorityTotal: string;
  seniorityUnit: string;
  vacationDaysAllowed: string;
  monthlyPlanned: { [month: number]: string };
}

export interface VacationPlanningState {
  [employeeId: string]: EmployeeVacationInfo;
}

export interface VacationMetadata {
  registrationNumber: string;
  registrationDate: string;
  section: string;
}

interface VacationTableProps {
  employees: Employee[];
  vacationPlanning: VacationPlanningState;
  metadata: VacationMetadata;
  year: number;
  onUpdateVacation: (employeeId: string, fields: Partial<EmployeeVacationInfo>) => void;
  onUpdateMetadata: (fields: Partial<VacationMetadata>) => void;
  onClearVacations: () => void;
  shifts: { [employeeId: string]: { [day: number]: ShiftType } };
  onShiftChange: (employeeId: string, day: number, shift: ShiftType) => void;
  onBatchShiftChange: (employeeId: string, days: { day: number; shift: ShiftType }[]) => void;
  activeMonth: number;
  subTab: 'anual' | 'lunar';
  setSubTab: (subTab: 'anual' | 'lunar') => void;
  onImportVacations: (vacationShifts: { [employeeId: string]: { [day: number]: ShiftType } }) => void;
}

export const VacationTable = ({
  employees,
  vacationPlanning,
  metadata,
  year,
  onUpdateVacation,
  onUpdateMetadata,
  onClearVacations,
  shifts,
  onShiftChange,
  onBatchShiftChange,
  activeMonth,
  subTab,
  setSubTab,
  onImportVacations,
}: VacationTableProps) => {
  const daysInfo = getDaysInMonth(year, activeMonth);

  const handlePrint = () => {
    window.print();
  };
  const handleExportPDF = () => {
    const originalTitle = document.title;
    document.title = subTab === 'anual' 
      ? `grafic-concedii-anual-${year}` 
      : `grafic-concedii-${MONTH_NAMES[activeMonth].toLowerCase()}-${year}`;
    window.print();
    document.title = originalTitle;
  };

  const handleExportVacations = () => {
    const vacationShifts: { [employeeId: string]: { [day: number]: ShiftType } } = {};
    Object.keys(shifts).forEach((empId) => {
      const empShifts = shifts[empId] || {};
      const empVacations: { [day: number]: ShiftType } = {};
      Object.keys(empShifts).forEach((dStr) => {
        const day = Number(dStr);
        const shift = empShifts[day];
        if (shift === 'CO' || shift === 'CIC') {
          empVacations[day] = shift;
        }
      });
      if (Object.keys(empVacations).length > 0) {
        vacationShifts[empId] = empVacations;
      }
    });

    const dataToExport = {
      type: 'grafic-concedii',
      year,
      month: activeMonth,
      shifts: vacationShifts
    };
    const fileName = `grafic-concedii-${ROMANIAN_MONTHS[activeMonth]}-${year}.json`;
    downloadAsJson(dataToExport, fileName);
  };

  const handleImportVacationsClick = () => {
    importFromJsonFile({
      expectedYear: year,
      expectedMonth: activeMonth,
      dataKey: 'shifts',
      onImport: (importedShifts) => {
        onImportVacations(importedShifts as { [employeeId: string]: { [day: number]: ShiftType } });
      },
      successMessage: 'Planificarea de concedii a fost importată cu succes!',
      mismatchLabel: 'concedii'
    });
  };

  // Helper to load all shifts from memory & localStorage to calculate scheduled CO days
  const getYearShifts = () => {
    const yearShifts: { [month: number]: { [employeeId: string]: { [day: number]: ShiftType } } } = {};
    for (let m = 0; m < 12; m++) {
      if (m === activeMonth) {
        yearShifts[m] = shifts;
      } else {
        const saved = localStorage.getItem(`spital_shifts_${year}_${m}`);
        yearShifts[m] = saved ? JSON.parse(saved) : {};
      }
    }
    return yearShifts;
  };

  const yearShiftsData = getYearShifts();

  // Count scheduled vacation days (CO and CIC) for an employee in a specific month
  const countScheduledDays = (empId: string, monthIdx: number): number => {
    const empShifts = yearShiftsData[monthIdx]?.[empId] || {};
    return Object.values(empShifts).filter(s => s === 'CO' || s === 'CIC').length;
  };

  // Get total allowed days allowed for an employee
  const calculateTotalPlanned = (empId: string): number => {
    const data = vacationPlanning[empId];
    if (!data || !data.monthlyPlanned) return 0;
    return Object.values(data.monthlyPlanned).reduce((sum, val) => {
      const parsed = parseInt(val, 10);
      return sum + (isNaN(parsed) ? 0 : parsed);
    }, 0);
  };

  // Get total actual scheduled days for an employee across the entire year
  const calculateTotalScheduled = (empId: string): number => {
    let total = 0;
    for (let m = 0; m < 12; m++) {
      total += countScheduledDays(empId, m);
    }
    return total;
  };

  // Monthly Grid Configurations

  const [vacationEmpId, setVacationEmpId] = useState<string>('');
  const [vacationType, setVacationType] = useState<'CO' | 'CIC'>('CO');
  const [vacationStartDay, setVacationStartDay] = useState<number>(1);
  const [vacationEndDay, setVacationEndDay] = useState<number>(1);

  const handleApplyVacation = () => {
    if (!vacationEmpId) {
      alert("Vă rugăm să selectați un salariat!");
      return;
    }
    const maxDay = daysInfo.length;
    const startDay = Math.min(vacationStartDay, maxDay);
    const endDay = Math.min(vacationEndDay, maxDay);
    if (startDay < 1 || startDay > maxDay || endDay < 1 || endDay > maxDay) {
      alert("Zilele selectate sunt în afara limitelor lunii!");
      return;
    }
    if (startDay > endDay) {
      alert("Ziua de început nu poate fi mai mare decât ziua de sfârșit!");
      return;
    }
    const batchDays: { day: number; shift: ShiftType }[] = [];
    for (let d = startDay; d <= endDay; d++) {
      batchDays.push({ day: d, shift: vacationType });
    }
    onBatchShiftChange(vacationEmpId, batchDays);
    const empName = employees.find(e => e.id === vacationEmpId)?.name || '';
    alert(`S-a aplicat concediul de tip ${vacationType} pentru ${empName} în perioada ${startDay}-${endDay} ${MONTH_NAMES[activeMonth]}.`);
    setVacationEmpId('');
  };

  return (
    <div className="table-actions-container">
      {/* Action Buttons & Sub-Tabs Navigation (No print) */}
      <div className="no-print toolbar-container">
        <div className="toolbar-group">
          {/* Sub-Tabs Selector */}
          <div className="filter-tabs-container">
            <button
              onClick={() => setSubTab('anual')}
              className={`filter-tab ${subTab === 'anual' ? 'active' : ''}`}
            >
              <Table2 size={14} style={{ marginRight: '4px' }} />
              Tabel Anual (Programare)
            </button>
            <button
              onClick={() => setSubTab('lunar')}
              className={`filter-tab ${subTab === 'lunar' ? 'active' : ''}`}
            >
              <CalendarRange size={14} style={{ marginRight: '4px' }} />
              Planificare Lunară (1-31)
            </button>
          </div>

          {subTab === 'anual' && (
            <button 
              onClick={onClearVacations} 
              className="btn btn-secondary" 
              style={{ color: '#ef4444' }}
            >
              <Trash2 size={16} />
              Șterge Programări
            </button>
          )}
        </div>

        <div className="toolbar-group-small">
          {subTab === 'lunar' && (
            <>
              <button onClick={handleImportVacationsClick} className="btn btn-secondary" title="Importă planificare concedii din fișier JSON">
                <Upload size={16} />
                Importă Concedii
              </button>
              <button onClick={handleExportVacations} className="btn btn-secondary" title="Exportă planificare concedii în format JSON">
                <Download size={16} />
                Exportă Concedii
              </button>
            </>
          )}
          <button onClick={handlePrint} className="btn btn-secondary">
            <Printer size={16} />
            Imprimă
          </button>
          <button onClick={handleExportPDF} className="btn btn-secondary">
            <FileDown size={16} />
            Exportă PDF
          </button>
        </div>
      </div>

      {/* Main Table Wrapper */}
      <div className="table-wrapper">
        
        {/* ======================================================== */}
        {/* MODE 1: ANNUAL SUMMARY TABLE                             */}
        {/* ======================================================== */}
        {subTab === 'anual' && (
          <>
            {/* Printable/Display Header */}
            <div className="vacation-header">
              <div className="vacation-header-top">
                <div className="vacation-header-left">
                  <h2>SPITALUL MUNICIPAL DE URGENȚĂ PAȘCANI</h2>
                  <div className="registration-input-container">
                    <span>Nr.</span>
                    <input
                      type="text"
                      value={metadata.registrationNumber}
                      onChange={(e) => onUpdateMetadata({ registrationNumber: e.target.value })}
                      placeholder="35861"
                      className="inline-header-input reg-number"
                    />
                    <span>/</span>
                    <input
                      type="text"
                      value={metadata.registrationDate}
                      onChange={(e) => onUpdateMetadata({ registrationDate: e.target.value })}
                      placeholder="30.12.2025"
                      className="inline-header-input reg-date"
                    />
                  </div>
                </div>
                <div className="vacation-header-right">
                  <input
                    type="text"
                    value={metadata.section}
                    onChange={(e) => onUpdateMetadata({ section: e.target.value })}
                    placeholder="SECȚIE ATI"
                    className="inline-header-input section-name"
                  />
                </div>
              </div>
              <div className="vacation-header-title">
                <h1>PROGRAMARE CONCEDII DE ODIHNĂ PE ANUL {year}</h1>
              </div>
            </div>

            {/* The Vacation Table */}
            <table className="schedule-table vacation-table">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: '45px' }}>Nr. crt</th>
                  <th rowSpan={2} className="col-name" style={{ width: '170px' }}>Numele și prenumele</th>
                  <th rowSpan={2} style={{ width: '110px' }}>Funcția</th>
                  <th colSpan={2}>Vechime la 31.12.{year}</th>
                  <th rowSpan={2} style={{ width: '75px' }}>Zile CO/an</th>
                  <th colSpan={12}>Programare concediu de odihnă pe luni - nr.zile/lună</th>
                  <th rowSpan={2} style={{ width: '60px' }} className="no-print-col">Prog. Total</th>
                  <th rowSpan={2} style={{ width: '60px' }} className="no-print-col">Grafic Total</th>
                  <th rowSpan={2} style={{ width: '90px' }}>Semnătură salariat</th>
                </tr>
                <tr>
                  <th style={{ width: '55px' }}>totală</th>
                  <th style={{ width: '55px' }}>în unit.</th>
                  {MONTH_SHORT_NAMES.map((m, idx) => (
                    <th key={idx} style={{ width: '40px', fontSize: '9px' }}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => {
                  const info = vacationPlanning[emp.id] || {
                    jobTitle: 'asistent pr.',
                    seniorityTotal: '',
                    seniorityUnit: '',
                    vacationDaysAllowed: '',
                    monthlyPlanned: {}
                  };

                  const totalPlanned = calculateTotalPlanned(emp.id);
                  const totalScheduled = calculateTotalScheduled(emp.id);

                  return (
                    <tr key={emp.id}>
                      <td>{idx + 1}</td>
                      <td className="col-name">{emp.name}</td>
                      <td>
                        <input
                          type="text"
                          value={info.jobTitle}
                          onChange={(e) => onUpdateVacation(emp.id, { jobTitle: e.target.value })}
                          className="table-cell-input text-left"
                          placeholder="Funcția"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={info.seniorityTotal}
                          onChange={(e) => onUpdateVacation(emp.id, { seniorityTotal: e.target.value })}
                          className="table-cell-input text-center"
                          placeholder="Ex: 14/11"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={info.seniorityUnit}
                          onChange={(e) => onUpdateVacation(emp.id, { seniorityUnit: e.target.value })}
                          className="table-cell-input text-center"
                          placeholder="Ex: 9/7"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={info.vacationDaysAllowed}
                          onChange={(e) => onUpdateVacation(emp.id, { vacationDaysAllowed: e.target.value })}
                          className="table-cell-input text-center"
                          placeholder="Ex: 30+3+5"
                        />
                      </td>

                      {/* Monthly Input Columns */}
                      {Array.from({ length: 12 }).map((_, mIdx) => {
                        const val = info.monthlyPlanned?.[mIdx] || '';
                        const scheduled = countScheduledDays(emp.id, mIdx);
                        return (
                          <td key={mIdx} className="vacation-cell">
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => {
                                const updatedMonthly = {
                                  ...(info.monthlyPlanned || {}),
                                  [mIdx]: e.target.value
                                };
                                onUpdateVacation(emp.id, { monthlyPlanned: updatedMonthly });
                              }}
                              className="table-cell-input text-center"
                              placeholder=""
                            />
                            {/* Small badge to show how many days are scheduled in the shifts grid */}
                            {scheduled > 0 && (
                              <span className="scheduled-badge-count" title={`${scheduled} zile planificate în graficul de gărzi`}>
                                {scheduled}g
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Dynamic Total Planned Column (No print) */}
                      <td style={{ fontWeight: 600 }} className="no-print-col">
                        {totalPlanned > 0 ? totalPlanned : ''}
                      </td>

                      {/* Dynamic Total Scheduled Column (No print) */}
                      <td style={{ fontWeight: 600, color: '#166534' }} className="no-print-col">
                        {totalScheduled > 0 ? totalScheduled : ''}
                      </td>

                      {/* Signature Column */}
                      <td className="signature-cell-placeholder"></td>
                    </tr>
                  );
                })}

                {employees.length === 0 && (
                  <tr>
                    <td colSpan={22} style={{ padding: '2rem', color: 'var(--color-text-secondary)' }}>
                      Vă rugăm să adăugați personal din panoul "Personal & Setări" pentru a genera planificarea concediilor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Legal Disclaimers (Romanian labor law) */}
            <div className="vacation-disclaimer">
              <p>nr.zile = durata efectivă a CO + fidelitate (la fiecare 5 ani în aceeași unitate, câte o zi) + condiții de muncă</p>
              <p>În anul {year}, concediul de odihnă suplimentar pentru condiții deosebite este de 5 zile lucrătoare conform OUG nr.36/2025 art.II.</p>
              <p>Concediul de odihnă se acordă proporțional cu timpul efectiv lucrat.</p>
              <p>Conform prevederilor Legii nr.53/2003 - Codul muncii:</p>
              <ul>
                <li>Salariatul este obligat să efectueze în natură concediul de odihnă în perioada în care a fost programat, cu excepția situațiilor expres prevăzute de lege sau atunci când, din motive obiective, concediul nu poate fi efectuat.</li>
                <li>Concediul de odihnă se efectuează în fiecare an.</li>
                <li>În cazul în care salariatul, din motive justificate, nu poate efectua, integral sau parțial, concediul de odihnă anual la care avea dreptul în anul calendaristic respectiv, cu acordul persoanei în cauză, angajatorul este obligat să acorde concediul de odihnă neefectuat întră-o perioadă de 18 luni începând cu anul următor celui în care s-a născut dreptul la concediul de odihnă anual.</li>
              </ul>
            </div>

            {/* Printable/Display Signatures */}
            <PrintSignatures className="vacation-signatures" />
          </>
        )}

        {/* ======================================================== */}
        {/* MODE 2: MONTHLY 1-31 CALENDAR PLANNING GRID               */}
        {/* ======================================================== */}
        {subTab === 'lunar' && (
          <>
            {/* Printable Header Info */}
            <div className="print-only-header">
              <div className="print-header-top">
                <div>
                  <h2>SPITAL MUNICIPAL PAȘCANI</h2>
                  <h3>SECȚIA: ATI</h3>
                </div>
                <div className="print-header-right">
                  <h2>PLANIFICARE CONCEDII DE ODIHNĂ</h2>
                  <h3>LUNA: {MONTH_NAMES[activeMonth].toUpperCase()} {year}</h3>
                </div>
              </div>
              <p className="print-only-header-p">
                PROGRAMARE CALENDARISTICĂ CONCEDII (CO / CIC)
              </p>
            </div>

            {/* Planificare Rapidă Concediu (Perioadă) */}
            <div className="no-print vacation-planner-inline-card">
              <div className="card-title-small">Planificare Rapidă Concediu (Perioadă)</div>
              <div className="inline-form-row">
                <div className="form-group">
                  <label htmlFor="vacationEmpId">Salariat</label>
                  <select
                    id="vacationEmpId"
                    value={vacationEmpId}
                    onChange={(e) => setVacationEmpId(e.target.value)}
                  >
                    <option value="">-- Alege Salariat --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="vacationType">Tip Concediu</label>
                  <select
                    id="vacationType"
                    value={vacationType}
                    onChange={(e) => setVacationType(e.target.value as 'CO' | 'CIC')}
                  >
                    <option value="CO">CO (Odihnă)</option>
                    <option value="CIC">CIC (Creștere Copil)</option>
                  </select>
                </div>

                <div className="form-group-short">
                  <label htmlFor="vacationStartDay">De la ziua</label>
                  <select
                    id="vacationStartDay"
                    value={Math.min(vacationStartDay, daysInfo.length)}
                    onChange={(e) => setVacationStartDay(Number(e.target.value))}
                  >
                    {daysInfo.map((d) => (
                      <option key={d.day} value={d.day}>
                        {d.day}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group-short">
                  <label htmlFor="vacationEndDay">Până la ziua</label>
                  <select
                    id="vacationEndDay"
                    value={Math.min(vacationEndDay, daysInfo.length)}
                    onChange={(e) => setVacationEndDay(Number(e.target.value))}
                  >
                    {daysInfo.map((d) => (
                      <option key={d.day} value={d.day}>
                        {d.day}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleApplyVacation}
                  className="btn btn-primary apply-vacation-btn"
                >
                  Aplică Concediu
                </button>
              </div>
            </div>
            <table className="schedule-table vacation-calendar-grid">
              <colgroup>
                <col style={{ width: '25px' }} />
                <col style={{ width: '130px' }} />
                <col style={{ width: '35px' }} />
                {daysInfo.map((d) => (
                  <col key={d.day} style={{ width: '18px' }} />
                ))}
                <col style={{ width: '50px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Nr. Crt</th>
                  <th className="col-name" style={{ minWidth: '150px' }}>Numele și prenumele</th>
                  <th style={{ width: '50px' }}>Funcția</th>
                  {daysInfo.map((d) => (
                    <th key={d.day} className={`${d.isWeekend ? 'weekend' : ''} ${d.isHoliday ? 'legal-holiday' : ''}`} style={{ fontSize: '9px', padding: '3px' }}>
                      {d.day}
                    </th>
                  ))}
                  <th style={{ width: '60px' }}>Total Zile (Lunare)</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, index) => {
                  const empShifts = yearShiftsData[activeMonth]?.[emp.id] || {};
                  
                  // Calculate total vacation days scheduled this month
                  const totalCOThisMonth = Object.values(empShifts).filter(s => s === 'CO' || s === 'CIC').length;

                  return (
                    <tr key={emp.id}>
                      <td>{index + 1}</td>
                      <td className="col-name">{emp.name}</td>
                      <td>{emp.role}</td>

                      {/* 1-31 Days Columns */}
                      {daysInfo.map((d) => {
                        const shift = empShifts[d.day] || '-';
                        // Keep only vacation types (CO/CIC) or free (-)
                        const activeVal = (shift === 'CO' || shift === 'CIC') ? shift : '-';

                        return (
                          <td 
                            key={d.day} 
                            className={`${d.isWeekend ? 'weekend' : ''} ${d.isHoliday ? 'legal-holiday' : ''} shift-cell shift-${activeVal} cell-nopadding`}
                          >
                            <span className="print-only-value">{activeVal === '-' ? '' : activeVal}</span>
                            <select
                              value={activeVal}
                              onChange={(e) => {
                                const newVal = e.target.value as ShiftType;
                                onShiftChange(emp.id, d.day, newVal);
                              }}
                              className="no-print-select"
                            >
                              <option value="-">-</option>
                              <option value="CO">CO</option>
                              <option value="CIC">CIC</option>
                            </select>
                          </td>
                        );
                      })}

                      <td style={{ fontWeight: 600, color: '#166534' }}>
                        {totalCOThisMonth > 0 ? `${totalCOThisMonth} zile` : ''}
                      </td>
                    </tr>
                  );
                })}

                {employees.length === 0 && (
                  <tr>
                    <td colSpan={35} style={{ padding: '2rem', color: 'var(--color-text-secondary)' }}>
                      Vă rugăm să adăugați personal din panoul "Personal & Setări" pentru a vizualiza tabelul.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Printable Signatures */}
            <PrintSignatures />
          </>
        )}

      </div>
    </div>
  );
};
