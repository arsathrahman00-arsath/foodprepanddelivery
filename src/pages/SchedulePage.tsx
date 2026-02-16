import React, { useState, useEffect } from "react";
import { CalendarDays, FileDown } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import ScheduleFormFields from "@/components/forms/ScheduleFormFields";
import ScheduleEditForm from "@/components/forms/ScheduleEditForm";
import { deliveryScheduleApi } from "@/lib/api";
import { generateSchedulePdf } from "@/lib/generateSchedulePdf";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const columns = [
  { key: "schd_date", label: "Schedule Date" },
  { key: "recipe_type", label: "Recipe Type" },
  { key: "created_by", label: "Created By" },
];

const SchedulePage: React.FC = () => {
  const { toast } = useToast();
  const [scheduleData, setScheduleData] = useState<any[]>([]);

  const loadScheduleData = async () => {
    try {
      const res = await deliveryScheduleApi.getAll();
      if (res.status === "success" || res.status === "ok") {
        setScheduleData(res.data || []);
      }
    } catch {}
  };

  useEffect(() => { loadScheduleData(); }, []);

  const handlePrintPdf = () => {
    if (scheduleData.length === 0) {
      toast({ title: "No Data", description: "No schedule data to export", variant: "destructive" });
      return;
    }
    generateSchedulePdf(scheduleData);
  };

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={handlePrintPdf}>
          <FileDown className="w-4 h-4" />
          Print PDF
        </Button>
      </div>
      <MasterDataTable
        title="Delivery Schedule"
        description="Manage delivery schedules"
        icon={<CalendarDays className="w-5 h-5 text-blue-600" />}
        columns={columns}
        fetchData={deliveryScheduleApi.getAll}
        formComponent={<ScheduleFormFields />}
        editFormComponent={<ScheduleEditForm />}
        onFormSuccess={() => { loadScheduleData(); }}
        editDeleteConfig={{
          idKey: "schd_date",
          editFields: ["schd_date", "recipe_type", "recipe_code"],
          updateApi: deliveryScheduleApi.update,
        }}
      />
    </div>
  );
};

export default SchedulePage;
