import React, { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { alphabetOnly, numericOnly, toProperCase } from "@/lib/utils";
import { recipeTypeApi } from "@/lib/api";

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
  editData?: any;
}

const RecipeTypeEditForm: React.FC<Props> = ({ onSuccess, editData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipeType, setRecipeType] = useState(editData?.recipe_type || "");
  const [recipePerkg, setRecipePerkg] = useState(editData?.recipe_perkg || "");
  const [recipeTotpkt, setRecipeTotpkt] = useState(editData?.recipe_totpkt || "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeType.trim() || !recipePerkg || !recipeTotpkt) { setError("All fields are required"); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await recipeTypeApi.update({
        recipe_code: String(editData?.recipe_code || ""),
        recipe_type: toProperCase(recipeType.trim()),
        recipe_perkg: String(recipePerkg),
        recipe_totpkt: String(recipeTotpkt),
      });
      if (response.status === "success" || response.status === "ok") { onSuccess?.(); }
      else { setError(response.message || "Failed to update"); }
    } catch { setError("Unable to connect to server"); }
    finally { setIsLoading(false); }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
      <div className="space-y-2">
        <Label>Recipe Type *</Label>
        <Input value={recipeType} onChange={(e) => setRecipeType(e.target.value)} onKeyDown={alphabetOnly} className="h-10" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Recipe Kgs Per Day *</Label>
          <Input type="number" step="0.01" min="0" value={recipePerkg} onChange={(e) => setRecipePerkg(e.target.value)} onKeyDown={numericOnly} className="h-10" />
        </div>
        <div className="space-y-2">
          <Label>Pockets Per Day *</Label>
          <Input type="number" step="1" min="0" value={recipeTotpkt} onChange={(e) => setRecipeTotpkt(e.target.value)} onKeyDown={numericOnly} className="h-10" />
        </div>
      </div>
      <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
        <Save className="w-4 h-4" />{isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
};

export default RecipeTypeEditForm;
