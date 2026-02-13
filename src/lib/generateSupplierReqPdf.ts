import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SupplierReqItem {
  item_name: string;
  cat_name: string;
  unit_short: string;
  day_req_qty: string | number;
}

interface SupplierReqPdfParams {
  date: string;
  recipeType: string;
  supplierName: string;
  categoryName: string;
  items: SupplierReqItem[];
}

function formatDateDDMMYYYY(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dateStr;
}

export function generateSupplierReqPdf(params: SupplierReqPdfParams): void {
  const { date, supplierName, items } = params;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const formattedDate = formatDateDDMMYYYY(date);

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Request For Supplier", pageWidth / 2, 18, { align: "center" });

  // Date - top right, below heading
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${formattedDate}`, pageWidth - 14, 28, { align: "right" });

  // Supplier info
  doc.text(`Supplier: ${supplierName}`, 14, 28);

  // Table
  autoTable(doc, {
    startY: 36,
    head: [["#", "Item Name", "Unit", "Required Qty"]],
    body: items.map((item, index) => [
      String(index + 1),
      item.item_name,
      item.unit_short,
      String(item.day_req_qty),
    ]),
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  doc.save(
    `Supplier_Request_${date}_${supplierName.replace(/\s+/g, "_")}.pdf`
  );
}
