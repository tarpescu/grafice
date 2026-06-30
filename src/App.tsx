import { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Employee, ShiftType } from './utils/calculations';
import { autoGenerateSchedule, validateSchedule } from './utils/scheduler';
import type { ValidationWarning, SchedulerRequirements } from './utils/scheduler';
import { StaffManager } from './components/StaffManager';
import { ScheduleTable } from './components/ScheduleTable';
import { VacationTable } from './components/VacationTable';
import type { VacationPlanningState, VacationMetadata, EmployeeVacationInfo } from './components/VacationTable';
import { Calendar, Settings, X } from 'lucide-react';

const INITIAL_ROSTER: Employee[] = [
  { id: '1', name: 'APOSTOL FLORENTINA', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '2', name: 'ARSENIE TATIANA', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '3', name: 'BOLOHAN CARMEN', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '4', name: 'BUTA VALENTINA', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '5', name: 'IRINA DANIELA', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '6', name: 'NISTOR LĂCRĂMIOARA', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '7', name: 'TÂRPESCU DANA', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '8', name: 'ȘERBAN MONICA', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '9', name: 'VASILIU FLORIN', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '10', name: 'INSURĂȚELU CRISTINA', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '11', name: 'APOSTOL ELENA', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '12', name: 'CRIȘU TUDORIȚA', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '13', name: 'GRIGORE GABRIELA', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '14', name: 'IRIMIA MIHAELA', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '15', name: 'ELEFTERIU MIHAELA', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '16', name: 'CLIMINTE LUMINIȚA', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '17', name: 'GRECU MIRELA', role: 'AS', active: true, shiftPattern: 'normal' },
  { id: '18', name: 'DAMIAN ANA MARIA', role: 'AS', active: true, shiftPattern: 'normal' }
];

