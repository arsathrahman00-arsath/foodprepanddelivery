import React from "react";
import { Package } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import ItemFormFields from "@/components/forms/ItemFormFields";
import { itemApi } from "@/lib/api";

const columns = [
  { key: "item_name", label: "Item Name" },
  { key: "cat_name", label: "Category Name" },
  { key: "unit_short", label: "Unit Short" },
  { key: "created_by", label: "Created By" },
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
