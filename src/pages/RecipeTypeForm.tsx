import React from "react";
import { BookOpen } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import RecipeTypeFormFields from "@/components/forms/RecipeTypeFormFields";
import { recipeTypeApi } from "@/lib/api";

const columns = [
  { key: "recipe_type", label: "Recipe Type" },
  { key: "recipe_perkg", label: "Recipe per kg" },
  { key: "recipe_totpkt", label: "Recipe tot pkt" },
  { key: "created_by", label: "Created By" },
];

const RecipeTypePage: React.FC = () => {
  return (
    <MasterDataTable
      title="Recipe Type"
      description="Manage recipe types"
      icon={<BookOpen className="w-5 h-5 text-cyan-600" />}
      columns={columns}
      fetchData={recipeTypeApi.getAll}
      formComponent={<RecipeTypeFormFields />}
      onFormSuccess={() => {}}
    />
  );
};

export default RecipeTypePage;
