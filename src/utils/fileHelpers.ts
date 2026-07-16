import { ROMANIAN_MONTHS } from './constants';

/**
 * Downloads a data object as a JSON file.
 */
export function downloadAsJson(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', fileName);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  
  document.body.removeChild(downloadAnchor);
  URL.revokeObjectURL(url);
}

/**
 * Opens a file picker dialog and imports a JSON file.
 * Validates the data and handles month/year mismatch confirmation.
 */
export function importFromJsonFile(options: {
  expectedYear: number;
  expectedMonth: number;
  dataKey: string;
  onImport: (data: { [key: string]: unknown }) => void;
  onError?: (message: string) => void;
  mismatchLabel: string;
}): void {
  const { expectedYear, expectedMonth, dataKey, onImport, onError, mismatchLabel } = options;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);

        let importedData = data[dataKey];
        const importedYear = data.year;
        const importedMonth = data.month;

        if (!importedData && !data.type) {
          importedData = data;
        }

        if (!importedData || typeof importedData !== 'object') {
          if (onError) onError('Datele din fișier sunt invalide!');
          else alert('Datele din fișier sunt invalide!');
          return;
        }

        if (importedYear !== undefined && importedMonth !== undefined) {
          if (importedYear !== expectedYear || importedMonth !== expectedMonth) {
            const confirmImport = window.confirm(
              `Avertisment: Fișierul selectat conține ${mismatchLabel} pentru ${ROMANIAN_MONTHS[importedMonth]} ${importedYear}, iar luna activă este ${ROMANIAN_MONTHS[expectedMonth]} ${expectedYear}.\n\nSigur doriți să importați aceste date?`
            );
            if (!confirmImport) return;
          }
        }

        onImport(importedData as { [key: string]: unknown });
      } catch {
        if (onError) onError('Fișierul selectat nu este un JSON valid sau este corupt!');
        else alert('Fișierul selectat nu este un JSON valid sau este corupt!');
      }
    };
    reader.readAsText(file);
  };
  fileInput.click();
}
