import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, ClipboardList, Download, Loader2 } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import RequirementFormFields from "@/components/forms/RequirementFormFields";
import RequirementEditForm from "@/components/forms/RequirementEditForm";
import { deliveryRequirementApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatDateForTable, toProperCase } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { generateDeliveryReqPdf } from "@/lib/generateDeliveryReqPdf";

const columns = [
  { key: "req_date", label: "Requirement Date" },
  { key: "masjid_name", label: "Mosque Name" },
  { key: "req_qty", label: "Required Qty" },
  { key: "created_by", label: "Created By" },
];

const RequirementPage: React.FC = () => {
  const { toast } = useToast();
  const [pdfDate, setPdfDate] = useState<Date | undefined>();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleGeneratePdf = async () => {
    if (!pdfDate) return;
    setIsGeneratingPdf(true);
    try {
      const response = await deliveryRequirementApi.getAll();
      if (response.status === "success" && response.data) {
        const formattedDate = format(pdfDate, "yyyy-MM-dd");
        const filtered = (Array.isArray(response.data) ? response.data : [])
          .filter((r: any) => r.req_date?.split("T")[0] === formattedDate);

        if (filtered.length === 0) {
          toast({ title: "No Data", description: "No requirements found for the selected date", variant: "destructive" });
          return;
        }

        generateDeliveryReqPdf(
          formattedDate,
          filtered.map((r: any) => ({
            masjid_name: r.masjid_name,
            req_qty: String(r.req_qty),
          }))
        );
        toast({ title: "Success", description: "PDF downloaded successfully" });
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* PDF Report Section */}
      <div className="flex items-center gap-3 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-[220px] justify-start text-left font-normal", !pdfDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {pdfDate ? format(pdfDate, "PPP") : "Select date for report"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={pdfDate}
              onSelect={setPdfDate}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <Button
          onClick={handleGeneratePdf}
          disabled={!pdfDate || isGeneratingPdf}
          className="gap-2"
        >
          {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download Report
        </Button>
      </div>

      <MasterDataTable
        title="Delivery Requirement"
        description="Manage delivery requirements"
        icon={<ClipboardList className="w-5 h-5 text-green-600" />}
        columns={columns}
        fetchData={deliveryRequirementApi.getAll}
        formComponent={<RequirementFormFields />}
        editFormComponent={<RequirementEditForm />}
        onFormSuccess={() => {}}
        editDeleteConfig={{
          idKey: "req_date",
          editFields: ["req_date", "masjid_name", "masjid_code", "req_qty"],
          deleteFields: ["req_date", "masjid_code"],
          updateApi: deliveryRequirementApi.update,
          deleteApi: deliveryRequirementApi.delete,
        }}
      />
    </div>
  );
};

export default RequirementPage;
