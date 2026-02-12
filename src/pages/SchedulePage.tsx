import React from "react";
import { CalendarDays } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import ScheduleFormFields from "@/components/forms/ScheduleFormFields";
import ScheduleEditForm from "@/components/forms/ScheduleEditForm";
import { deliveryScheduleApi } from "@/lib/api";

const columns = [
  { key: "schd_date", label: "Schedule Date" },
  { key: "recipe_type", label: "Recipe Type" },
  { key: "created_by", label: "Created By" },
];

const SchedulePage: React.FC = () => {
  return (
    <MasterDataTable
      title="Delivery Schedule"
      description="Manage delivery schedules"
      icon={<CalendarDays className="w-5 h-5 text-blue-600" />}
      columns={columns}
      fetchData={deliveryScheduleApi.getAll}
      formComponent={<ScheduleFormFields />}
      editFormComponent={<ScheduleEditForm />}
      onFormSuccess={() => {}}
      editDeleteConfig={{
        idKey: "schd_date",
        editFields: ["schd_date", "recipe_type", "recipe_code"],
        updateApi: deliveryScheduleApi.update,
      }}
    />
  );
};

export default SchedulePage;
