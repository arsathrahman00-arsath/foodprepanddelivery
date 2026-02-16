import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RequirementRow {
  masjid_name: string;
  req_qty: string;
}

function formatDateDDMMYYYY(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dateStr;
}

export function generateDeliveryReqPdf(date: string, rows: RequirementRow[]): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Delivery Requirement", pageWidth / 2, 18, { align: "center" });

  // Date - top right
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${formatDateDDMMYYYY(date)}`, pageWidth - 14, 28, { align: "right" });

  // Table
  autoTable(doc, {
    startY: 36,
    head: [["#", "Mosque Name", "Required Qty"]],
    body: rows.map((row, i) => [
      String(i + 1),
      row.masjid_name,
      row.req_qty,
    ]),
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`Delivery_Requirement_${date}.pdf`);
}
