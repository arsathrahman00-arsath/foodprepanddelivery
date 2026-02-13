import React from "react";
import { UtensilsCrossed } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import RecipeFormFields from "@/components/forms/RecipeFormFields";
import RecipeEditForm from "@/components/forms/RecipeEditForm";
import { recipeApi } from "@/lib/api";

const columns = [
  { key: "recipe_type", label: "Recipe Type" },
  { key: "item_name", label: "Item Name" },
  { key: "unit_short", label: "Unit" },
  { key: "req_qty", label: "Recipe (Kg)" },
  { key: "created_by", label: "Created By" },
];

const RecipePage: React.FC = () => {
  return (
    <MasterDataTable
      title="Recipe for a Kg"
      description="Manage recipes"
      icon={<UtensilsCrossed className="w-5 h-5 text-orange-600" />}
      columns={columns}
      fetchData={recipeApi.getAll}
      formComponent={<RecipeFormFields />}
      editFormComponent={<RecipeEditForm />}
      onFormSuccess={() => {}}
      editDeleteConfig={{
        idKey: "recipe_code",
        editFields: ["recipe_code", "recipe_type", "item_name", "item_code", "cat_name", "unit_short", "req_qty"],
        updateApi: (data: Record<string, string>) => recipeApi.update({ recipe_code: data.recipe_code, req_qty: data.req_qty }),
        deleteApi: recipeApi.delete,
      }}
    />
  );
};

export default RecipePage;