function App() {
  const [employees, setEmployees] = useLocalStorage<Employee[]>('spital_employees', INITIAL_ROSTER);

  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(5); // June is 5 (0-indexed)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<'pontaj' | 'concedii'>('pontaj');
  const [vacationSubTab, setVacationSubTab] = useState<'anual' | 'lunar'>('anual');

  // Vacation Planning States
  const [vacationPlanning, setVacationPlanning] = useLocalStorage<VacationPlanningState>(`spital_vacations_${year}`, {});

  const [vacationMetadata, setVacationMetadata] = useLocalStorage<VacationMetadata>(`spital_vacation_metadata_${year}`, {
    registrationNumber: '',
    registrationDate: '',
    section: 'SECȚIE ATI',
  });

  const [shifts, setShifts] = useLocalStorage<{ [employeeId: string]: { [day: number]: ShiftType } }>(`spital_shifts_${year}_${month}`, {});

  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);

  const [reqs, setReqs] = useLocalStorage<SchedulerRequirements>('spital_requirements', {
    AS: { minDayShifts: 2, maxDayShifts: 3, minNightShifts: 2, maxNightShifts: 3 },
  });

  const handleUpdateVacation = (employeeId: string, fields: Partial<EmployeeVacationInfo>) => {
    setVacationPlanning((prev) => {
      const existing = prev[employeeId] || {
        jobTitle: '',
        seniorityTotal: '',
        seniorityUnit: '',
        vacationDaysAllowed: '',
        monthlyPlanned: {}
      };
      return {
        ...prev,
        [employeeId]: {
          ...existing,
          ...fields,
        }
      };
    });
  };

  const handleUpdateMetadata = (fields: Partial<VacationMetadata>) => {
    setVacationMetadata((prev) => ({
      ...prev,
      ...fields
    }));
  };

  const handleClearVacations = () => {
    if (window.confirm("Sigur doriți să ștergeți toate programările de concediu pentru acest an?")) {
      setVacationPlanning({});
    }
  };

  // Re-run validation whenever shifts, month, or roster changes
  useEffect(() => {
    const warns = validateSchedule(employees, shifts, year, month);
    setWarnings(warns);
  }, [shifts, employees, year, month]);

  // Save coverage targets
  const updateRequirements = (newReqs: SchedulerRequirements) => {
    setReqs(newReqs);
  };

  // Handle manual shift updates
  const handleShiftChange = (employeeId: string, day: number, newShift: ShiftType) => {
    setShifts({
      ...shifts,
      [employeeId]: {
        ...(shifts[employeeId] || {}),
        [day]: newShift,
      },
    });
  };

  // Handle batch shift updates (e.g. applying vacation to a range of days)
  const handleBatchShiftChange = (employeeId: string, days: { day: number; shift: ShiftType }[]) => {
    const empShifts = { ...(shifts[employeeId] || {}) };
    for (const entry of days) {
      empShifts[entry.day] = entry.shift;
    }
    setShifts({
      ...shifts,
      [employeeId]: empShifts,
    });
  };

  const handleImportShifts = (importedShifts: { [employeeId: string]: { [day: number]: ShiftType } }) => {
    setShifts(importedShifts);
  };

  const handleImportVacations = (importedVacationShifts: { [employeeId: string]: { [day: number]: ShiftType } }) => {
    setShifts((prev) => {
      const updated = { ...prev };
      const allEmpIds = new Set([
        ...employees.map(e => e.id),
        ...Object.keys(importedVacationShifts)
      ]);

      allEmpIds.forEach((empId) => {
        const currentEmpShifts = { ...(updated[empId] || {}) };
        const importedEmpShifts = importedVacationShifts[empId] || {};

        for (let day = 1; day <= 31; day++) {
          const importedShift = importedEmpShifts[day];
          const currentShift = currentEmpShifts[day] || '-';

          if (importedShift === 'CO' || importedShift === 'CIC') {
            currentEmpShifts[day] = importedShift;
          } else if (currentShift === 'CO' || currentShift === 'CIC') {
            currentEmpShifts[day] = '-';
          }
        }
        updated[empId] = currentEmpShifts;
      });

      return updated;
    });
  };

  // Run the TS automatic scheduler algorithm
  const handleAutoGenerate = () => {
    const result = autoGenerateSchedule(employees, year, month, shifts, reqs);
    setShifts(result);
  };

  // Clear shifts but preserve vacation days (CO/CIC)
  const handleClearSchedule = () => {
    const cleared: typeof shifts = {};
    employees.forEach((emp) => {
      const empShifts = shifts[emp.id] || {};
      const preserved: { [day: number]: ShiftType } = {};
      for (const [dayStr, shift] of Object.entries(empShifts)) {
        if (shift === 'CO' || shift === 'CIC') {
          preserved[Number(dayStr)] = shift;
        }
      }
      cleared[emp.id] = preserved;
    });
    setShifts(cleared);
  };

  // Clear absolutely everything including vacation days
  const handleClearAll = () => {
    const cleared: typeof shifts = {};
    employees.forEach((emp) => {
      cleared[emp.id] = {};
    });
    setShifts(cleared);
  };

  // Add a new staff member
  const handleAddEmployee = (newEmp: Omit<Employee, 'id'>) => {
    const added: Employee = {
      ...newEmp,
      id: Date.now().toString(),
      active: true,
    };
    setEmployees([...employees, added]);
  };

  // Remove staff member
  const handleRemoveEmployee = (id: string) => {
    setEmployees(employees.filter((e) => e.id !== id));

    setShifts((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // Update staff member fields (e.g. shiftPattern, role)
  const handleUpdateEmployee = (id: string, updatedFields: Partial<Employee>) => {
    setEmployees(employees.map((emp) => {
      if (emp.id === id) {
        return { ...emp, ...updatedFields };
      }
      return emp;
    }));
  };

  return (
    <div className="app-container">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="no-print sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Dashboard Layout */}
      <div className={`dashboard-grid ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Left Side Controls (Staff & Requirements) */}
        <div className="sidebar-container no-print">
          {/* Modal close button */}
          <button
            className="modal-close-btn no-print"
            onClick={() => setIsSidebarOpen(false)}
            title="Închide"
          >
            <X size={20} />
          </button>

          <div className="left-column">
            <StaffManager
              employees={employees}
              onAddEmployee={handleAddEmployee}
              onRemoveEmployee={handleRemoveEmployee}
              onUpdateEmployee={handleUpdateEmployee}
            />


          </div>

        </div>

        {/* Right Side Schedule Grid */}
        <div className="right-column">
          {/* Tab Navigation Menu */}
          <div className="no-print tabs-navigation-container">
            <button
              className={`tab-nav-btn ${activeTab === 'pontaj' ? 'active' : ''}`}
              onClick={() => setActiveTab('pontaj')}
            >
              Grafic de Ture
            </button>
            <button
              className={`tab-nav-btn ${activeTab === 'concedii' ? 'active' : ''}`}
              onClick={() => setActiveTab('concedii')}
            >
              Programare Concedii (CO)
            </button>
          </div>

          {activeTab === 'pontaj' ? (
            <ScheduleTable
              employees={employees}
              shifts={shifts}
              year={year}
              month={month}
              warnings={warnings}
              onShiftChange={handleShiftChange}
              onAutoGenerate={handleAutoGenerate}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              isSidebarOpen={isSidebarOpen}
              onClearSchedule={handleClearSchedule}
              onClearAll={handleClearAll}
              onImportShifts={handleImportShifts}
            />
          ) : (
            <VacationTable
              employees={employees}
              vacationPlanning={vacationPlanning}
              metadata={vacationMetadata}
              year={year}
              onUpdateVacation={handleUpdateVacation}
              onUpdateMetadata={handleUpdateMetadata}
              onClearVacations={handleClearVacations}
              shifts={shifts}
              onShiftChange={handleShiftChange}
              onBatchShiftChange={handleBatchShiftChange}
              activeMonth={month}
              subTab={vacationSubTab}
              setSubTab={setVacationSubTab}
              onImportVacations={handleImportVacations}
            />
          )}

          {/* Month & Year Selectors Aligned Bottom Right */}
          <div className="no-print month-selector-card">
            <Calendar size={16} className="calendar-icon-secondary" />
            {(activeTab === 'pontaj' || (activeTab === 'concedii' && vacationSubTab === 'lunar')) ? (
              <>
                <span>Selectează Luna:</span>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'].map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>
                <span>Selectează Anul:</span>
              </>
            ) : (
              <span>Selectează Anul:</span>
            )}
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Coverage Configuration panel */}
          <div className="card no-print" style={{ marginTop: '1.5rem' }}>
            <div className="card-title">
              <span>Asistenti per tura</span>
              <Settings size={18} />
            </div>

            <div className="form-sections">
              <div>
                <h4 className="settings-section-title">Asistenți - Tura de Zi</h4>
                <div className="input-row">
                  <div className="form-group">
                    <label>Minim</label>
                    <input
                      type="number"
                      min={0}
                      value={reqs.AS.minDayShifts}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setReqs(prev => {
                          const maxVal = Math.max(val, prev.AS.maxDayShifts);
                          const updated = {
                            ...prev,
                            AS: { ...prev.AS, minDayShifts: val, maxDayShifts: maxVal }
                          };
                          updateRequirements(updated);
                          return updated;
                        });
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Maxim</label>
                    <input
                      type="number"
                      min={reqs.AS.minDayShifts}
                      value={reqs.AS.maxDayShifts}
                      onChange={(e) => {
                        const val = Math.max(reqs.AS.minDayShifts, Number(e.target.value));
                        setReqs(prev => {
                          const updated = {
                            ...prev,
                            AS: { ...prev.AS, maxDayShifts: val }
                          };
                          updateRequirements(updated);
                          return updated;
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem' }}>
                <h4 className="settings-section-title">Asistenți - Tura de Noapte</h4>
                <div className="input-row">
                  <div className="form-group">
                    <label>Minim</label>
                    <input
                      type="number"
                      min={0}
                      value={reqs.AS.minNightShifts}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setReqs(prev => {
                          const maxVal = Math.max(val, prev.AS.maxNightShifts);
                          const updated = {
                            ...prev,
                            AS: { ...prev.AS, minNightShifts: val, maxNightShifts: maxVal }
                          };
                          updateRequirements(updated);
                          return updated;
                        });
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Maxim</label>
                    <input
                      type="number"
                      min={reqs.AS.minNightShifts}
                      value={reqs.AS.maxNightShifts}
                      onChange={(e) => {
                        const val = Math.max(reqs.AS.minNightShifts, Number(e.target.value));
                        setReqs(prev => {
                          const updated = {
                            ...prev,
                            AS: { ...prev.AS, maxNightShifts: val }
                          };
                          updateRequirements(updated);
                          return updated;
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
