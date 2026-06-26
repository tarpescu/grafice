import { ROMANIAN_MONTHS } from './constants';

/**
 * Downloads a data object as a JSON file.
 */
export function downloadAsJson(data: unknown, fileName: string): void {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', fileName);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
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
  successMessage: string;
  mismatchLabel: string;
}): void {
  const { expectedYear, expectedMonth, dataKey, onImport, successMessage, mismatchLabel } = options;

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
          alert('Datele din fișier sunt invalide!');
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
        alert(successMessage);
      } catch {
        alert('Fișierul selectat nu este un JSON valid sau este corupt!');
      }
    };
    reader.readAsText(file);
  };
  fileInput.click();
}
