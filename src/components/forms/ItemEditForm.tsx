import React, { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { alphabetOnly, toProperCase } from "@/lib/utils";
import { itemApi, categoryUnitApi } from "@/lib/api";

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
  editData?: any;
}

const ItemEditForm: React.FC<Props> = ({ onSuccess, editData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemName, setItemName] = useState(editData?.item_name || "");
  const [catName, setCatName] = useState(editData?.cat_name || "");
  const [unitShort, setUnitShort] = useState(editData?.unit_short || "");
  const [categories, setCategories] = useState<{ cat_name: string }[]>([]);
  const [units, setUnits] = useState<{ unit_short: string }[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  useEffect(() => {
    categoryUnitApi.getAll().then((res) => {
      if (res.status === "success" || res.status === "ok") {
        setCategories(res.data?.categories || []);
        setUnits(res.data?.units || []);
      }
    }).finally(() => setLoadingDropdowns(false));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !catName || !unitShort) { setError("All fields are required"); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await itemApi.update({
        item_code: String(editData?.item_code || ""),
        item_name: toProperCase(itemName.trim()),
        cat_name: catName,
        unit_short: unitShort,
      });
      if (response.status === "success" || response.status === "ok") { onSuccess?.(); }
      else { setError(response.message || "Failed to update"); }
    } catch { setError("Unable to connect to server"); }
    finally { setIsLoading(false); }
  };

  if (loadingDropdowns) return <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /><span className="ml-2 text-muted-foreground">Loading...</span></div>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
      <div className="space-y-2">
        <Label>Item Name *</Label>
        <Input value={itemName} onChange={(e) => setItemName(e.target.value)} onKeyDown={alphabetOnly} className="h-10" />
      </div>
      <div className="space-y-2">
        <Label>Category *</Label>
        <Select value={catName} onValueChange={setCatName}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent className="bg-background border z-50">
            {categories.map((c) => <SelectItem key={c.cat_name} value={c.cat_name}>{c.cat_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Unit *</Label>
        <Select value={unitShort} onValueChange={setUnitShort}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Select unit" /></SelectTrigger>
          <SelectContent className="bg-background border z-50">
            {units.map((u) => <SelectItem key={u.unit_short} value={u.unit_short}>{u.unit_short}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
        <Save className="w-4 h-4" />{isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
};

export default ItemEditForm;
