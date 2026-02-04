import React from "react";
import { Truck } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import SupplierFormFields from "@/components/forms/SupplierFormFields";
import { supplierApi } from "@/lib/api";

const columns = [
  { key: "sup_name", label: "Supplier Name" },
  { key: "sup_add", label: "Address" },
  { key: "sup_city", label: "City" },
  { key: "sup_mobile", label: "Mobile" },
  { key: "created_by", label: "Created By" },
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
