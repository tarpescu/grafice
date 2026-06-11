import React, { useState } from 'react';
import type { Employee } from '../utils/calculations';
import { getWorkingDaysCount } from '../utils/calculations';
import { UserPlus, Trash2, Users } from 'lucide-react';

interface StaffManagerProps {
  employees: Employee[];
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
  onRemoveEmployee: (id: string) => void;
  onUpdateEmployee: (id: string, updatedFields: Partial<Employee>) => void;
  year: number;
  month: number;
}

export const StaffManager: React.FC<StaffManagerProps> = ({
  employees,
  onAddEmployee,
  onRemoveEmployee,
  onUpdateEmployee,
  year,
  month,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'MED' | 'AS'>('AS');
  const [norm, setNorm] = useState<number>(1.0);
  const [shiftPattern, setShiftPattern] = useState<'normal' | '8h'>('normal');

  const workingDays = getWorkingDaysCount(year, month);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onAddEmployee({
      name: name.trim(),
      role,
      norm,
      active: true,
      shiftPattern,
    });
    setName('');
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>Gestiune Personal</span>
        <Users size={20} className="no-print" />
      </div>

      <form onSubmit={handleSubmit} className="no-print staff-form">
        <div className="form-group">
          <label htmlFor="staff-name">Nume și Prenume</label>
          <input
            id="staff-name"
            type="text"
            placeholder="Ex: APOSTOL FLORENTINA"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="staff-form-row">
          <div className="form-group">
            <label htmlFor="staff-role">Funcție</label>
            <select
              id="staff-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'MED' | 'AS')}
            >
              <option value="AS">Asistent (AS)</option>
              <option value="MED">Medic (MED)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="staff-norm">Normă</label>
            <select
              id="staff-norm"
              value={norm}
              onChange={(e) => setNorm(Number(e.target.value))}
            >
              <option value={1.0}>100% (Normă)</option>
              <option value={0.8}>80% (Normă)</option>
              <option value={0.75}>75% (Normă)</option>
              <option value={0.7}>70% (Normă)</option>
              <option value={0.65}>65% (Normă)</option>
              <option value={0.6}>60% (Normă)</option>
              <option value={0.5}>50% (Jumătate)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="staff-pattern">Model Tură</label>
            <select
              id="staff-pattern"
              value={shiftPattern}
              onChange={(e) => setShiftPattern(e.target.value as 'normal' | '8h')}
            >
              <option value="normal">Zi/Noapte/8h</option>
              <option value="8h">Doar 8h</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn btn-primary">
          <UserPlus size={16} />
          Adaugă Personal
        </button>
      </form>

      <div className="staff-list-container">
        <h3 className="staff-list-title">
          Membri Secție ({employees.length})
        </h3>
        <div className="staff-list">
          {employees.map((emp) => (
            <div key={emp.id} className="staff-item">
              <div className="staff-info">
                <h4>{emp.name}</h4>
                <div className="staff-meta">
                  {/* Role Selector Badge */}
                  <select
                    value={emp.role}
                    onChange={(e) => onUpdateEmployee(emp.id, { role: e.target.value as 'MED' | 'AS' })}
                    className={`staff-select-inline ${emp.role === 'MED' ? 'staff-select-role-med' : 'staff-select-role-as'}`}
                  >
                    <option value="AS">AS</option>
                    <option value="MED">MED</option>
                  </select>

                  {/* Shift Pattern Selector Badge */}
                  <select
                    value={emp.shiftPattern || 'normal'}
                    onChange={(e) => onUpdateEmployee(emp.id, { shiftPattern: e.target.value as 'normal' | '8h' })}
                    className={`staff-select-inline ${emp.shiftPattern === '8h' ? 'staff-select-pattern-8h' : 'staff-select-pattern-normal'}`}
                  >
                    <option value="normal">Zi/Noapte/8h</option>
                    <option value="8h">Doar 8h</option>
                  </select>

                  {/* Norm Selector */}
                  <select
                    value={emp.norm}
                    onChange={(e) => onUpdateEmployee(emp.id, { norm: Number(e.target.value) })}
                    className="staff-select-inline staff-select-norm"
                  >
                    <option value={1.0}>100%</option>
                    <option value={0.8}>80%</option>
                    <option value={0.75}>75%</option>
                    <option value={0.7}>70%</option>
                    <option value={0.65}>65%</option>
                    <option value={0.6}>60%</option>
                    <option value={0.5}>50%</option>
                  </select>

                  <span className="staff-meta-hours">
                    ({Math.round(workingDays * 8 * emp.norm)}h)
                  </span>
                </div>
              </div>
              <button
                onClick={() => onRemoveEmployee(emp.id)}
                className="btn btn-secondary no-print btn-delete"
                title="Șterge Angajat"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {employees.length === 0 && (
            <p className="staff-empty-message">
              Niciun angajat înregistrat pe această secție.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
