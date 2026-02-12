import React from "react";
import { Tag } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import ItemCategoryFormFields from "@/components/forms/ItemCategoryFormFields";
import ItemCategoryEditForm from "@/components/forms/ItemCategoryEditForm";
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
      editFormComponent={<ItemCategoryEditForm />}
      onFormSuccess={() => {}}
      editDeleteConfig={{
        idKey: "cat_code",
        editFields: ["cat_code", "cat_name"],
        updateApi: itemCategoryApi.update,
        deleteApi: itemCategoryApi.delete,
      }}
    />
  );
};

export default ItemCategoryPage;
