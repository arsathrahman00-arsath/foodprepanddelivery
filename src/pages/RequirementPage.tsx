import React from "react";
import { ClipboardList } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import RequirementFormFields from "@/components/forms/RequirementFormFields";
import RequirementEditForm from "@/components/forms/RequirementEditForm";
import { deliveryRequirementApi } from "@/lib/api";

const columns = [
  { key: "req_date", label: "Requirement Date" },
  { key: "masjid_name", label: "Mosque Name" },
  { key: "req_qty", label: "Required Qty" },
  { key: "created_by", label: "Created By" },
];

const RequirementPage: React.FC = () => {
  return (
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
  );
};

export default RequirementPage;
