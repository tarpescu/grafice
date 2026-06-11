import { useState, useEffect } from 'react';
import type { Employee, ShiftType } from './utils/calculations';
import { autoGenerateSchedule, validateSchedule } from './utils/scheduler';
import type { ValidationWarning, SchedulerRequirements } from './utils/scheduler';
import { StaffManager } from './components/StaffManager';
import { ScheduleTable } from './components/ScheduleTable';
import { Calendar, Settings } from 'lucide-react';

const INITIAL_ROSTER: Employee[] = [
  { id: '1', name: 'APOSTOL FLORENTINA', role: 'AS', contractHours: 128, active: true },
  { id: '2', name: 'ARSENIE TATIANA', role: 'AS', contractHours: 120, active: true },
  { id: '3', name: 'BOLOHAN CARMEN', role: 'AS', contractHours: 168, active: true },
  { id: '4', name: 'BUTA VALENTINA', role: 'AS', contractHours: 88, active: true },
  { id: '5', name: 'IRINA DANIELA', role: 'AS', contractHours: 104, active: true },
  { id: '6', name: 'NISTOR LĂCRĂMIOARA', role: 'AS', contractHours: 112, active: true },
  { id: '7', name: 'TÂRPESCU DANA', role: 'AS', contractHours: 128, active: true },
  { id: '8', name: 'ȘERBAN MONICA', role: 'AS', contractHours: 88, active: true },
  { id: '9', name: 'VASILIU FLORIN', role: 'AS', contractHours: 128, active: true },
  { id: '10', name: 'INSURĂȚELU CRISTINA', role: 'AS', contractHours: 168, active: true },
  { id: '11', name: 'APOSTOL ELENA', role: 'AS', contractHours: 168, active: true },
  { id: '12', name: 'CRIȘU TUDORIȚA', role: 'AS', contractHours: 168, active: true },
  { id: '13', name: 'GRIGORE GABRIELA', role: 'AS', contractHours: 168, active: true },
  { id: '14', name: 'IRIMIA MIHAELA', role: 'AS', contractHours: 168, active: true },
  { id: '15', name: 'ELEFTERIU MIHAELA', role: 'AS', contractHours: 168, active: true },
  { id: '16', name: 'CLIMINTE LUMINIȚA', role: 'AS', contractHours: 128, active: true },
  { id: '17', name: 'GRECU MIRELA', role: 'AS', contractHours: 168, active: true },
  { id: '18', name: 'DAMIAN ANA MARIA', role: 'AS', contractHours: 140, active: true },
  { id: '19', name: 'UNGUREANU SERGIU', role: 'MED', contractHours: 140, active: true }
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

  return (
    <div className="app-container">
      {/* Main Dashboard Layout */}
      <div className="dashboard-grid">
        {/* Left Side Controls (Staff & Requirements) */}
        <div className="sidebar-container">
          
          <StaffManager
            employees={employees}
            onAddEmployee={handleAddEmployee}
            onRemoveEmployee={handleRemoveEmployee}
          />

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
