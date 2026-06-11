import { useState, useEffect } from 'react';
import type { Employee, ShiftType } from './utils/calculations';
import { autoGenerateSchedule, validateSchedule } from './utils/scheduler';
import type { ValidationWarning, SchedulerRequirements } from './utils/scheduler';
import { StaffManager } from './components/StaffManager';
import { ScheduleTable } from './components/ScheduleTable';
import { Calendar, Settings } from 'lucide-react';

function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(5); // June is 5 (0-indexed)
  
  // employeeId -> day -> shift
  const [shifts, setShifts] = useState<{ [employeeId: string]: { [day: number]: ShiftType } }>({});
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);

  // Configurable daily coverage requirements
  const [reqs, setReqs] = useState<SchedulerRequirements>({
    MED: { dayShifts: 1, nightShifts: 1 },
    AS: { dayShifts: 3, nightShifts: 3 },
  });

  // API Call: Fetch roster
  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setEmployees([]);
    }
  };

  // API Call: Fetch requirements
  const fetchRequirements = async () => {
    try {
      const res = await fetch('/api/requirements');
      const data = await res.json();
      setReqs(data);
    } catch (err) {
      console.error('Error fetching requirements:', err);
    }
  };

  // API Call: Fetch shifts
  const fetchShifts = async () => {
    try {
      const res = await fetch(`/api/shifts?year=${year}&month=${month}`);
      const data = await res.json();
      setShifts(data);
    } catch (err) {
      console.error('Error fetching shifts:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchRequirements();
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [year, month]);

  // Re-run validation whenever shifts, month, or roster changes
  useEffect(() => {
    const warns = validateSchedule(employees, shifts, year, month);
    setWarnings(warns);
  }, [shifts, employees, year, month]);

  // API Call: Save shifts
  const saveShifts = async (updatedShifts: typeof shifts) => {
    try {
      await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, shifts: updatedShifts }),
      });
    } catch (err) {
      console.error('Error saving shifts:', err);
    }
  };

  // API Call: Save coverage targets
  const updateRequirements = async (newReqs: SchedulerRequirements) => {
    try {
      await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReqs),
      });
    } catch (err) {
      console.error('Error saving requirements:', err);
    }
  };

  // Handle manual shift updates
  const handleShiftChange = async (employeeId: string, day: number, newShift: ShiftType) => {
    const updated = {
      ...shifts,
      [employeeId]: {
        ...(shifts[employeeId] || {}),
        [day]: newShift,
      },
    };
    setShifts(updated);
    await saveShifts(updated);
  };

  // Run the TS automatic scheduler algorithm
  const handleAutoGenerate = async () => {
    const result = autoGenerateSchedule(employees, year, month, shifts, reqs);
    setShifts(result);
    await saveShifts(result);
  };

  // Clear all shifts in the active grid
  const handleClearSchedule = async () => {
    const cleared: typeof shifts = {};
    employees.forEach((emp) => {
      cleared[emp.id] = {};
    });
    setShifts(cleared);
    await saveShifts(cleared);
  };

  // Add a new staff member
  const handleAddEmployee = async (newEmp: Omit<Employee, 'id'>) => {
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmp),
      });
      const added = await res.json();
      setEmployees((prev) => [...prev, added]);
    } catch (err) {
      console.error('Error adding employee:', err);
    }
  };

  // Remove staff member
  const handleRemoveEmployee = async (id: string) => {
    try {
      await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      });
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      setShifts((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (err) {
      console.error('Error removing employee:', err);
    }
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
