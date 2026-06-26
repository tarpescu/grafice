/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
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
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('spital_employees');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse employees', e);
      }
    }
    localStorage.setItem('spital_employees', JSON.stringify(INITIAL_ROSTER));
    return INITIAL_ROSTER;
  });

  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(5); // June is 5 (0-indexed)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<'pontaj' | 'concedii'>('pontaj');
  const [vacationSubTab, setVacationSubTab] = useState<'anual' | 'lunar'>('anual');

  // Vacation Planning States
  const [vacationPlanning, setVacationPlanning] = useState<VacationPlanningState>(() => {
    const saved = localStorage.getItem('spital_vacations_2026');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse vacations', e);
      }
    }
    return {};
  });

  const [vacationMetadata, setVacationMetadata] = useState<VacationMetadata>(() => {
    const saved = localStorage.getItem('spital_vacation_metadata_2026');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse vacation metadata', e);
      }
    }
    return {
      registrationNumber: '',
      registrationDate: '',
      section: 'SECȚIE ATI',
    };
  });


  const [shifts, setShifts] = useState<{ [employeeId: string]: { [day: number]: ShiftType } }>(() => {
    const saved = localStorage.getItem('spital_shifts_2026_5');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse shifts', e);
      }
    }
    return {};
  });

  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);

  const [reqs, setReqs] = useState<SchedulerRequirements>(() => {
    const saved = localStorage.getItem('spital_requirements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.AS && parsed.AS.dayShifts !== undefined) {
          // Migrate old schema to new schema
          const migrated = {
            AS: {
              minDayShifts: parsed.AS.dayShifts,
              maxDayShifts: parsed.AS.dayShifts,
              minNightShifts: parsed.AS.nightShifts,
              maxNightShifts: parsed.AS.nightShifts,
            }
          };
          localStorage.setItem('spital_requirements', JSON.stringify(migrated));
          return migrated;
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse requirements', e);
      }
    }
    const defaultReqs = {
      AS: { minDayShifts: 2, maxDayShifts: 3, minNightShifts: 2, maxNightShifts: 3 },
    };
    localStorage.setItem('spital_requirements', JSON.stringify(defaultReqs));
    return defaultReqs;
  });

  // Sync state and localStorage when year/month changes
  useEffect(() => {
    const saved = localStorage.getItem(`spital_shifts_${year}_${month}`);
    if (saved) {
      try {
        setShifts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse shifts', e);
        setShifts({});
      }
    } else {
      setShifts({});
    }
  }, [year, month]);

  // Sync vacation planning state when year changes
  useEffect(() => {
    const saved = localStorage.getItem(`spital_vacations_${year}`);
    if (saved) {
      try {
        setVacationPlanning(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse vacations', e);
        setVacationPlanning({});
      }
    } else {
      setVacationPlanning({});
    }

    const savedMeta = localStorage.getItem(`spital_vacation_metadata_${year}`);
    if (savedMeta) {
      try {
        setVacationMetadata(JSON.parse(savedMeta));
      } catch (e) {
        console.error('Failed to parse vacation metadata', e);
        setVacationMetadata({ registrationNumber: '', registrationDate: '', section: 'SECȚIE ATI' });
      }
    } else {
      setVacationMetadata({ registrationNumber: '', registrationDate: '', section: 'SECȚIE ATI' });
    }
  }, [year]);

  const handleUpdateVacation = (employeeId: string, fields: Partial<EmployeeVacationInfo>) => {
    setVacationPlanning((prev) => {
      const existing = prev[employeeId] || {
        jobTitle: '',
        seniorityTotal: '',
        seniorityUnit: '',
        vacationDaysAllowed: '',
        monthlyPlanned: {}
      };
      const updated = {
        ...prev,
        [employeeId]: {
          ...existing,
          ...fields,
        }
      };
      localStorage.setItem(`spital_vacations_${year}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateMetadata = (fields: Partial<VacationMetadata>) => {
    setVacationMetadata((prev) => {
      const updated = {
        ...prev,
        ...fields
      };
      localStorage.setItem(`spital_vacation_metadata_${year}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearVacations = () => {
    if (window.confirm("Sigur doriți să ștergeți toate programările de concediu pentru acest an?")) {
      setVacationPlanning({});
      localStorage.setItem(`spital_vacations_${year}`, JSON.stringify({}));
    }
  };

  // Re-run validation whenever shifts, month, or roster changes
  useEffect(() => {
    const warns = validateSchedule(employees, shifts, year, month);
    setWarnings(warns);
  }, [shifts, employees, year, month]);

  // Save shifts to local storage
  const saveShifts = (updatedShifts: typeof shifts) => {
    localStorage.setItem(`spital_shifts_${year}_${month}`, JSON.stringify(updatedShifts));
  };

  // Save coverage targets to local storage
  const updateRequirements = (newReqs: SchedulerRequirements) => {
    localStorage.setItem('spital_requirements', JSON.stringify(newReqs));
    setReqs(newReqs);
  };

  // Handle manual shift updates
  const handleShiftChange = (employeeId: string, day: number, newShift: ShiftType) => {
    const updated = {
      ...shifts,
      [employeeId]: {
        ...(shifts[employeeId] || {}),
        [day]: newShift,
      },
    };
    setShifts(updated);
    saveShifts(updated);
  };

  // Handle batch shift updates (e.g. applying vacation to a range of days)
  const handleBatchShiftChange = (employeeId: string, days: { day: number; shift: ShiftType }[]) => {
    const empShifts = { ...(shifts[employeeId] || {}) };
    for (const entry of days) {
      empShifts[entry.day] = entry.shift;
    }
    const updated = {
      ...shifts,
      [employeeId]: empShifts,
    };
    setShifts(updated);
    saveShifts(updated);
  };

  const handleImportShifts = (importedShifts: { [employeeId: string]: { [day: number]: ShiftType } }) => {
    setShifts(importedShifts);
    saveShifts(importedShifts);
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

      saveShifts(updated);
      return updated;
    });
  };

  // Run the TS automatic scheduler algorithm
  const handleAutoGenerate = () => {
    const result = autoGenerateSchedule(employees, year, month, shifts, reqs);
    setShifts(result);
    saveShifts(result);
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
    saveShifts(cleared);
  };

  // Clear absolutely everything including vacation days
  const handleClearAll = () => {
    const cleared: typeof shifts = {};
    employees.forEach((emp) => {
      cleared[emp.id] = {};
    });
    setShifts(cleared);
    saveShifts(cleared);
  };

  // Add a new staff member
  const handleAddEmployee = (newEmp: Omit<Employee, 'id'>) => {
    const added: Employee = {
      ...newEmp,
      id: Date.now().toString(),
      active: true,
    };
    const updated = [...employees, added];
    setEmployees(updated);
    localStorage.setItem('spital_employees', JSON.stringify(updated));
  };

  // Remove staff member
  const handleRemoveEmployee = (id: string) => {
    const updated = employees.filter((e) => e.id !== id);
    setEmployees(updated);
    localStorage.setItem('spital_employees', JSON.stringify(updated));

    setShifts((prev) => {
      const copy = { ...prev };
      delete copy[id];
      saveShifts(copy);
      return copy;
    });
  };

  // Update staff member fields (e.g. shiftPattern, role)
  const handleUpdateEmployee = (id: string, updatedFields: Partial<Employee>) => {
    const updated = employees.map((emp) => {
      if (emp.id === id) {
        return { ...emp, ...updatedFields };
      }
      return emp;
    });
    setEmployees(updated);
    localStorage.setItem('spital_employees', JSON.stringify(updated));
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

          {/* Coverage Configuration panel */}
          <div className="card no-print">
            <div className="card-title">
              <span>Necesar Zilnic Ture</span>
              <Settings size={18} />
            </div>
            
            <div className="form-sections">
              <div>
                <h4 className="settings-section-title">Asistenți (AS) - Tura de Zi</h4>
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
                <h4 className="settings-section-title">Asistenți (AS) - Tura de Noapte</h4>
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
        </div>
      </div>
    </div>
  );
}

export default App;
