import React from "react";
import { UtensilsCrossed } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import RecipeFormFields from "@/components/forms/RecipeFormFields";
import { recipeApi } from "@/lib/api";

const columns = [
  { key: "recipe_name", label: "recipe_name" },
  { key: "recipe_type", label: "recipe_type" },
  { key: "item_name", label: "item_name" },
  { key: "unit_short", label: "unit_short" },
  { key: "req_qty", label: "req_qty" },
  { key: "created_by", label: "created_by" },
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
