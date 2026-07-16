import { useState } from 'react';
import type { Employee } from '../utils/calculations';
import { UserPlus, Trash2 } from 'lucide-react';

interface StaffManagerProps {
  employees: Employee[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onRemoveEmployee: (id: string) => void;
  onUpdateEmployee: (id: string, fields: Partial<Employee>) => void;
}

export const StaffManager = ({
  employees,
  onAddEmployee,
  onRemoveEmployee,
  onUpdateEmployee,
}: StaffManagerProps) => {
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

  return (
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
  );
};
