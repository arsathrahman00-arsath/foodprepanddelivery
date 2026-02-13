import React from "react";
import { BookOpen } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import RecipeTypeFormFields from "@/components/forms/RecipeTypeFormFields";
import RecipeTypeEditForm from "@/components/forms/RecipeTypeEditForm";
import { recipeTypeApi } from "@/lib/api";

const columns = [
  { key: "recipe_type", label: "Recipe Type" },
  { key: "recipe_perkg", label: "Recipe Kgs Per Day" },
  { key: "recipe_totpkt", label: "Pockets Per Day" },
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
      editFormComponent={<RecipeTypeEditForm />}
      onFormSuccess={() => {}}
      editDeleteConfig={{
        idKey: "recipe_code",
        editFields: ["recipe_code", "recipe_type", "recipe_perkg", "recipe_totpkt"],
        updateApi: recipeTypeApi.update,
        deleteApi: recipeTypeApi.delete,
      }}
    />
  );
};

export default RecipeTypePage;
