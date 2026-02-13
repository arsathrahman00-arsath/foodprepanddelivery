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

export function generateSupplierReqPdf(params: SupplierReqPdfParams): void {
  const { date, recipeType, supplierName, categoryName, items } = params;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Request For Supplier", pageWidth / 2, 18, { align: "center" });

  // Header info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const headerY = 28;
  doc.text(`Date: ${date}`, 14, headerY);
  doc.text(`Recipe Type: ${recipeType}`, 14, headerY + 6);
  doc.text(`Supplier: ${supplierName}`, pageWidth / 2, headerY);
  doc.text(`Category: ${categoryName}`, pageWidth / 2, headerY + 6);

  // Table
  autoTable(doc, {
    startY: headerY + 16,
    head: [["#", "Item Name", "Category", "Unit", "Required Qty"]],
    body: items.map((item, index) => [
      String(index + 1),
      item.item_name,
      item.cat_name,
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
