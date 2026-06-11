import React, { useState } from 'react';
import type { Employee } from '../utils/calculations';
import { UserPlus, Trash2, Users } from 'lucide-react';

interface StaffManagerProps {
  employees: Employee[];
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
  onRemoveEmployee: (id: string) => void;
}

export const StaffManager: React.FC<StaffManagerProps> = ({
  employees,
  onAddEmployee,
  onRemoveEmployee,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'MED' | 'AS'>('AS');
  const [contractHours, setContractHours] = useState(168);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onAddEmployee({
      name: name.trim(),
      role,
      contractHours,
      active: true,
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
            <label htmlFor="staff-hours">Ore Contract</label>
            <input
              id="staff-hours"
              type="number"
              min={0}
              max={300}
              value={contractHours}
              onChange={(e) => setContractHours(Number(e.target.value))}
              required
            />
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
                  <span className={emp.role === 'MED' ? 'badge-med' : 'badge-as'}>
                    {emp.role}
                  </span>
                  <span className="staff-meta-hours">
                    {emp.contractHours} ore
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
