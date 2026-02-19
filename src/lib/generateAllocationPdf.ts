import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AllocationRow {
  alloc_date: string;
  masjid_name: string;
  recipe_type: string;
  req_qty: string | number;
  alloc_qty: string | number;
}

function formatDateDDMMYYYY(dateStr: string): string {
  const cleaned = dateStr.split("T")[0];
  const parts = cleaned.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dateStr;
}

export function generateAllocationPdf(data: AllocationRow[], filterDate: string): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Food Allocation", pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${formatDateDDMMYYYY(filterDate)}`, pageWidth - 14, 28, { align: "right" });

  const filtered = data.filter(r => r.alloc_date.split("T")[0] === filterDate);

  autoTable(doc, {
    startY: 36,
    head: [["#", "Date", "Location", "Recipe Type", "Req Qty", "Alloc Qty"]],
    body: filtered.map((row, i) => [
      String(i + 1),
      formatDateDDMMYYYY(row.alloc_date),
      row.masjid_name,
      row.recipe_type,
      String(row.req_qty),
      String(row.alloc_qty),
    ]),
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`Food_Allocation_${formatDateDDMMYYYY(filterDate)}.pdf`);
}
