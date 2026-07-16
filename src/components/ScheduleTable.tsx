
import type { Employee, ShiftType } from '../utils/calculations';
import { getDaysInMonth, calculateEmployeeHours } from '../utils/calculations';
import { AlertTriangle, FileDown, Trash2, Upload, Download, Zap } from 'lucide-react';
import type { ValidationWarning } from '../utils/scheduler';
import { ROMANIAN_MONTHS, MONTH_NAMES } from '../utils/constants';
import { downloadAsJson, importFromJsonFile } from '../utils/fileHelpers';
import { downloadSchedulePDF } from '../utils/pdfExport';
import { useToast } from '../hooks/useToast';
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
  onImportShifts: (shifts: { [employeeId: string]: { [day: number]: ShiftType } }) => void;
}

const ScheduleLegend = () => (
  <div className="schedule-legend">
    <div className="legend-title">Legendă Grafic:</div>
    <div className="legend-items">
      <div className="legend-item">
        <span className="legend-color" style={{ backgroundColor: '#fef9c3' }}></span>
        <span>Zile de weekend (Sâmbătă, Duminică)</span>
      </div>
      <div className="legend-item">
        <span className="legend-color" style={{ backgroundColor: '#ffe4e6', color: '#e11d48' }}></span>
        <span>Sărbătoare Legală</span>
      </div>
      <div className="legend-item">
        <span className="legend-color" style={{ backgroundColor: 'var(--color-shift-z-bg)', color: 'var(--color-shift-z)' }}>Z</span>
        <span>Tura Zi (12h)</span>
      </div>
      <div className="legend-item">
        <span className="legend-color" style={{ backgroundColor: 'var(--color-shift-n-bg)', color: 'var(--color-shift-n)' }}>N</span>
        <span>Tura Noapte (12h)</span>
      </div>
      <div className="legend-item">
        <span className="legend-color" style={{ backgroundColor: 'var(--color-shift-8-bg)', color: 'var(--color-shift-8)' }}>8</span>
        <span>Tura de 8h</span>
      </div>
      <div className="legend-item">
        <span className="legend-color" style={{ backgroundColor: 'var(--color-shift-4-bg)', color: 'var(--color-shift-4)' }}>4</span>
        <span>Tura de 4h</span>
      </div>
      <div className="legend-item">
        <span className="legend-color" style={{ backgroundColor: 'var(--color-shift-l-bg)', color: 'var(--color-shift-l)' }}>L</span>
        <span>Liber cerut / Indisponibil</span>
      </div>
      <div className="legend-item">
        <span className="legend-color" style={{ backgroundColor: 'var(--color-shift-co-bg)', color: 'var(--color-shift-co)' }}>CO</span>
        <span>Concediu de Odihnă</span>
      </div>
      <div className="legend-item">
        <span className="legend-color" style={{ backgroundColor: 'var(--color-shift-cic-bg)', color: 'var(--color-shift-cic)' }}>CIC</span>
        <span>Concediu Îngrijire Copil</span>
      </div>
      <div className="legend-item">
        <span className="legend-color shift-err"></span>
        <span>Eroare / Încălcare Codul Muncii</span>
      </div>
    </div>
  </div>
);

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
  onImportShifts,
}: ScheduleTableProps) => {
  const daysInfo = getDaysInMonth(year, month);
  const { addToast } = useToast();

  const handleExportPDF = () => {
    downloadSchedulePDF(employees, shifts, year, month);
    addToast({ type: 'success', title: 'PDF descărcat', message: `Fișierul PDF a fost generat și descărcat.` });
  };

  const handleExportShifts = () => {
    const dataToExport = { type: 'grafic-ture', year, month, shifts };
    const fileName = `grafic-${ROMANIAN_MONTHS[month]}-${year}.json`;
    downloadAsJson(dataToExport, fileName);
    addToast({ type: 'success', title: 'Export reușit', message: `Fișierul ${fileName} a fost descărcat.` });
  };

  const handleImportShiftsClick = () => {
    importFromJsonFile({
      expectedYear: year,
      expectedMonth: month,
      dataKey: 'shifts',
      onImport: (importedData) => {
        onImportShifts(importedData as { [employeeId: string]: { [day: number]: ShiftType } });
        addToast({ type: 'success', title: 'Import reușit', message: 'Graficul de ture a fost importat cu succes!' });
      },
      onError: (message) => {
        addToast({ type: 'error', title: 'Eroare la import', message });
      },
      mismatchLabel: 'date',
    });
  };

  const renderDayHeader = (d: typeof daysInfo[0]) => (
    <th
      key={d.day}
      className={`${d.isWeekend ? 'weekend' : ''} ${d.isHoliday ? 'legal-holiday' : ''}`}
      style={{ fontSize: '8px', padding: '2px' }}
      title={d.isHoliday ? 'Sărbătoare Legală' : ''}
    >
      {d.day}
    </th>
  );

  const renderDayCell = (d: typeof daysInfo[0], emp: Employee, empShifts: { [day: number]: ShiftType }) => {
    const shift = empShifts[d.day] || '-';
    const hasWarning = warnings.some((w) => w.employeeId === emp.id && w.day === d.day);
    return (
      <td
        key={d.day}
        className={`${d.isWeekend ? 'weekend' : ''} ${d.isHoliday ? 'legal-holiday' : ''} shift-cell shift-${shift} ${hasWarning ? 'shift-err' : ''} cell-nopadding`}
      >
        <span className="print-only-value">{shift === '-' ? '' : shift}</span>
        <select
          value={shift}
          onChange={(e) => onShiftChange(emp.id, d.day, e.target.value as ShiftType)}
          className="no-print-select"
        >
          <option value="-">-</option>
          {shift !== 'CO' && shift !== 'CIC' && (
            <>
              {emp.shiftPattern !== '8h' && <option value="Z">Z</option>}
              {emp.shiftPattern !== '8h' && <option value="N">N</option>}
              <option value="8">8</option>
              <option value="4">4</option>
            </>
          )}
          <option value="L">L</option>
          <option value="CO">CO</option>
          <option value="CIC">CIC</option>
        </select>
      </td>
    );
  };

  return (
    <div className="table-actions-container">
      {/* Toolbar */}
      <div className="no-print toolbar-container">
        <div className="toolbar-group">
          <button onClick={onAutoGenerate} className="btn btn-primary">
            <Zap size={15} />
            Generare Automată
          </button>
          <div className="toolbar-divider" />
          <button onClick={onClearSchedule} className="btn btn-danger btn-sm">
            <Trash2 size={13} />
            Șterge Ture
          </button>
          <button onClick={onClearAll} className="btn btn-danger btn-sm">
            <Trash2 size={13} />
            Șterge Tot
          </button>
        </div>

        <div className="toolbar-group-small">
          <button onClick={handleImportShiftsClick} className="btn btn-secondary btn-sm" title="Importă grafic de ture din fișier JSON">
            <Upload size={14} />
            Importă
          </button>
          <button onClick={handleExportShifts} className="btn btn-secondary btn-sm" title="Exportă grafic de ture în format JSON">
            <Download size={14} />
            Exportă
          </button>
          <div className="toolbar-divider" />
          <button onClick={handleExportPDF} className="btn btn-secondary btn-sm">
            <FileDown size={14} />
            PDF
          </button>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="warnings-container no-print">
          <h3>
            <AlertTriangle size={16} />
            Atenție — Constrângeri Încălcate ({warnings.length})
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

      {/* Table */}
      <div className="table-wrapper">
        {/* Print Header */}
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
          <p className="print-only-header-p">GRAFIC DE LUCRU ASISTENȚI</p>
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
              {daysInfo.slice(0, 15).map(renderDayHeader)}
              {daysInfo.slice(15).map(renderDayHeader)}
              <th style={{ fontSize: '7px', padding: '2px 1px', lineHeight: '1.1', fontWeight: 600 }}>Ore<br />suplim.<br />50%</th>
              <th style={{ fontSize: '7px', padding: '2px 1px', lineHeight: '1.1', fontWeight: 600 }}>Ore<br />suplim.<br />100%</th>
              <th style={{ fontSize: '7px', padding: '2px 1px', lineHeight: '1.1', fontWeight: 600 }}>Ore<br />de<br />noapte</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, index) => {
              const empShifts = shifts[emp.id] || {};
              const calcs = calculateEmployeeHours(emp, empShifts, year, month);

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
                  {daysInfo.slice(0, 15).map((d) => renderDayCell(d, emp, empShifts))}
                  <td style={{ fontWeight: 600 }}>{subtotal1_15}</td>
                  {daysInfo.slice(15).map((d) => renderDayCell(d, emp, empShifts))}
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
                  Adăugați personal din sidebar-ul din stânga pentru a începe completarea pontajului.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <ScheduleLegend />
      </div>
    </div>
  );
};
