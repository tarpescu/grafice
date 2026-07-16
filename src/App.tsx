import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useToastProvider, ToastContext } from './hooks/useToast';
import type { Employee, ShiftType } from './utils/calculations';
import { autoGenerateSchedule, validateSchedule } from './utils/scheduler';
import type { ValidationWarning, SchedulerRequirements } from './utils/scheduler';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import type { ViewTab } from './components/Sidebar';
import { ScheduleTable } from './components/ScheduleTable';
import { VacationTable } from './components/VacationTable';
import type { VacationPlanningState, VacationMetadata, EmployeeVacationInfo } from './components/VacationTable';
import { ToastContainer } from './components/Toast';
import { ConfirmDialog } from './components/ConfirmDialog';

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
  { id: '18', name: 'DAMIAN ANA MARIA', role: 'AS', active: true, shiftPattern: 'normal' },
];

// Confirm dialog state type
interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  variant: 'danger' | 'warning';
  confirmText: string;
  onConfirm: () => void;
}

function App() {
  const [employees, setEmployees] = useLocalStorage<Employee[]>('spital_employees', INITIAL_ROSTER);
  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(5);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('pontaj');

  // Toast system
  const { toasts, addToast, removeToast } = useToastProvider();

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false, title: '', message: '', variant: 'danger', confirmText: 'Confirmă',
    onConfirm: () => {},
  });

  const showConfirm = useCallback((opts: Omit<ConfirmState, 'open'>) => {
    setConfirmState({ ...opts, open: true });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, open: false }));
  }, []);

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

  // Validation
  useEffect(() => {
    const warns = validateSchedule(employees, shifts, year, month);
    setWarnings(warns);
  }, [shifts, employees, year, month]);

  // Vacation handlers
  const handleUpdateVacation = (employeeId: string, fields: Partial<EmployeeVacationInfo>) => {
    setVacationPlanning((prev) => {
      const existing = prev[employeeId] || {
        jobTitle: '', seniorityTotal: '', seniorityUnit: '',
        vacationDaysAllowed: '', monthlyPlanned: {},
      };
      return { ...prev, [employeeId]: { ...existing, ...fields } };
    });
  };

  const handleUpdateMetadata = (fields: Partial<VacationMetadata>) => {
    setVacationMetadata((prev) => ({ ...prev, ...fields }));
  };

  const handleClearVacations = () => {
    showConfirm({
      title: 'Șterge Programări Concediu',
      message: 'Sigur doriți să ștergeți toate programările de concediu pentru acest an?',
      variant: 'danger',
      confirmText: 'Șterge Tot',
      onConfirm: () => {
        setVacationPlanning({});
        closeConfirm();
        addToast({ type: 'success', title: 'Programări șterse', message: 'Toate programările de concediu au fost șterse.' });
      },
    });
  };

  // Shift handlers
  const handleShiftChange = (employeeId: string, day: number, newShift: ShiftType) => {
    setShifts({
      ...shifts,
      [employeeId]: { ...(shifts[employeeId] || {}), [day]: newShift },
    });
  };

  const handleBatchShiftChange = (employeeId: string, days: { day: number; shift: ShiftType }[]) => {
    const empShifts = { ...(shifts[employeeId] || {}) };
    for (const entry of days) {
      empShifts[entry.day] = entry.shift;
    }
    setShifts({ ...shifts, [employeeId]: empShifts });
  };

  const handleImportShifts = (importedShifts: { [employeeId: string]: { [day: number]: ShiftType } }) => {
    setShifts(importedShifts);
  };

  const handleImportVacations = (importedVacationShifts: { [employeeId: string]: { [day: number]: ShiftType } }) => {
    setShifts((prev) => {
      const updated = { ...prev };
      const allEmpIds = new Set([
        ...employees.map((e) => e.id),
        ...Object.keys(importedVacationShifts),
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

  const handleAutoGenerate = () => {
    const result = autoGenerateSchedule(employees, year, month, shifts, reqs);
    setShifts(result);
    addToast({ type: 'success', title: 'Grafic generat', message: 'Graficul de ture a fost generat automat cu succes!' });
  };

  const handleClearSchedule = () => {
    showConfirm({
      title: 'Șterge Turele',
      message: 'Sigur doriți să ștergeți turele? Concediile (CO/CIC) și Zilele Libere cerute (L) vor fi păstrate.',
      variant: 'warning',
      confirmText: 'Șterge Ture',
      onConfirm: () => {
        const cleared: typeof shifts = {};
        employees.forEach((emp) => {
          const empShifts = shifts[emp.id] || {};
          const preserved: { [day: number]: ShiftType } = {};
          for (const [dayStr, shift] of Object.entries(empShifts)) {
            if (shift === 'CO' || shift === 'CIC' || shift === 'L') {
              preserved[Number(dayStr)] = shift;
            }
          }
          cleared[emp.id] = preserved;
        });
        setShifts(cleared);
        closeConfirm();
        addToast({ type: 'success', title: 'Ture șterse', message: 'Turele au fost șterse. Concediile și liberele au fost păstrate.' });
      },
    });
  };

  const handleClearAll = () => {
    showConfirm({
      title: 'Șterge Absolut Tot',
      message: 'Sigur doriți să ștergeți TOT, inclusiv concediile (CO/CIC)? Aceasta acțiune nu poate fi anulată.',
      variant: 'danger',
      confirmText: 'Șterge Tot',
      onConfirm: () => {
        const cleared: typeof shifts = {};
        employees.forEach((emp) => {
          cleared[emp.id] = {};
        });
        setShifts(cleared);
        closeConfirm();
        addToast({ type: 'success', title: 'Totul a fost șters', message: 'Toate turele și concediile au fost șterse.' });
      },
    });
  };

  // Employee handlers
  const handleAddEmployee = (newEmp: Omit<Employee, 'id'>) => {
    const added: Employee = { ...newEmp, id: Date.now().toString(), active: true };
    setEmployees([...employees, added]);
    addToast({ type: 'success', title: 'Angajat adăugat', message: `${newEmp.name} a fost adăugat(ă) în secție.` });
  };

  const handleRemoveEmployee = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    showConfirm({
      title: 'Șterge Angajat',
      message: `Sigur doriți să ștergeți pe ${emp?.name || 'acest angajat'}? Toate turele asociate vor fi pierdute.`,
      variant: 'danger',
      confirmText: 'Șterge',
      onConfirm: () => {
        setEmployees(employees.filter((e) => e.id !== id));
        setShifts((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
        closeConfirm();
        addToast({ type: 'success', title: 'Angajat șters', message: `${emp?.name} a fost eliminat(ă) din secție.` });
      },
    });
  };

  const handleUpdateEmployee = (id: string, updatedFields: Partial<Employee>) => {
    setEmployees(employees.map((emp) => (emp.id === id ? { ...emp, ...updatedFields } : emp)));
  };

  // Determine which sub-tab is needed for VacationTable
  const vacationSubTab = activeTab === 'concedii-anual' ? 'anual' : 'lunar';

  // Show month selector only when relevant
  const showMonthSelector = activeTab === 'pontaj' || activeTab === 'concedii-lunar';

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      <div className="app-layout">
        {/* Sidebar Backdrop (mobile) */}
        <div
          className={`sidebar-backdrop ${isSidebarOpen ? 'visible' : ''}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          employees={employees}
          onAddEmployee={handleAddEmployee}
          onRemoveEmployee={handleRemoveEmployee}
          onUpdateEmployee={handleUpdateEmployee}
          reqs={reqs}
          onUpdateReqs={setReqs}
        />

        {/* Header */}
        <Header
          month={month}
          year={year}
          onMonthChange={setMonth}
          onYearChange={setYear}
          employeeCount={employees.length}
          warningCount={warnings.length}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          showMonthSelector={showMonthSelector}
        />

        {/* Main Content */}
        <main className="app-content">
          {activeTab === 'pontaj' ? (
            <ScheduleTable
              employees={employees}
              shifts={shifts}
              year={year}
              month={month}
              warnings={warnings}
              onShiftChange={handleShiftChange}
              onAutoGenerate={handleAutoGenerate}
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
              onImportVacations={handleImportVacations}
            />
          )}
        </main>

        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          variant={confirmState.variant}
          confirmText={confirmState.confirmText}
          onConfirm={confirmState.onConfirm}
          onCancel={closeConfirm}
        />
      </div>
    </ToastContext.Provider>
  );
}

export default App;
