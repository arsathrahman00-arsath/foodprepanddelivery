import React, { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { numericOnly } from "@/lib/utils";
import { recipeApi } from "@/lib/api";

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
  editData?: any;
}

const RecipeEditForm: React.FC<Props> = ({ onSuccess, editData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reqQty, setReqQty] = useState(editData?.req_qty || "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqQty) { setError("Required Qty is required"); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await recipeApi.update({
        recipe_code: String(editData?.recipe_code || ""),
        item_code: String(editData?.item_code || ""),
        req_qty: String(reqQty),
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
        <Label>Recipe Type</Label>
        <Input value={editData?.recipe_type || ""} readOnly disabled className="h-10 bg-muted" />
      </div>
      <div className="space-y-2">
        <Label>Item Name</Label>
        <Input value={editData?.item_name || ""} readOnly disabled className="h-10 bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Input value={editData?.cat_name || ""} readOnly disabled className="h-10 bg-muted" />
        </div>
        <div className="space-y-2">
          <Label>Unit</Label>
          <Input value={editData?.unit_short || ""} readOnly disabled className="h-10 bg-muted" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Required Qty *</Label>
        <Input type="number" step="0.01" min="0" value={reqQty} onChange={(e) => setReqQty(e.target.value)} onKeyDown={numericOnly} className="h-10" />
      </div>
      <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
        <Save className="w-4 h-4" />{isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
};

export default RecipeEditForm;
