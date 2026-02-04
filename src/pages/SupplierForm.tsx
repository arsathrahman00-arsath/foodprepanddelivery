import React from "react";
import { Truck } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import SupplierFormFields from "@/components/forms/SupplierFormFields";
import { supplierApi } from "@/lib/api";

const columns = [
  { key: "sup_name", label: "sup_name" },
  { key: "sup_add", label: "sup_add" },
  { key: "sup_city", label: "sup_city" },
  { key: "sup_mobile", label: "sup_mobile" },
  { key: "created_by", label: "created_by" },
];

const SupplierPage: React.FC = () => {
  return (
    <MasterDataTable
      title="Supplier"
      description="Manage suppliers"
      icon={<Truck className="w-5 h-5 text-rose-600" />}
      columns={columns}
      fetchData={supplierApi.getAll}
      formComponent={<SupplierFormFields />}
      onFormSuccess={() => {}}
    />
  );
};

export default SupplierPage;
