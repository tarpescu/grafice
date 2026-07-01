import { useState } from 'react';
import type { Employee } from '../utils/calculations';
import type { SchedulerRequirements } from '../utils/scheduler';
import {
  CalendarDays,
  CalendarRange,
  Table2,
  UserPlus,
  Trash2,
  X,
  Activity,
} from 'lucide-react';

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
  const [newName, setNewName] = useState('');
  const [newPattern, setNewPattern] = useState<'normal' | '8h'>('normal');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddEmployee({
      name: newName.trim(),
      role: 'AS',
      active: true,
      shiftPattern: newPattern,
    });
    setNewName('');
  };

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
          <Activity size={18} />
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
        {/* Staff Manager */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Gestiune Personal</div>

          <form onSubmit={handleAddSubmit} className="sidebar-staff-form">
            <input
              type="text"
              placeholder="Nume și Prenume (ex: POPESCU IONELA)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <div className="form-row">
              <select
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value as 'normal' | '8h')}
              >
                <option value="normal">Zi/Noapte/8h/4h</option>
                <option value="8h">Doar 8h</option>
              </select>
              <button type="submit" className="sidebar-add-btn" style={{ width: 'auto', flex: '0 0 auto' }}>
                <UserPlus size={14} />
              </button>
            </div>
          </form>

          <div className="sidebar-staff-count">
            {employees.length} angajați în secție
          </div>

          <div className="sidebar-staff-list">
            {employees.map((emp) => (
              <div key={emp.id} className="sidebar-staff-item">
                <span className="staff-name" title={emp.name}>{emp.name}</span>
                <button
                  className={`staff-pattern-badge ${emp.shiftPattern === '8h' ? 'eight-h' : 'normal'}`}
                  onClick={() =>
                    onUpdateEmployee(emp.id, {
                      shiftPattern: emp.shiftPattern === '8h' ? 'normal' : '8h',
                    })
                  }
                  title="Click pentru a schimba modelul de tură"
                >
                  {emp.shiftPattern === '8h' ? '8H' : 'Z/N'}
                </button>
                <button
                  className="staff-delete-btn"
                  onClick={() => onRemoveEmployee(emp.id)}
                  title="Șterge angajat"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {employees.length === 0 && (
              <div className="sidebar-staff-count" style={{ textAlign: 'center', padding: '1rem 0' }}>
                Niciun angajat înregistrat.
              </div>
            )}
          </div>
        </div>

        {/* Shift Requirements Config */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Asistenți per Tură</div>
          <div className="sidebar-config">
            <div className="sidebar-config-group">
              <h4>Tura de Zi</h4>
              <div className="sidebar-config-row">
                <div className="form-group">
                  <label>Minim</label>
                  <div className="custom-number-input">
                    <button 
                      type="button" 
                      onClick={() => {
                        const val = Math.max(0, reqs.AS.minDayShifts - 1);
                        const maxVal = Math.max(val, reqs.AS.maxDayShifts);
                        onUpdateReqs({
                          ...reqs,
                          AS: { ...reqs.AS, minDayShifts: val, maxDayShifts: maxVal },
                        });
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={reqs.AS.minDayShifts}
                      readOnly
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        const val = reqs.AS.minDayShifts + 1;
                        const maxVal = Math.max(val, reqs.AS.maxDayShifts);
                        onUpdateReqs({
                          ...reqs,
                          AS: { ...reqs.AS, minDayShifts: val, maxDayShifts: maxVal },
                        });
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Maxim</label>
                  <div className="custom-number-input">
                    <button 
                      type="button" 
                      onClick={() => {
                        const val = Math.max(reqs.AS.minDayShifts, reqs.AS.maxDayShifts - 1);
                        onUpdateReqs({
                          ...reqs,
                          AS: { ...reqs.AS, maxDayShifts: val },
                        });
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={reqs.AS.minDayShifts}
                      value={reqs.AS.maxDayShifts}
                      readOnly
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        const val = reqs.AS.maxDayShifts + 1;
                        onUpdateReqs({
                          ...reqs,
                          AS: { ...reqs.AS, maxDayShifts: val },
                        });
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="sidebar-config-group">
              <h4>Tura de Noapte</h4>
              <div className="sidebar-config-row">
                <div className="form-group">
                  <label>Minim</label>
                  <div className="custom-number-input">
                    <button 
                      type="button" 
                      onClick={() => {
                        const val = Math.max(0, reqs.AS.minNightShifts - 1);
                        const maxVal = Math.max(val, reqs.AS.maxNightShifts);
                        onUpdateReqs({
                          ...reqs,
                          AS: { ...reqs.AS, minNightShifts: val, maxNightShifts: maxVal },
                        });
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={reqs.AS.minNightShifts}
                      readOnly
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        const val = reqs.AS.minNightShifts + 1;
                        const maxVal = Math.max(val, reqs.AS.maxNightShifts);
                        onUpdateReqs({
                          ...reqs,
                          AS: { ...reqs.AS, minNightShifts: val, maxNightShifts: maxVal },
                        });
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Maxim</label>
                  <div className="custom-number-input">
                    <button 
                      type="button" 
                      onClick={() => {
                        const val = Math.max(reqs.AS.minNightShifts, reqs.AS.maxNightShifts - 1);
                        onUpdateReqs({
                          ...reqs,
                          AS: { ...reqs.AS, maxNightShifts: val },
                        });
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={reqs.AS.minNightShifts}
                      value={reqs.AS.maxNightShifts}
                      readOnly
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        const val = reqs.AS.maxNightShifts + 1;
                        onUpdateReqs({
                          ...reqs,
                          AS: { ...reqs.AS, maxNightShifts: val },
                        });
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        Grafice Spital v2.0
      </div>
    </aside>
  );
};
