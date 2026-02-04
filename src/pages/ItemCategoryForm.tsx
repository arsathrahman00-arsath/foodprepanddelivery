import React from "react";
import { Tag } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import ItemCategoryFormFields from "@/components/forms/ItemCategoryFormFields";
import { itemCategoryApi } from "@/lib/api";

const columns = [
  { key: "cat_name", label: "Category Name" },
  { key: "created_by", label: "Created By" },
];

const ItemCategoryPage: React.FC = () => {
  return (
    <MasterDataTable
      title="Item Category"
      description="Manage item categories"
      icon={<Tag className="w-5 h-5 text-blue-600" />}
      columns={columns}
      fetchData={itemCategoryApi.getAll}
      formComponent={<ItemCategoryFormFields />}
      onFormSuccess={() => {}}
    />
  );
};

export default ItemCategoryPage;
