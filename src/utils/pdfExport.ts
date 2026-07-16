import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Employee, ShiftType } from './calculations';
import { getDaysInMonth, calculateEmployeeHours } from './calculations';
import { ROMANIAN_MONTHS, MONTH_NAMES, MONTH_SHORT_NAMES } from './constants';
import type { VacationPlanningState, VacationMetadata } from '../components/VacationTable';
import { robotoRegularBase64 } from './RobotoRegularBase64';
import { robotoBoldBase64 } from './RobotoBoldBase64';
/**
 * Generates and downloads a PDF of the schedule table.
 * Layout matches the print version: landscape A4, header block,
 * split day columns (1-15 + Total 1-15 + 16-31), summary columns,
 * and a signature block at the bottom.
 */
export function downloadSchedulePDF(
  employees: Employee[],
  shifts: { [employeeId: string]: { [day: number]: ShiftType } },
  year: number,
  month: number
) {
  const daysInfo = getDaysInMonth(year, month);
  const numDays = daysInfo.length;

  // Create landscape A4 document
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.addFileToVFS('Roboto-Regular.ttf', robotoRegularBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', robotoBoldBase64);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

  // ── Header ──
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(12);
  doc.text('SPITAL MUNICIPAL PAȘCANI', 14, 14);

  doc.setFontSize(9);
  doc.setFont('Roboto', 'normal');
  doc.text('SECȚIA: ATI', 14, 19);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(12);
  doc.text('FOAIE COLECTIVĂ DE PREZENȚĂ', pageW - 14, 14, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('Roboto', 'normal');
  doc.text(`LUNA: ${ROMANIAN_MONTHS[month - 1].toUpperCase()} ${year}`, pageW - 14, 19, { align: 'right' });

  doc.setFontSize(7);
  doc.setFont('Roboto', 'bold');
  doc.text('GRAFIC DE LUCRU ASISTENȚI', 14, 24);

  // ── Build table columns ──
  // Columns: Nr.Crt | Nume | Funcția | days 1..15 | Total 1-15 | days 16..N | Total ore | Ore suplim 50% | Ore suplim 100% | Ore noapte | Ore nelucrate
  const headerRow1: Array<{ content: string; colSpan?: number; rowSpan?: number; styles?: Record<string, unknown> }> = [];
  const headerRow2: Array<{ content: string; styles?: Record<string, unknown> }> = [];

  const hdrStyle = { halign: 'center' as const, valign: 'middle' as const, fontSize: 6, fontStyle: 'bold' as const, cellPadding: 0.5 };

  // Fixed columns (row-spanning)
  headerRow1.push({ content: 'Nr.\nCrt', rowSpan: 2, styles: hdrStyle });
  headerRow1.push({ content: 'Numele și prenumele', rowSpan: 2, styles: { ...hdrStyle, halign: 'left' as const, cellWidth: 38 } });
  headerRow1.push({ content: 'Funcția', rowSpan: 2, styles: hdrStyle });

  // Days 1-15 group
  headerRow1.push({ content: 'Ore zilnice (1-15)', colSpan: 15, styles: hdrStyle });
  for (let d = 1; d <= 15; d++) {
    headerRow2.push({ content: String(d), styles: hdrStyle });
  }

  // Total 1-15
  headerRow1.push({ content: 'Total\n1-15', rowSpan: 2, styles: hdrStyle });

  // Days 16-N group
  const daysSecondHalf = numDays - 15;
  headerRow1.push({ content: `Ore zilnice (16-${numDays})`, colSpan: daysSecondHalf, styles: hdrStyle });
  for (let d = 16; d <= numDays; d++) {
    headerRow2.push({ content: String(d), styles: hdrStyle });
  }

  // Summary columns
  headerRow1.push({ content: 'Total\nore\nlucrate', rowSpan: 2, styles: hdrStyle });
  headerRow1.push({ content: 'Din care:', colSpan: 3, styles: hdrStyle });
  headerRow1.push({ content: 'Total\nore\nnelucrate', rowSpan: 2, styles: hdrStyle });

  // Sub-headers for "Din care:"
  headerRow2.push({ content: 'Ore\nsuplim.\n50%', styles: { ...hdrStyle, fontSize: 5 } });
  headerRow2.push({ content: 'Ore\nsuplim.\n100%', styles: { ...hdrStyle, fontSize: 5 } });
  headerRow2.push({ content: 'Ore\nde\nnoapte', styles: { ...hdrStyle, fontSize: 5 } });

  // ── Build table body ──
  const body: Array<Array<{ content: string; styles?: Record<string, unknown> }>> = [];
  const cellStyle = { halign: 'center' as const, valign: 'middle' as const, fontSize: 6, cellPadding: 0.5 };

  employees.forEach((emp, idx) => {
    const empShifts = shifts[emp.id] || {};
    const calcs = calculateEmployeeHours(emp, empShifts, year, month);

    // Subtotal 1-15
    let subtotal1_15 = 0;
    daysInfo.slice(0, 15).forEach((d) => {
      const s = empShifts[d.day] || '-';
      if (s === 'Z' || s === 'N') subtotal1_15 += 12;
      if (s === '8') subtotal1_15 += 8;
      if (s === '4') subtotal1_15 += 4;
    });

    const row: Array<{ content: string; styles?: Record<string, unknown> }> = [];

    // Nr.Crt
    row.push({ content: String(idx + 1), styles: cellStyle });

    // Name
    row.push({ content: emp.name, styles: { ...cellStyle, halign: 'left' as const, fontStyle: 'bold' as const } });

    // Function
    row.push({ content: emp.role, styles: cellStyle });

    // Days 1-15
    for (let d = 1; d <= 15; d++) {
      const shift = empShifts[d] || '-';
      const displayVal = shift === '-' ? '' : shift;
      row.push({
        content: displayVal,
        styles: {
          ...cellStyle,
          fontStyle: (shift !== '-' ? 'bold' : 'normal') as 'bold' | 'normal',
        },
      });
    }

    // Total 1-15
    row.push({ content: String(subtotal1_15), styles: { ...cellStyle, fontStyle: 'bold' as const } });

    // Days 16-N
    for (let d = 16; d <= numDays; d++) {
      const shift = empShifts[d] || '-';
      const displayVal = shift === '-' ? '' : shift;
      row.push({
        content: displayVal,
        styles: {
          ...cellStyle,
          fontStyle: (shift !== '-' ? 'bold' : 'normal') as 'bold' | 'normal',
        },
      });
    }

    // Summary columns
    row.push({ content: String(calcs.totalWorked), styles: { ...cellStyle, fontStyle: 'bold' as const } });
    row.push({ content: calcs.overtime50 ? String(calcs.overtime50) : '', styles: cellStyle });
    row.push({ content: calcs.overtime100 ? String(calcs.overtime100) : '', styles: cellStyle });
    row.push({ content: calcs.nightHours ? String(calcs.nightHours) : '', styles: cellStyle });
    row.push({ content: calcs.unworkedHours ? String(calcs.unworkedHours) : '', styles: cellStyle });

    body.push(row);
  });

  // ── Column widths ──
  // Total available width: ~297 - 28 margins = ~269mm
  const fixedStart = 6;   // Nr.Crt
  const fixedName = 38;   // Name
  const fixedFunc = 8;    // Function
  const fixedTotalCol = 8; // Total 1-15 and summary cols
  const summaryColW = 8;

  const fixedWidth = fixedStart + fixedName + fixedFunc + fixedTotalCol + fixedTotalCol + (summaryColW * 3) + fixedTotalCol;
  const dayColW = Math.max(5, (pageW - 28 - fixedWidth) / numDays);

  const columnStyles: Record<number, Record<string, unknown>> = {};
  columnStyles[0] = { cellWidth: fixedStart };
  columnStyles[1] = { cellWidth: fixedName };
  columnStyles[2] = { cellWidth: fixedFunc };

  // Days 1-15 (columns 3..17)
  for (let i = 3; i < 18; i++) {
    columnStyles[i] = { cellWidth: dayColW };
  }
  // Total 1-15 (column 18)
  columnStyles[18] = { cellWidth: fixedTotalCol };

  // Days 16-N (columns 19..19+daysSecondHalf-1)
  for (let i = 19; i < 19 + daysSecondHalf; i++) {
    columnStyles[i] = { cellWidth: dayColW };
  }
  // Total ore lucrate
  const summaryStart = 19 + daysSecondHalf;
  columnStyles[summaryStart] = { cellWidth: fixedTotalCol };
  // Ore suplim 50%, 100%, noapte
  columnStyles[summaryStart + 1] = { cellWidth: summaryColW };
  columnStyles[summaryStart + 2] = { cellWidth: summaryColW };
  columnStyles[summaryStart + 3] = { cellWidth: summaryColW };
  // Ore nelucrate
  columnStyles[summaryStart + 4] = { cellWidth: fixedTotalCol };

  // ── Render table ──
  autoTable(doc, {
    startY: 26,
    head: [headerRow1, headerRow2],
    body: body,
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontSize: 6,
      cellPadding: 0.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
      textColor: [0, 0, 0],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: columnStyles,
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  });

  // ── Signature block ──
  // Get where the table ended
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const sigY = finalY + 12;

  // Check if signatures fit on current page
  if (sigY + 25 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    drawSignatures(doc, 30, pageW);
  } else {
    drawSignatures(doc, sigY, pageW);
  }

  // ── Download ──
  const formattedMonth = ROMANIAN_MONTHS[month];
  doc.save(`grafic-${formattedMonth}-${year}.pdf`);
}

function drawSignatures(doc: jsPDF, y: number, pageW: number) {
  const leftX = 14;
  const centerX = pageW / 2;
  const rightX = pageW - 14;

  // Dashed lines
  doc.setDrawColor(0, 0, 0);
  doc.setLineDashPattern([1.5, 1], 0);

  const lineLen = 55;
  doc.line(leftX, y, leftX + lineLen, y);
  doc.line(centerX - lineLen / 2, y, centerX + lineLen / 2, y);
  doc.line(rightX - lineLen, y, rightX, y);

  doc.setLineDashPattern([], 0);

  // ── Signatures ──
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9);

  doc.text('MANAGER', leftX + lineLen / 2, y + 6, { align: 'center' });
  doc.text('ȘEF SECȚIE', centerX, y + 6, { align: 'center' });
  doc.text('DIRECTOR ÎNGRIJIRI', rightX - lineLen / 2, y + 6, { align: 'center' });

  // Names
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7);

  doc.text('SUR CÎMPEANU ION', leftX + lineLen / 2, y + 11, { align: 'center' });
  doc.text('DR UNGUREANU SERGIU', centerX, y + 11, { align: 'center' });
  doc.text('AS LUCHIAN NICOLETA', rightX - lineLen / 2, y + 11, { align: 'center' });
}

