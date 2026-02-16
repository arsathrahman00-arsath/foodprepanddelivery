import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ScheduleRow {
  schd_date: string;
  recipe_type: string;
}

function formatDateDDMMYYYY(dateStr: string): string {
  const cleaned = dateStr.split("T")[0];
  const parts = cleaned.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dateStr;
}

export function generateSchedulePdf(data: ScheduleRow[]): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Delivery Schedule Report", pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
  doc.text(`Date: ${todayStr}`, pageWidth - 14, 28, { align: "right" });

  // Sort by date ascending
  const sorted = [...data].sort((a, b) => new Date(a.schd_date).getTime() - new Date(b.schd_date).getTime());

  autoTable(doc, {
    startY: 36,
    head: [["#", "Date", "Recipe Type"]],
    body: sorted.map((row, i) => [String(i + 1), formatDateDDMMYYYY(row.schd_date), row.recipe_type]),
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`Delivery_Schedule_${todayStr}.pdf`);
}
