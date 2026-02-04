import React from "react";
import { Ruler } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import UnitFormFields from "@/components/forms/UnitFormFields";
import { unitApi } from "@/lib/api";

const columns = [
  { key: "unit_name", label: "Unit Name" },
  { key: "unit_short", label: "Unit Short" },
  { key: "created_by", label: "Created By" },
];

const UnitPage: React.FC = () => {
  return (
    <MasterDataTable
      title="Unit"
      description="Manage measurement units"
      icon={<Ruler className="w-5 h-5 text-purple-600" />}
      columns={columns}
      fetchData={unitApi.getAll}
      formComponent={<UnitFormFields />}
      onFormSuccess={() => {}}
    />
  );
};

export default UnitPage;
