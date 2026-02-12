import React, { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { numericOnly } from "@/lib/utils";
import { recipeApi, recipeTypeApi, itemSendApi, itemDetailsApi } from "@/lib/api";

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
  editData?: any;
}

const RecipeEditForm: React.FC<Props> = ({ onSuccess, editData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  
  const [recipeTypes, setRecipeTypes] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [itemDetails, setItemDetails] = useState<any[]>([]);

  const [recipeType, setRecipeType] = useState(editData?.recipe_type || "");
  const [itemName, setItemName] = useState(editData?.item_name || "");
  const [itemCode, setItemCode] = useState(editData?.item_code || "");
  const [catName, setCatName] = useState(editData?.cat_name || "");
  const [unitShort, setUnitShort] = useState(editData?.unit_short || "");
  const [reqQty, setReqQty] = useState(editData?.req_qty || "");

  useEffect(() => {
    Promise.all([recipeTypeApi.getAll(), itemSendApi.getAll(), itemDetailsApi.getAll()])
      .then(([rtRes, itemRes, detailRes]) => {
        if (rtRes.status === "success" || rtRes.status === "ok") setRecipeTypes(rtRes.data || []);
        if (itemRes.status === "success" || itemRes.status === "ok") setItems(itemRes.data || []);
        if (detailRes.status === "success" || detailRes.status === "ok") setItemDetails(detailRes.data || []);
      })
      .finally(() => setLoadingDropdowns(false));
  }, []);

  const handleItemChange = (value: string) => {
    setItemName(value);
    const item = items.find((i: any) => i.item_name === value);
    const detail = itemDetails.find((d: any) => d.item_name === value);
    setItemCode(item?.item_code?.toString() || "");
    setCatName(detail?.cat_name || "");
    setUnitShort(detail?.unit_short || "");
  };

  const handleRecipeTypeChange = (value: string) => {
    setRecipeType(value);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeType || !itemName || !reqQty) { setError("All fields are required"); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await recipeApi.update({
        recipe_code: String(editData?.recipe_code || ""),
        recipe_type: recipeType,
        item_name: itemName,
        item_code: String(itemCode),
        cat_name: catName,
        unit_short: unitShort,
        req_qty: String(reqQty),
      });
      if (response.status === "success" || response.status === "ok") { onSuccess?.(); }
      else { setError(response.message || "Failed to update"); }
    } catch { setError("Unable to connect to server"); }
    finally { setIsLoading(false); }
  };

  if (loadingDropdowns) return <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
      <div className="space-y-2">
        <Label>Recipe Type *</Label>
        <Select value={recipeType} onValueChange={handleRecipeTypeChange}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Select recipe type" /></SelectTrigger>
          <SelectContent className="bg-background border z-50">
            {recipeTypes.map((rt: any) => <SelectItem key={rt.recipe_type} value={rt.recipe_type}>{rt.recipe_type}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Item Name *</Label>
        <Select value={itemName} onValueChange={handleItemChange}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Select item" /></SelectTrigger>
          <SelectContent className="bg-background border z-50">
            {items.map((i: any) => <SelectItem key={`${i.item_name}-${i.item_code}`} value={i.item_name}>{i.item_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Input value={catName} readOnly disabled className="h-10 bg-muted" />
        </div>
        <div className="space-y-2">
          <Label>Unit</Label>
          <Input value={unitShort} readOnly disabled className="h-10 bg-muted" />
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
