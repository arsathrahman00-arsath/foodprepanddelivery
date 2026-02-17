import React, { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { alphabetOnly, numericOnly, toProperCase } from "@/lib/utils";
import { supplierApi, itemCategoryApi } from "@/lib/api";

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
  editData?: any;
}

interface CategoryOption {
  cat_code: string;
  cat_name: string;
}

const SupplierEditForm: React.FC<Props> = ({ onSuccess, editData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supName, setSupName] = useState(editData?.sup_name || "");
  const [supAdd, setSupAdd] = useState(editData?.sup_add || "");
  const [supCity, setSupCity] = useState(editData?.sup_city || "");
  const [supMobile, setSupMobile] = useState(editData?.sup_mobile || "");
  const [catCode, setCatCode] = useState(editData?.cat_code || "");
  const [catName, setCatName] = useState(editData?.cat_name || "");
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await itemCategoryApi.getAll();
        if ((res.status === "success" || res.status === "ok") && res.data) {
          setCategories(Array.isArray(res.data) ? res.data : []);
        }
      } catch {}
    };
    fetchCategories();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supAdd.trim() || !supCity.trim() || !supMobile.trim() || !catCode) {
      setError("All fields are required");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const selectedCat = categories.find(c => c.cat_code === catCode);
      const response = await supplierApi.update({
        sup_code: String(editData?.sup_code || ""),
        sup_name: toProperCase(supName.trim()),
        sup_add: toProperCase(supAdd.trim()),
        sup_city: toProperCase(supCity.trim()),
        sup_mobile: supMobile.trim(),
        cat_code: catCode,
        cat_name: selectedCat?.cat_name || catName,
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
        <Label>Supplier Name *</Label>
        <Input value={supName} onChange={(e) => setSupName(e.target.value)} onKeyDown={alphabetOnly} className="h-10" />
      </div>
      <div className="space-y-2">
        <Label>Address *</Label>
        <Input value={supAdd} onChange={(e) => setSupAdd(e.target.value)} className="h-10" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>City *</Label>
          <Input value={supCity} onChange={(e) => setSupCity(e.target.value)} onKeyDown={alphabetOnly} className="h-10" />
        </div>
        <div className="space-y-2">
          <Label>Mobile *</Label>
          <Input value={supMobile} onChange={(e) => setSupMobile(e.target.value)} onKeyDown={numericOnly} className="h-10" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Category Name *</Label>
        <Select value={catCode} onValueChange={(val) => {
          setCatCode(val);
          const cat = categories.find(c => c.cat_code === val);
          if (cat) setCatName(cat.cat_name);
        }}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="z-[200] bg-popover">
            {categories.map((c) => (
              <SelectItem key={c.cat_code} value={c.cat_code}>{c.cat_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
        <Save className="w-4 h-4" />{isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
};

export default SupplierEditForm;