export function downloadVacationAnnualPDF(
  employees: Employee[],
  vacationPlanning: VacationPlanningState,
  metadata: VacationMetadata,
  year: number
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.addFileToVFS('Roboto-Regular.ttf', robotoRegularBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', robotoBoldBase64);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

  // ── Header ──
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(14);
  doc.text('SPITALUL MUNICIPAL DE URGENȚĂ PAȘCANI', 14, 15);

  doc.setFontSize(10);
  doc.setFont('Roboto', 'normal');
  doc.text(`Nr. ${metadata.registrationNumber || '_____'} / ${metadata.registrationDate || '__________'}`, 14, 21);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(12);
  doc.text(`PROGRAMARE CONCEDII DE ODIHNĂ PE ANUL ${year}`, pageW / 2, 28, { align: 'center' });

  // ── Table Data ──
  const headerRow1 = [
    { content: 'Nr.\ncrt', rowSpan: 2 },
    { content: 'Numele și prenumele', rowSpan: 2 },
    { content: 'Funcția', rowSpan: 2 },
    { content: `Vechime la 31.12.${year}`, colSpan: 2 },
    { content: 'Zile\nCO/an', rowSpan: 2 },
    { content: 'Programare concediu de odihnă pe luni - nr.zile/lună', colSpan: 12 },
    { content: 'Prog.\nTotal', rowSpan: 2 },
    { content: 'Semnătură\nsalariat', rowSpan: 2 }
  ];
  const headerRow2 = [
    'totală',
    'în unit.',
    ...MONTH_SHORT_NAMES
  ];

  const body: any[][] = [];
  employees.forEach((emp, idx) => {
    const info = vacationPlanning[emp.id] || {
      jobTitle: 'asistent pr.',
      seniorityTotal: '',
      seniorityUnit: '',
      vacationDaysAllowed: '',
      monthlyPlanned: {}
    };
    
    let totalPlanned = 0;
    const monthlyVals = [];
    for (let i = 0; i < 12; i++) {
      const val = info.monthlyPlanned[i] || '';
      monthlyVals.push(val);
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) totalPlanned += parsed;
    }

    body.push([
      idx + 1,
      emp.name,
      info.jobTitle,
      info.seniorityTotal,
      info.seniorityUnit,
      info.vacationDaysAllowed,
      ...monthlyVals,
      totalPlanned > 0 ? String(totalPlanned) : '',
      '' // Semnatura
    ]);
  });

  autoTable(doc, {
    startY: 33,
    head: [headerRow1, headerRow2],
    body: body,
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontSize: 8,
      cellPadding: 1,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 45 },
      2: { cellWidth: 20 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      // months
      6: { halign: 'center' }, 7: { halign: 'center' }, 8: { halign: 'center' }, 9: { halign: 'center' },
      10: { halign: 'center' }, 11: { halign: 'center' }, 12: { halign: 'center' }, 13: { halign: 'center' },
      14: { halign: 'center' }, 15: { halign: 'center' }, 16: { halign: 'center' }, 17: { halign: 'center' },
      18: { cellWidth: 12, halign: 'center', fontStyle: 'bold' }, // Total
      19: { cellWidth: 25 } // Semnatura
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  if (finalY + 50 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
  }

  const yDisp = finalY > doc.internal.pageSize.getHeight() - 50 ? 20 : finalY;
  
  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.text('nr.zile = durata efectivă a CO + fidelitate (la fiecare 5 ani în aceeași unitate, câte o zi) + condiții de muncă', 14, yDisp);
  doc.text(`În anul ${year}, concediul de odihnă suplimentar pentru condiții deosebite este de 5 zile lucrătoare conform OUG nr.36/2025 art.II.`, 14, yDisp + 5);
  doc.text('Concediul de odihnă se acordă proporțional cu timpul efectiv lucrat.', 14, yDisp + 10);
  doc.text('Conform prevederilor Legii nr.53/2003 - Codul muncii:', 14, yDisp + 15);
  doc.text('- Salariatul este obligat să efectueze în natură concediul de odihnă în perioada în care a fost programat.', 16, yDisp + 20);
  doc.text('- Concediul de odihnă se efectuează în fiecare an.', 16, yDisp + 25);
  doc.text('- Concediul neefectuat se acordă într-o perioadă de 18 luni începând cu anul următor.', 16, yDisp + 30);

  // Signatures
  const sigY = yDisp + 45;
  doc.setFont('Roboto', 'bold');
  doc.text('MANAGER,', 40, sigY, { align: 'center' });
  doc.text('ȘEF SECȚIE,', pageW / 2, sigY, { align: 'center' });
  doc.text('DIRECTOR ÎNGRIJIRI,', pageW - 40, sigY, { align: 'center' });

  doc.save(`Concedii_Anual_${year}.pdf`);
}

export function downloadVacationMonthlyPDF(
  employees: Employee[],
  shifts: { [employeeId: string]: { [day: number]: ShiftType } },
  year: number,
  month: number
) {
  const daysInfo = getDaysInMonth(year, month);
  const numDays = daysInfo.length;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.addFileToVFS('Roboto-Regular.ttf', robotoRegularBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', robotoBoldBase64);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

  // ── Header ──
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(12);
  doc.text('SPITAL MUNICIPAL PAȘCANI', 14, 14);

  doc.setFontSize(10);
  doc.setFont('Roboto', 'normal');
  doc.text('SECȚIA: ATI', 14, 19);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(12);
  doc.text('PLANIFICARE CONCEDII DE ODIHNĂ', pageW - 14, 14, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('Roboto', 'normal');
  doc.text(`LUNA: ${MONTH_NAMES[month].toUpperCase()} ${year}`, pageW - 14, 19, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('Roboto', 'bold');
  doc.text('PROGRAMARE CALENDARISTICĂ CONCEDII (CO / CIC)', 14, 26);

  // ── Table Data ──
  const headerRow = [
    'Nr.\ncrt',
    'Numele și prenumele',
    ...daysInfo.map(d => String(d.day)),
    'Total\nZile',
    'Semnătură'
  ];

  const body: any[][] = [];
  employees.forEach((emp, idx) => {
    const empShifts = shifts[emp.id] || {};
    let totalCO = 0;
    
    const dayCells = daysInfo.map(d => {
      const s = empShifts[d.day];
      if (s === 'CO' || s === 'CIC') {
        totalCO++;
        return s;
      }
      return '';
    });

    body.push([
      idx + 1,
      emp.name,
      ...dayCells,
      totalCO > 0 ? String(totalCO) : '',
      ''
    ]);
  });

  const dayColW = Math.max(5, (pageW - 28 - 70) / numDays);
  const columnStyles: any = {
    0: { cellWidth: 8, halign: 'center' },
    1: { cellWidth: 40 },
  };
  for (let i = 2; i < 2 + numDays; i++) {
    columnStyles[i] = { cellWidth: dayColW, halign: 'center' };
  }
  columnStyles[2 + numDays] = { cellWidth: 10, halign: 'center', fontStyle: 'bold' };
  columnStyles[3 + numDays] = { cellWidth: 15 };

  autoTable(doc, {
    startY: 30,
    head: [headerRow],
    body: body,
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontSize: 7,
      cellPadding: 0.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: columnStyles,
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9);
  doc.text('MANAGER,', 40, finalY, { align: 'center' });
  doc.text('ȘEF SECȚIE,', pageW / 2, finalY, { align: 'center' });
  doc.text('DIRECTOR ÎNGRIJIRI,', pageW - 40, finalY, { align: 'center' });

  doc.save(`Concedii_Lunar_${MONTH_NAMES[month]}_${year}.pdf`);
}
