
import type { Employee, ShiftType } from '../utils/calculations';
import { getDaysInMonth, calculateEmployeeHours } from '../utils/calculations';
import { Printer, AlertTriangle, FileDown, Menu, ChevronLeft, Trash2, Upload, Download } from 'lucide-react';
import type { ValidationWarning } from '../utils/scheduler';
import { ROMANIAN_MONTHS, MONTH_NAMES } from '../utils/constants';
import { downloadAsJson, importFromJsonFile } from '../utils/fileHelpers';
import { PrintSignatures } from './PrintSignatures';

interface ScheduleTableProps {
  employees: Employee[];
  shifts: { [employeeId: string]: { [day: number]: ShiftType } };
  year: number;
  month: number;
  warnings: ValidationWarning[];
  onShiftChange: (employeeId: string, day: number, shift: ShiftType) => void;
  onAutoGenerate: () => void;
  onClearSchedule: () => void;
  onClearAll: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onImportShifts: (shifts: { [employeeId: string]: { [day: number]: ShiftType } }) => void;
}

export const ScheduleTable = ({
  employees,
  shifts,
  year,
  month,
  warnings,
  onShiftChange,
  onAutoGenerate,
  onClearSchedule,
  onClearAll,
  isSidebarOpen,
  onToggleSidebar,
  onImportShifts,
}: ScheduleTableProps) => {
  const daysInfo = getDaysInMonth(year, month);

  const handlePrint = () => {
    window.print();
  };
  const handleExportPDF = () => {
    const originalTitle = document.title;
    const formattedMonth = ROMANIAN_MONTHS[month];
    document.title = `grafic-${formattedMonth}-${year}`;
    window.print();
    document.title = originalTitle;
  };

  const handleExportShifts = () => {
    const dataToExport = {
      type: 'grafic-ture',
      year,
      month,
      shifts
    };
    const fileName = `grafic-${ROMANIAN_MONTHS[month]}-${year}.json`;
    downloadAsJson(dataToExport, fileName);
  };

  const handleImportShiftsClick = () => {
    importFromJsonFile({
      expectedYear: year,
      expectedMonth: month,
      dataKey: 'shifts',
      onImport: (importedData) => {
        onImportShifts(importedData as { [employeeId: string]: { [day: number]: ShiftType } });
      },
      successMessage: 'Graficul de ture a fost importat cu succes!',
      mismatchLabel: 'date'
    });
  };

  const renderDayHeader = (d: typeof daysInfo[0]) => (
    <th key={d.day} className={`${d.isWeekend ? 'weekend' : ''} ${d.isHoliday ? 'legal-holiday' : ''}`} style={{ fontSize: '8px', padding: '2px' }} title={d.isHoliday ? 'Sărbătoare Legală' : ''}>
      {d.day}
    </th>
  );

  const renderDayCell = (d: typeof daysInfo[0], emp: Employee, empShifts: { [day: number]: ShiftType }) => {
    const shift = empShifts[d.day] || '-';
    const hasWarning = warnings.some(w => w.employeeId === emp.id && w.day === d.day);
    return (
      <td key={d.day} className={`${d.isWeekend ? 'weekend' : ''} ${d.isHoliday ? 'legal-holiday' : ''} shift-cell shift-${shift} ${hasWarning ? 'shift-err' : ''} cell-nopadding`}>
        <span className="print-only-value">{shift === '-' ? '' : shift}</span>
        <select
          value={shift}
          onChange={(e) => onShiftChange(emp.id, d.day, e.target.value as ShiftType)}
          className="no-print-select"
        >
          <option value="-">-</option>
          {(shift !== 'CO' && shift !== 'CIC') && (
            <>
              {emp.shiftPattern !== '8h' && <option value="Z">Z</option>}
              {emp.shiftPattern !== '8h' && <option value="N">N</option>}
              <option value="8">8</option>
              <option value="4">4</option>
            </>
          )}
          <option value="CO">CO</option>
          <option value="CIC">CIC</option>
        </select>
      </td>
    );
  };

  return (
    <div className="table-actions-container">
      {/* Table Actions Toolbar */}
      <div className="no-print toolbar-container">
        <div className="toolbar-group">
          <button 
            onClick={onToggleSidebar} 
            className={`btn btn-secondary toolbar-toggle-btn`}
            title={isSidebarOpen ? 'Ascunde Personal & Setări' : 'Afișează Personal & Setări'}
          >
            {isSidebarOpen ? <ChevronLeft size={16} /> : <Menu size={16} />}
            <span className="toggle-btn-text">Personal & Setări</span>
          </button>
          <button onClick={onAutoGenerate} className="btn btn-primary">
            Generare Automată
          </button>
          <button onClick={() => { if (window.confirm('Sigur doriți să ștergeți turele? Concediile (CO/CIC) vor fi păstrate.')) onClearSchedule(); }} className="btn btn-secondary" style={{ color: '#ef4444' }}>
            <Trash2 size={14} />
            Șterge Ture
          </button>
          <button onClick={() => { if (window.confirm('Sigur doriți să ștergeți TOT, inclusiv concediile (CO/CIC)?')) onClearAll(); }} className="btn btn-secondary" style={{ color: '#ef4444' }}>
            <Trash2 size={14} />
            Șterge Tot
          </button>
        </div>



        <div className="toolbar-group-small">
          <button onClick={handleImportShiftsClick} className="btn btn-secondary" title="Importă grafic de ture din fișier JSON">
            <Upload size={16} />
            Importă Ture
          </button>
          <button onClick={handleExportShifts} className="btn btn-secondary" title="Exportă grafic de ture în format JSON">
            <Download size={16} />
            Exportă Ture
          </button>
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
              <h3>LUNA: {MONTH_NAMES[month].toUpperCase()} {year}</h3>
            </div>
          </div>
          <p className="print-only-header-p">
            GRAFIC DE LUCRU ASISTENȚI
          </p>
        </div>
        <table className="schedule-table">
          <colgroup>
            <col style={{ width: '25px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '35px' }} />
            {daysInfo.map((d) => (
              <col key={d.day} style={{ width: '18px' }} />
            ))}
            <col style={{ width: '30px' }} />
            <col style={{ width: '35px' }} />
            <col style={{ width: '28px' }} />
            <col style={{ width: '28px' }} />
            <col style={{ width: '28px' }} />
            <col style={{ width: '35px' }} />
          </colgroup>
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
              {daysInfo.slice(0, 15).map(renderDayHeader)}
              {/* Days 16-31 */}
              {daysInfo.slice(15).map(renderDayHeader)}
              {/* Columns for 'Din care' */}
              <th style={{ fontSize: '7px', padding: '2px 1px', lineHeight: '1.1', fontWeight: 600 }}>Ore<br/>suplim.<br/>50%</th>
              <th style={{ fontSize: '7px', padding: '2px 1px', lineHeight: '1.1', fontWeight: 600 }}>Ore<br/>suplim.<br/>100%</th>
              <th style={{ fontSize: '7px', padding: '2px 1px', lineHeight: '1.1', fontWeight: 600 }}>Ore<br/>de<br/>noapte</th>
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
                if (s === '4') subtotal1_15 += 4;
              });

              return (
                <tr key={emp.id}>
                  <td>{index + 1}</td>
                  <td className="col-name">{emp.name}</td>
                  <td>{emp.role}</td>
                  
                  {/* Days 1-15 */}
                  {daysInfo.slice(0, 15).map((d) => renderDayCell(d, emp, empShifts))}

                  {/* Subtotal 1-15 */}
                  <td style={{ fontWeight: 600 }}>{subtotal1_15}</td>

                  {/* Days 16-31 */}
                  {daysInfo.slice(15).map((d) => renderDayCell(d, emp, empShifts))}

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

        <PrintSignatures />
      </div>
    </div>
  );
};
