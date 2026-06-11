import { useState, useEffect } from 'react';
import type { Employee, ShiftType } from './utils/calculations';
import { autoGenerateSchedule, validateSchedule } from './utils/scheduler';
import type { ValidationWarning, SchedulerRequirements } from './utils/scheduler';
import { StaffManager } from './components/StaffManager';
import { ScheduleTable } from './components/ScheduleTable';
import { Calendar, Settings, X } from 'lucide-react';

const INITIAL_ROSTER: Employee[] = [
  { id: '1', name: 'APOSTOL FLORENTINA', role: 'AS', norm: 0.75, active: true, shiftPattern: 'normal' },
  { id: '2', name: 'ARSENIE TATIANA', role: 'AS', norm: 0.7, active: true, shiftPattern: 'normal' },
  { id: '3', name: 'BOLOHAN CARMEN', role: 'AS', norm: 1.0, active: true, shiftPattern: 'normal' },
  { id: '4', name: 'BUTA VALENTINA', role: 'AS', norm: 0.5, active: true, shiftPattern: 'normal' },
  { id: '5', name: 'IRINA DANIELA', role: 'AS', norm: 0.6, active: true, shiftPattern: 'normal' },
  { id: '6', name: 'NISTOR LĂCRĂMIOARA', role: 'AS', norm: 0.65, active: true, shiftPattern: 'normal' },
  { id: '7', name: 'TÂRPESCU DANA', role: 'AS', norm: 0.75, active: true, shiftPattern: 'normal' },
  { id: '8', name: 'ȘERBAN MONICA', role: 'AS', norm: 0.5, active: true, shiftPattern: 'normal' },
  { id: '9', name: 'VASILIU FLORIN', role: 'AS', norm: 0.75, active: true, shiftPattern: 'normal' },
  { id: '10', name: 'INSURĂȚELU CRISTINA', role: 'AS', norm: 1.0, active: true, shiftPattern: 'normal' },
  { id: '11', name: 'APOSTOL ELENA', role: 'AS', norm: 1.0, active: true, shiftPattern: 'normal' },
  { id: '12', name: 'CRIȘU TUDORIȚA', role: 'AS', norm: 1.0, active: true, shiftPattern: 'normal' },
  { id: '13', name: 'GRIGORE GABRIELA', role: 'AS', norm: 1.0, active: true, shiftPattern: 'normal' },
  { id: '14', name: 'IRIMIA MIHAELA', role: 'AS', norm: 1.0, active: true, shiftPattern: 'normal' },
  { id: '15', name: 'ELEFTERIU MIHAELA', role: 'AS', norm: 1.0, active: true, shiftPattern: 'normal' },
  { id: '16', name: 'CLIMINTE LUMINIȚA', role: 'AS', norm: 0.75, active: true, shiftPattern: 'normal' },
  { id: '17', name: 'GRECU MIRELA', role: 'AS', norm: 1.0, active: true, shiftPattern: 'normal' },
  { id: '18', name: 'DAMIAN ANA MARIA', role: 'AS', norm: 0.8, active: true, shiftPattern: 'normal' },
  { id: '19', name: 'UNGUREANU SERGIU', role: 'MED', norm: 0.8, active: true, shiftPattern: 'normal' }
];

