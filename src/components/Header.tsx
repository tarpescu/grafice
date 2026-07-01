import { Users, AlertTriangle, Menu, CheckCircle } from 'lucide-react';
import { MONTH_NAMES } from '../utils/constants';

interface HeaderProps {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  employeeCount: number;
  warningCount: number;
  onToggleSidebar: () => void;
  showMonthSelector: boolean;
}

export const Header = ({
  month,
  year,
  onMonthChange,
  onYearChange,
  employeeCount,
  warningCount,
  onToggleSidebar,
  showMonthSelector,
}: HeaderProps) => {
  return (
    <header className="app-header no-print">
      <div className="header-left">
        <button className="header-mobile-toggle" onClick={onToggleSidebar} title="Deschide meniu">
          <Menu size={22} />
        </button>
        <div className="header-title-block">
          <h1>Foaie Colectivă de Prezență</h1>
          <p>Secția ATI — Spitalul Municipal Pașcani</p>
        </div>
      </div>

      <div className="header-controls">
        <div className="header-badges">
          <div className="header-badge staff">
            <Users size={13} />
            <span>{employeeCount} personal</span>
          </div>
          {warningCount > 0 ? (
            <div className="header-badge warnings">
              <AlertTriangle size={13} />
              <span>{warningCount} avertizări</span>
            </div>
          ) : (
            <div className="header-badge ok">
              <CheckCircle size={13} />
              <span>OK</span>
            </div>
          )}
        </div>

        {showMonthSelector && (
          <div className="header-selector">
            <label>Luna</label>
            <select value={month} onChange={(e) => onMonthChange(Number(e.target.value))}>
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="header-selector">
          <label>Anul</label>
          <select value={year} onChange={(e) => onYearChange(Number(e.target.value))}>
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
