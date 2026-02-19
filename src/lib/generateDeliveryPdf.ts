import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface DeliveryRow {
  delivery_date: string;
  location: string;
  delivery_qty: string;
  delivery_by: string;
}

function formatDateDDMMYYYY(dateStr: string): string {
  const cleaned = dateStr.split("T")[0];
  const parts = cleaned.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dateStr;
}

export function generateDeliveryPdf(date: string, rows: DeliveryRow[]): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Food Delivery", pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${formatDateDDMMYYYY(date)}`, pageWidth - 14, 28, { align: "right" });

  const filtered = rows.filter(r => r.delivery_date.split("T")[0] === date);

  autoTable(doc, {
    startY: 36,
    head: [["#", "Date", "Location", "Delivery Qty", "Delivery By"]],
    body: filtered.map((row, i) => [
      String(i + 1),
      formatDateDDMMYYYY(row.delivery_date),
      row.location,
      row.delivery_qty,
      row.delivery_by,
    ]),
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`Food_Delivery_${formatDateDDMMYYYY(date)}.pdf`);
}
