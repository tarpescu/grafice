import React, { useState } from 'react';
import type { Employee } from '../utils/calculations';
import { UserPlus, Trash2, Users } from 'lucide-react';

interface StaffManagerProps {
  employees: Employee[];
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
  onRemoveEmployee: (id: string) => void;
  onUpdateEmployee: (id: string, updatedFields: Partial<Employee>) => void;
}

export const StaffManager: React.FC<StaffManagerProps> = ({
  employees,
  onAddEmployee,
  onRemoveEmployee,
  onUpdateEmployee,
}) => {
  const [name, setName] = useState('');
  const [shiftPattern, setShiftPattern] = useState<'normal' | '8h'>('normal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddEmployee({
      name: name.trim(),
      role: 'AS',
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
            placeholder="Ex: POPESCU IONELA"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="staff-form-row">
          <div className="form-group">
            <label htmlFor="staff-pattern">Model Tură</label>
            <select
              id="staff-pattern"
              value={shiftPattern}
              onChange={(e) => setShiftPattern(e.target.value as 'normal' | '8h')}
            >
              <option value="normal">Zi/Noapte/8h/4h</option>
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
                  {/* Shift Pattern Selector Badge */}
                  <select
                    value={emp.shiftPattern || 'normal'}
                    onChange={(e) => onUpdateEmployee(emp.id, { shiftPattern: e.target.value as 'normal' | '8h' })}
                    className={`staff-select-inline ${emp.shiftPattern === '8h' ? 'staff-select-pattern-8h' : 'staff-select-pattern-normal'}`}
                  >
                    <option value="normal">Zi/Noapte/8h/4h</option>
                    <option value="8h">Doar 8h</option>
                  </select>

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
