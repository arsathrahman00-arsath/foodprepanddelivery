import React from "react";
import { UtensilsCrossed } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import RecipeFormFields from "@/components/forms/RecipeFormFields";
import { recipeApi } from "@/lib/api";

const columns = [
  { key: "recipe_name", label: "Recipe Name" },
  { key: "recipe_type", label: "Recipe Type" },
  { key: "item_name", label: "Item Name" },
  { key: "unit_short", label: "Unit" },
  { key: "req_qty", label: "Required Qty" },
  { key: "created_by", label: "Created By" },
];

const RecipePage: React.FC = () => {
  return (
    <MasterDataTable
      title="Recipe"
      description="Manage recipes"
      icon={<UtensilsCrossed className="w-5 h-5 text-orange-600" />}
      columns={columns}
      fetchData={recipeApi.getAll}
      formComponent={<RecipeFormFields />}
      onFormSuccess={() => {}}
    />
  );
};

export default RecipePage;
