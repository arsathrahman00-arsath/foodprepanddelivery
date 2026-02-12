import React, { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { alphabetOnly, toProperCase } from "@/lib/utils";
import { itemCategoryApi } from "@/lib/api";

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
  editData?: any;
}

const ItemCategoryEditForm: React.FC<Props> = ({ onSuccess, editData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catName, setCatName] = useState(editData?.cat_name || "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) { setError("Category name is required"); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await itemCategoryApi.update({
        cat_code: String(editData?.cat_code || ""),
        cat_name: toProperCase(catName.trim()),
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
        <Label>Category Name *</Label>
        <Input value={catName} onChange={(e) => setCatName(e.target.value)} onKeyDown={alphabetOnly} className="h-10" />
      </div>
      <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
        <Save className="w-4 h-4" />{isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
};

export default ItemCategoryEditForm;