function App() {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('spital_employees');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate legacy employees that have contractHours but no norm
        const migrated = parsed.map((emp: any) => {
          if (emp.norm === undefined) {
            let norm = 1.0;
            const ch = emp.contractHours || 168;
            if (ch >= 160) norm = 1.0;
            else if (ch >= 135) norm = 0.8;
            else if (ch >= 125) norm = 0.75;
            else if (ch >= 115) norm = 0.7;
            else if (ch >= 105) norm = 0.65;
            else if (ch >= 95) norm = 0.6;
            else norm = 0.5;
            
            return {
              id: emp.id,
              name: emp.name,
              role: emp.role,
              active: emp.active ?? true,
              shiftPattern: emp.shiftPattern || 'normal',
              norm
            };
          }
          return emp;
        });
        localStorage.setItem('spital_employees', JSON.stringify(migrated));
        return migrated;
      } catch (e) {
        console.error('Failed to parse employees', e);
      }
    }
    localStorage.setItem('spital_employees', JSON.stringify(INITIAL_ROSTER));
    return INITIAL_ROSTER;
  });

  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(5); // June is 5 (0-indexed)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 1024);
  
  // Vacation Planner States
  const [vacationEmpId, setVacationEmpId] = useState<string>('');
  const [vacationType, setVacationType] = useState<'CO' | 'CIC'>('CO');
  const [vacationStartDay, setVacationStartDay] = useState<number>(1);
  const [vacationEndDay, setVacationEndDay] = useState<number>(1);
  
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
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse requirements', e);
      }
    }
    const defaultReqs = {
      MED: { dayShifts: 1, nightShifts: 1 },
      AS: { dayShifts: 3, nightShifts: 3 },
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

  // Handle range vacation planning (CO/CIC)
  const handleApplyVacation = () => {
    if (!vacationEmpId) return;
    if (vacationStartDay > vacationEndDay) {
      alert("Ziua de început nu poate fi mai mare decât ziua de sfârșit!");
      return;
    }

    const updated = { ...shifts };
    if (!updated[vacationEmpId]) {
      updated[vacationEmpId] = {};
    }

    for (let d = vacationStartDay; d <= vacationEndDay; d++) {
      updated[vacationEmpId][d] = vacationType;
    }

    setShifts(updated);
    saveShifts(updated);

    const empName = employees.find(e => e.id === vacationEmpId)?.name || '';
    alert(`S-a aplicat concediul de tip ${vacationType} pentru ${empName} în perioada ${vacationStartDay}-${vacationEndDay}.`);
  };

  // Run the TS automatic scheduler algorithm
  const handleAutoGenerate = () => {
    const result = autoGenerateSchedule(employees, year, month, shifts, reqs);
    setShifts(result);
    saveShifts(result);
  };

  // Clear all shifts in the active grid
  const handleClearSchedule = () => {
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

  // Update staff member fields (e.g. shiftPattern, norm, role)
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

  // Get days list for the active month to populate vacation date dropdowns
  const dateObj = new Date(year, month + 1, 0);
  const numDays = dateObj.getDate();
  const daysList = Array.from({ length: numDays }, (_, i) => i + 1);

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
              year={year}
              month={month}
            />

            {/* Vacation Planner Card */}
            <div className="card no-print">
              <div className="card-title">
                <span>Planificare Concediu (CO / CIC)</span>
                <Calendar size={18} />
              </div>
              
              <div className="staff-form">
                <div className="form-group">
                  <label htmlFor="vacation-employee">Angajat</label>
                  <select
                    id="vacation-employee"
                    value={vacationEmpId}
                    onChange={(e) => setVacationEmpId(e.target.value)}
                  >
                    <option value="">Alege angajat...</option>
                    {employees.filter(e => e.active).map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                    ))}
                  </select>
                </div>

                <div className="staff-form-row">
                  <div className="form-group">
                    <label htmlFor="vacation-type">Tip Concediu</label>
                    <select
                      id="vacation-type"
                      value={vacationType}
                      onChange={(e) => setVacationType(e.target.value as 'CO' | 'CIC')}
                    >
                      <option value="CO">CO (Odihnă)</option>
                      <option value="CIC">CIC (Creștere Copil)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="vacation-start">De la ziua</label>
                    <select
                      id="vacation-start"
                      value={vacationStartDay}
                      onChange={(e) => setVacationStartDay(Number(e.target.value))}
                    >
                      {daysList.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="vacation-end">Până la ziua</label>
                    <select
                      id="vacation-end"
                      value={vacationEndDay}
                      onChange={(e) => setVacationEndDay(Number(e.target.value))}
                    >
                      {daysList.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleApplyVacation}
                  disabled={!vacationEmpId}
                  style={{ marginTop: '0.5rem' }}
                >
                  Aplică Concediu
                </button>
              </div>
            </div>
          </div>

          {/* Coverage Configuration panel */}
          <div className="card no-print">
            <div className="card-title">
              <span>Necesar Zilnic Ture</span>
              <Settings size={18} />
            </div>
            
            <div className="form-sections">
              <div>
                <h4 className="settings-section-title">Medici (MED)</h4>
                <div className="input-row">
                  <div className="form-group">
                    <label>Zi / Tura 8h</label>
                    <input
                      type="number"
                      min={0}
                      value={reqs.MED.dayShifts}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setReqs(prev => {
                          const updated = {
                            ...prev,
                            MED: { ...prev.MED, dayShifts: val }
                          };
                          updateRequirements(updated);
                          return updated;
                        });
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Noapte (12h)</label>
                    <input
                      type="number"
                      min={0}
                      value={reqs.MED.nightShifts}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setReqs(prev => {
                          const updated = {
                            ...prev,
                            MED: { ...prev.MED, nightShifts: val }
                          };
                          updateRequirements(updated);
                          return updated;
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="settings-section-title">Asistenți (AS)</h4>
                <div className="input-row">
                  <div className="form-group">
                    <label>Zi / Tura 8h</label>
                    <input
                      type="number"
                      min={0}
                      value={reqs.AS.dayShifts}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setReqs(prev => {
                          const updated = {
                            ...prev,
                            AS: { ...prev.AS, dayShifts: val }
                          };
                          updateRequirements(updated);
                          return updated;
                        });
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Noapte (12h)</label>
                    <input
                      type="number"
                      min={0}
                      value={reqs.AS.nightShifts}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setReqs(prev => {
                          const updated = {
                            ...prev,
                            AS: { ...prev.AS, nightShifts: val }
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
          />
          
          {/* Month & Year Selectors Aligned Bottom Right */}
          <div className="no-print month-selector-card">
            <Calendar size={16} className="calendar-icon-secondary" />
            <span>Selectează Luna:</span>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'].map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
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
