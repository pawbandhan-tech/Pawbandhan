import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function generatePrescriptionPDF(prescription) {
  const doc = new jsPDF();
  const { caseCode, animalType, patientInfo, diagnosis, treatment, medications, notes, doctorName, doctorLicense, hospitalName, timestamp, ip } = prescription;

  doc.setFontSize(22);
  doc.setTextColor(139, 92, 246);
  doc.text('PawBandhan', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Animal Rescue & Treatment Platform', 105, 28, { align: 'center' });

  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.5);
  doc.line(20, 32, 190, 32);

  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('Veterinary Prescription', 105, 42, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Case ID: ${caseCode || 'N/A'}`, 20, 52);
  doc.text(`Date: ${new Date(timestamp || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 120, 52);
  doc.text(`IP Address: ${ip || 'N/A'}`, 20, 58);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 120, 58);

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Patient Information', 20, 70);
  doc.autoTable({
    startY: 74,
    head: [['Field', 'Details']],
    body: [
      ['Animal Type', animalType || 'N/A'],
      ['Case Code', caseCode || 'N/A'],
      ['Patient Info', patientInfo || 'N/A'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246] },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 9 },
  });

  let y = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text('Diagnosis', 20, y);
  y += 5;
  doc.setFontSize(10);
  doc.setTextColor(60);
  const diagLines = doc.splitTextToSize(diagnosis || 'No diagnosis provided', 170);
  doc.text(diagLines, 20, y);
  y += diagLines.length * 5 + 8;

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Treatment Plan', 20, y);
  y += 5;
  doc.setFontSize(10);
  doc.setTextColor(60);
  const treatLines = doc.splitTextToSize(treatment || 'No treatment plan', 170);
  doc.text(treatLines, 20, y);
  y += treatLines.length * 5 + 8;

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Medications', 20, y);
  y += 5;
  doc.setFontSize(10);
  doc.setTextColor(60);
  const medLines = doc.splitTextToSize(medications || 'No medications prescribed', 170);
  doc.text(medLines, 20, y);
  y += medLines.length * 5 + 8;

  if (notes) {
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Additional Notes', 20, y);
    y += 5;
    doc.setFontSize(10);
    doc.setTextColor(60);
    const noteLines = doc.splitTextToSize(notes, 170);
    doc.text(noteLines, 20, y);
    y += noteLines.length * 5 + 8;
  }

  y = Math.max(y + 15, 240);
  doc.setDrawColor(0);
  doc.line(20, y, 80, y);
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Dr. ${doctorName || 'Veterinarian'}`, 20, y + 5);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`License: ${doctorLicense || 'N/A'}`, 20, y + 10);
  doc.text(`Hospital: ${hospitalName || 'N/A'}`, 20, y + 15);

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('This is a computer-generated prescription from PawBandhan Animal Rescue Platform.', 105, 285, { align: 'center' });
  doc.text('Designed and Developed by Capture Visual Studios', 105, 290, { align: 'center' });

  return doc;
}

export function generateCaseReportPDF(caseData) {
  const doc = new jsPDF();
  const { incident, timeline, expenses, photos, treatment } = caseData;

  doc.setFontSize(22);
  doc.setTextColor(139, 92, 246);
  doc.text('PawBandhan', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Complete Case Report', 105, 28, { align: 'center' });

  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.5);
  doc.line(20, 32, 190, 32);

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(`Case: ${incident?.incidentCode || 'N/A'}`, 20, 42);

  doc.autoTable({
    startY: 48,
    head: [['Field', 'Details']],
    body: [
      ['Case Code', incident?.incidentCode || 'N/A'],
      ['Animal Type', incident?.animalType || 'N/A'],
      ['Status', incident?.status || 'N/A'],
      ['Workflow Stage', incident?.workflowStatus || 'N/A'],
      ['Injury Type', incident?.injuryType || 'N/A'],
      ['Description', incident?.description || 'N/A'],
      ['Location', `${incident?.latitude || 'N/A'}, ${incident?.longitude || 'N/A'}`],
      ['Created', incident?.createdAt ? new Date(incident.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'],
      ['Reported By', caseData.userName || 'N/A'],
      ['Assigned NGO', caseData.ngoName || 'N/A'],
      ['Assigned Doctor', caseData.doctorName || 'N/A'],
      ['Assigned Rider', caseData.riderName || 'N/A'],
      ['Estimated Cost', `₹${incident?.estimatedCost || 0}`],
      ['Final Cost', `₹${incident?.finalCost || 0}`],
      ['Commission', `${incident?.commissionPct || 15}%`],
      ['Payment Status', incident?.paymentStatus || 'N/A'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246] },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 8 },
  });

  if (timeline && timeline.length > 0) {
    let y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Case Timeline', 20, y);
    y += 3;

    doc.autoTable({
      startY: y,
      head: [['Status', 'Actor', 'Note', 'Time']],
      body: timeline.map(t => [
        t.status || '',
        t.actorType || '',
        t.note || '',
        t.createdAt ? new Date(t.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 7 },
    });
  }

  if (expenses && expenses.length > 0) {
    let y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Expenses', 20, y);
    y += 3;

    doc.autoTable({
      startY: y,
      head: [['Description', 'Amount', 'Category', 'Date']],
      body: expenses.map(e => [
        e.description || '',
        `₹${e.amount || 0}`,
        e.category || '',
        e.createdAt ? new Date(e.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 8 },
    });
  }

  if (treatment) {
    let y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Treatment Report', 20, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(60);
    const tLines = doc.splitTextToSize(treatment, 170);
    doc.text(tLines, 20, y);
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    doc.text('PawBandhan — Designed and Developed by Capture Visual Studios', 105, 295, { align: 'center' });
  }

  return doc;
}

export function generateEntityReportPDF(entities, title, columns) {
  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.setTextColor(139, 92, 246);
  doc.text('PawBandhan', 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(title || 'Entity Report', 105, 30, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 105, 36, { align: 'center' });

  doc.autoTable({
    startY: 42,
    head: [columns || ['Name', 'Email', 'Type', 'Status']],
    body: entities.map(e => columns ? columns.map(c => e[c] || '') : [e.name || e._label || '', e.email || '', e._type || e.type || '', e.status || '']),
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246] },
    margin: { left: 10, right: 10 },
    styles: { fontSize: 8 },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    doc.text('Designed and Developed by Capture Visual Studios', 105, 295, { align: 'center' });
  }

  return doc;
}
