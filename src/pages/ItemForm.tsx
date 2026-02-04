import React from "react";
import { Package } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import ItemFormFields from "@/components/forms/ItemFormFields";
import { itemApi } from "@/lib/api";

const columns = [
  { key: "item_name", label: "item_name" },
  { key: "cat_name", label: "cat_name" },
  { key: "unit_short", label: "unit_short" },
  { key: "created_by", label: "created_by" },
];

const ItemPage: React.FC = () => {
  return (
    <MasterDataTable
      title="Item"
      description="Manage inventory items"
      icon={<Package className="w-5 h-5 text-amber-600" />}
      columns={columns}
      fetchData={itemApi.getAll}
      formComponent={<ItemFormFields />}
      onFormSuccess={() => {}}
    />
  );
};

export default ItemPage;
