import React from 'react';
import type { Employee, ShiftType } from '../utils/calculations';
import { getDaysInMonth, calculateEmployeeHours } from '../utils/calculations';
import { Printer, AlertTriangle, FileDown } from 'lucide-react';
import type { ValidationWarning } from '../utils/scheduler';

interface ScheduleTableProps {
  employees: Employee[];
  shifts: { [employeeId: string]: { [day: number]: ShiftType } };
  year: number;
  month: number;
  warnings: ValidationWarning[];
  onShiftChange: (employeeId: string, day: number, shift: ShiftType) => void;
  onAutoGenerate: () => void;
  onClearSchedule: () => void;
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  employees,
  shifts,
  year,
  month,
  warnings,
  onShiftChange,
  onAutoGenerate,
  onClearSchedule,
}) => {
  const daysInfo = getDaysInMonth(year, month);
  const monthNames = [
    'IANUARIE', 'FEBRUARIE', 'MARTIE', 'APRILIE', 'MAI', 'IUNIE',
    'IULIE', 'AUGUST', 'SEPTEMBRIE', 'OCTOMBRIE', 'NOIEMBRIE', 'DECEMBRIE'
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const originalTitle = document.title;
    const formattedMonth = monthNames[month].toLowerCase();
    document.title = `${formattedMonth}-${year}`;
    window.print();
    document.title = originalTitle;
  };

  return (
    <div className="table-actions-container">
      {/* Table Actions Toolbar */}
      <div className="no-print toolbar-container">
        <div className="toolbar-group">
          <button onClick={onAutoGenerate} className="btn btn-primary">
            Generare Automată
          </button>
          <button onClick={onClearSchedule} className="btn btn-secondary" style={{ color: '#ef4444' }}>
            Șterge Tot
          </button>
        </div>
        <div className="toolbar-group-small">
          <button onClick={handlePrint} className="btn btn-secondary">
            <Printer size={16} />
            Imprimă
          </button>
          <button onClick={handleExportPDF} className="btn btn-secondary">
            <FileDown size={16} />
            Exportă PDF
          </button>
        </div>
      </div>

      {/* Constraints Warnings Section */}
      {warnings.length > 0 && (
        <div className="warnings-container no-print">
          <h3>
            <AlertTriangle size={18} />
            Atenție - Constrângeri Încălcate ({warnings.length})
          </h3>
          <div className="warnings-list">
            {warnings.map((w, idx) => (
              <div key={idx} className="warning-item">
                • Ziua {w.day}: {w.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Pontaj Container */}
      <div className="table-wrapper">
        {/* Printable Header Info */}
        <div className="print-only-header">
          <div className="print-header-top">
            <div>
              <h2>SPITAL MUNICIPAL PAȘCANI</h2>
              <h3>SECȚIA: ATI</h3>
            </div>
            <div className="print-header-right">
              <h2>FOAIE COLECTIVĂ DE PREZENȚĂ</h2>
              <h3>LUNA: {monthNames[month]} {year}</h3>
            </div>
          </div>
          <p className="print-only-header-p">
            GRAFIC DE LUCRU ASISTENȚI / MEDICI
          </p>
        </div>

        <table className="schedule-table">
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: '40px' }}>Nr. Crt</th>
              <th rowSpan={2} className="col-name">Numele și prenumele</th>
              <th rowSpan={2} style={{ width: '50px' }}>Funcția</th>
              <th colSpan={15}>Ore zilnice (1-15)</th>
              <th rowSpan={2} style={{ width: '35px' }}>Total 1-15</th>
              <th colSpan={16}>Ore zilnice (16-31)</th>
              <th rowSpan={2} style={{ width: '35px' }}>Total ore lucrate</th>
              <th colSpan={3}>Din care:</th>
              <th rowSpan={2} style={{ width: '40px' }}>Total ore nelucrate</th>
            </tr>
            <tr>
              {/* Days 1-15 */}
              {daysInfo.slice(0, 15).map((d) => (
                <th key={d.day} className={d.isWeekend ? 'weekend' : ''} style={{ fontSize: '8px', padding: '2px' }}>
                  {d.day}
                </th>
              ))}
              {/* Days 16-31 */}
              {daysInfo.slice(15).map((d) => (
                <th key={d.day} className={d.isWeekend ? 'weekend' : ''} style={{ fontSize: '8px', padding: '2px' }}>
                  {d.day}
                </th>
              ))}
              {/* Columns for 'Din care' */}
              <th style={{ fontSize: '7px', writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '4px 2px' }}>Ore suplim. 50%</th>
              <th style={{ fontSize: '7px', writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '4px 2px' }}>Ore suplim. 100%</th>
              <th style={{ fontSize: '7px', writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '4px 2px' }}>Ore de noapte</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, index) => {
              const empShifts = shifts[emp.id] || {};
              const calcs = calculateEmployeeHours(emp, empShifts, year, month);

              // Calculate subtotal 1-15
              let subtotal1_15 = 0;
              daysInfo.slice(0, 15).forEach((d) => {
                const s = empShifts[d.day] || '-';
                if (s === 'Z' || s === 'N') subtotal1_15 += 12;
                if (s === '8') subtotal1_15 += 8;
              });

              return (
                <tr key={emp.id}>
                  <td>{index + 1}</td>
                  <td className="col-name">{emp.name}</td>
                  <td>{emp.role}</td>
                  
                  {/* Days 1-15 */}
                  {daysInfo.slice(0, 15).map((d) => {
                    const shift = empShifts[d.day] || '-';
                    const hasWarning = warnings.some(w => w.employeeId === emp.id && w.day === d.day);
                    return (
                      <td key={d.day} className={`${d.isWeekend ? 'weekend' : ''} shift-cell shift-${shift} ${hasWarning ? 'shift-err' : ''} cell-nopadding`}>
                        <span className="print-only-value">{shift === '-' ? '' : shift}</span>
                        <select
                          value={shift}
                          onChange={(e) => onShiftChange(emp.id, d.day, e.target.value as ShiftType)}
                          className="no-print-select"
                        >
                          <option value="-">-</option>
                          <option value="Z">Z</option>
                          <option value="N">N</option>
                          <option value="8">8</option>
                          <option value="CO">CO</option>
                          <option value="CIC">CIC</option>
                        </select>
                      </td>
                    );
                  })}

                  {/* Subtotal 1-15 */}
                  <td style={{ fontWeight: 600 }}>{subtotal1_15}</td>

                  {/* Days 16-31 */}
                  {daysInfo.slice(15).map((d) => {
                    const shift = empShifts[d.day] || '-';
                    const hasWarning = warnings.some(w => w.employeeId === emp.id && w.day === d.day);
                    return (
                      <td key={d.day} className={`${d.isWeekend ? 'weekend' : ''} shift-cell shift-${shift} ${hasWarning ? 'shift-err' : ''} cell-nopadding`}>
                        <span className="print-only-value">{shift === '-' ? '' : shift}</span>
                        <select
                          value={shift}
                          onChange={(e) => onShiftChange(emp.id, d.day, e.target.value as ShiftType)}
                          className="no-print-select"
                        >
                          <option value="-">-</option>
                          <option value="Z">Z</option>
                          <option value="N">N</option>
                          <option value="8">8</option>
                          <option value="CO">CO</option>
                          <option value="CIC">CIC</option>
                        </select>
                      </td>
                    );
                  })}

                  {/* Monthly Calculations columns */}
                  <td style={{ fontWeight: 700 }}>{calcs.totalWorked}</td>
                  <td>{calcs.overtime50 || ''}</td>
                  <td>{calcs.overtime100 || ''}</td>
                  <td>{calcs.nightHours || ''}</td>
                  <td>{calcs.unworkedHours || ''}</td>
                </tr>
              );
            })}
            
            {employees.length === 0 && (
              <tr>
                <td colSpan={39} style={{ padding: '2rem', color: 'var(--color-text-secondary)' }}>
                  Vă rugăm să adăugați personal din panoul din stânga pentru a începe completarea pontajului.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Print Signatures Area */}
        <div className="print-signatures">
          <div className="signature-box">
            <h4>MANAGER</h4>
            <p>SUR CÎMPEANU ION</p>
          </div>
          <div className="signature-box">
            <h4>ȘEF SECȚIE</h4>
            <p>DR UNGUREANU SERGIU</p>
          </div>
          <div className="signature-box">
            <h4>DIRECTOR ÎNGRIJIRI</h4>
            <p>AS LUCHIAN NICOLETA</p>
          </div>
        </div>
      </div>
    </div>
  );
};
