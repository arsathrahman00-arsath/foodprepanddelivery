import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { dayRequirementsApi } from "./api";

interface RequirementRow {
  day_req_date: string;
  recipe_type: string;
  day_tot_req: string;
}

interface RecipeItem {
  item_name: string;
  cat_name: string;
  unit_short: string;
  req_qty: number;
}

export async function generateDayReqPdf(row: RequirementRow): Promise<void> {
  const recipeType = row.recipe_type.trim();

  // Fetch items and totpkt in parallel
  const [itemsRes, totpktRes] = await Promise.all([
    dayRequirementsApi.getRecipeItems(recipeType),
    dayRequirementsApi.getRecipeTotpkt(recipeType),
  ]);

  const items: RecipeItem[] =
    itemsRes.status === "success" && itemsRes.data ? itemsRes.data : [];
  const totpkt =
    totpktRes.status === "success" && totpktRes.data
      ? Number(totpktRes.data.recipe_totpkt) || 1
      : 1;

  const totalReq = Number(row.day_tot_req) || 0;
  const kgValue = totpkt > 0 ? totalReq / totpkt : 0;
  const roundValue = Math.ceil(kgValue);

  // Group items by category
  const grouped: Record<string, RecipeItem[]> = {};
  items.forEach((item) => {
    const cat = item.cat_name || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  // Format date for display
  const dateStr = row.day_req_date?.split("T")[0] || row.day_req_date;

  // Build PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Day Requirements Report", pageWidth / 2, 18, { align: "center" });

  // Header info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const headerY = 28;
  doc.text(`Date: ${dateStr}`, 14, headerY);
  doc.text(`Recipe Type: ${recipeType}`, 14, headerY + 6);
  doc.text(`Total Req (pck): ${totalReq}`, 14, headerY + 12);
  doc.text(`Total Req (kg): ${kgValue.toFixed(2)}`, pageWidth / 2, headerY + 6);
  doc.text(`Multiplier (Round): ${roundValue}`, pageWidth / 2, headerY + 12);

  let startY = headerY + 22;

  const categoryNames = Object.keys(grouped).sort();

  categoryNames.forEach((cat) => {
    const catItems = grouped[cat];

    // Category header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(cat, 14, startY);
    startY += 2;

    autoTable(doc, {
      startY,
      head: [["Item Name", "Unit", "Req Qty", "Total Qty"]],
      body: catItems.map((item) => [
        item.item_name,
        item.unit_short,
        String(item.req_qty),
        String((Number(item.req_qty) || 0) * roundValue),
      ]),
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {},
    });

    // Get the final Y after the table
    startY = (doc as any).lastAutoTable.finalY + 10;
  });

  doc.save(`Day_Requirements_${dateStr}_${recipeType.replace(/\s+/g, "_")}.pdf`);
}
