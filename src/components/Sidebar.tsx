import type { Employee } from '../utils/calculations';
import type { SchedulerRequirements } from '../utils/scheduler';
import {
  CalendarDays,
  CalendarRange,
  Table2,
  X,
} from 'lucide-react';
import { StaffManager } from './StaffManager';

export type ViewTab = 'pontaj' | 'concedii-anual' | 'concedii-lunar';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  employees: Employee[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onRemoveEmployee: (id: string) => void;
  onUpdateEmployee: (id: string, fields: Partial<Employee>) => void;
  reqs: SchedulerRequirements;
  onUpdateReqs: (reqs: SchedulerRequirements) => void;
}

const ShiftConfigInput = ({
  label,
  value,
  onDecrease,
  onIncrease
}: {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) => (
  <div className="form-group">
    <label>{label}</label>
    <div className="custom-number-input">
      <button type="button" onClick={onDecrease}>-</button>
      <input type="number" value={value} readOnly />
      <button type="button" onClick={onIncrease}>+</button>
    </div>
  </div>
);

export const Sidebar = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  employees,
  onAddEmployee,
  onRemoveEmployee,
  onUpdateEmployee,
  reqs,
  onUpdateReqs,
}: SidebarProps) => {
  const NAV_ITEMS: { id: ViewTab; label: string; icon: typeof CalendarDays }[] = [
    { id: 'pontaj', label: 'Grafic de Ture', icon: CalendarDays },
    { id: 'concedii-anual', label: 'Concedii — Tabel Anual', icon: Table2 },
    { id: 'concedii-lunar', label: 'Concedii — Lunar', icon: CalendarRange },
  ];

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo / Brand */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-11.5 -10.23174 23 20.46348"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            className="animate-spin-slow"
            style={{ animation: 'spin 15s linear infinite' }}
          >
            <circle cx="0" cy="0" r="2.05" fill="currentColor" />
            <g>
              <ellipse rx="11" ry="4.2" />
              <ellipse rx="11" ry="4.2" transform="rotate(60)" />
              <ellipse rx="11" ry="4.2" transform="rotate(120)" />
            </g>
          </svg>
        </div>
        <div className="sidebar-brand">
          <h2>Grafice ATI</h2>
          <p>Spital Municipal Pașcani</p>
        </div>
        <button className="sidebar-close-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Navigare</div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => {
              onTabChange(item.id);
              onClose();
            }}
          >
            <item.icon size={18} className="nav-icon" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Scrollable Content */}
      <div className="sidebar-content">
        {/* Shift Requirements Config */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Asistenți per Tură</div>
          <div className="sidebar-config">
            <div className="sidebar-config-group">
              <h4>Tura de Zi</h4>
              <div className="sidebar-config-row">
                <ShiftConfigInput
                  label="Minim"
                  value={reqs.AS.minDayShifts}
                  onDecrease={() => {
                    const val = Math.max(0, reqs.AS.minDayShifts - 1);
                    onUpdateReqs({ ...reqs, AS: { ...reqs.AS, minDayShifts: val, maxDayShifts: Math.max(val, reqs.AS.maxDayShifts) } });
                  }}
                  onIncrease={() => {
                    const val = reqs.AS.minDayShifts + 1;
                    onUpdateReqs({ ...reqs, AS: { ...reqs.AS, minDayShifts: val, maxDayShifts: Math.max(val, reqs.AS.maxDayShifts) } });
                  }}
                />
                <ShiftConfigInput
                  label="Maxim"
                  value={reqs.AS.maxDayShifts}
                  onDecrease={() => {
                    const val = Math.max(reqs.AS.minDayShifts, reqs.AS.maxDayShifts - 1);
                    onUpdateReqs({ ...reqs, AS: { ...reqs.AS, maxDayShifts: val } });
                  }}
                  onIncrease={() => {
                    onUpdateReqs({ ...reqs, AS: { ...reqs.AS, maxDayShifts: reqs.AS.maxDayShifts + 1 } });
                  }}
                />
              </div>
            </div>
            <div className="sidebar-config-group">
              <h4>Tura de Noapte</h4>
              <div className="sidebar-config-row">
                <ShiftConfigInput
                  label="Minim"
                  value={reqs.AS.minNightShifts}
                  onDecrease={() => {
                    const val = Math.max(0, reqs.AS.minNightShifts - 1);
                    onUpdateReqs({ ...reqs, AS: { ...reqs.AS, minNightShifts: val, maxNightShifts: Math.max(val, reqs.AS.maxNightShifts) } });
                  }}
                  onIncrease={() => {
                    const val = reqs.AS.minNightShifts + 1;
                    onUpdateReqs({ ...reqs, AS: { ...reqs.AS, minNightShifts: val, maxNightShifts: Math.max(val, reqs.AS.maxNightShifts) } });
                  }}
                />
                <ShiftConfigInput
                  label="Maxim"
                  value={reqs.AS.maxNightShifts}
                  onDecrease={() => {
                    const val = Math.max(reqs.AS.minNightShifts, reqs.AS.maxNightShifts - 1);
                    onUpdateReqs({ ...reqs, AS: { ...reqs.AS, maxNightShifts: val } });
                  }}
                  onIncrease={() => {
                    onUpdateReqs({ ...reqs, AS: { ...reqs.AS, maxNightShifts: reqs.AS.maxNightShifts + 1 } });
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Staff Manager */}
        <StaffManager
          employees={employees}
          onAddEmployee={onAddEmployee}
          onRemoveEmployee={onRemoveEmployee}
          onUpdateEmployee={onUpdateEmployee}
        />
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        Grafice Spital v2.0
      </div>
    </aside>
  );
};
