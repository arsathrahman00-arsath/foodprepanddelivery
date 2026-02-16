import React, { useState, useEffect } from "react";
import { Plus, Minus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { itemApi, categoryUnitApi } from "@/lib/api";
import { alphabetOnly, toProperCase, numericOnly } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ItemRow {
  id: string;
  item_name: string;
  cat_name: string;
  brand: string;
  unit_short: string;
  item_rate: string;
  remark: string;
}

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
}

const createEmptyRow = (): ItemRow => ({
  id: crypto.randomUUID(),
  item_name: "",
  cat_name: "",
  brand: "",
  unit_short: "",
  item_rate: "",
  remark: "",
});

const ItemFormFields: React.FC<Props> = ({ onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<{ cat_name: string }[]>([]);
  const [units, setUnits] = useState<{ unit_short: string }[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [rows, setRows] = useState<ItemRow[]>([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadDropdownData = async () => {
      setLoadingDropdowns(true);
      try {
        const [catUnitRes, itemsRes] = await Promise.all([
          categoryUnitApi.getAll(),
          itemApi.getAll(),
        ]);
        if (catUnitRes.status === "success" || catUnitRes.status === "ok") {
          setCategories(catUnitRes.data?.categories || []);
          setUnits(catUnitRes.data?.units || []);
        }
        if (itemsRes.status === "success" || itemsRes.status === "ok") {
          setExistingNames(new Set((itemsRes.data || []).map((r: any) => r.item_name?.toLowerCase())));
        }
      } catch (err) {
        console.error("Failed to load dropdown data:", err);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    loadDropdownData();
  }, []);

  const addRow = () => setRows(prev => [...prev, createEmptyRow()]);

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof ItemRow, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter(r => r.item_name.trim() && r.cat_name && r.unit_short);
    if (validRows.length === 0) {
      toast({ title: "Validation Error", description: "Please fill at least one complete row (Item Name, Category, Unit)", variant: "destructive" });
      return;
    }

    const duplicates = validRows.filter(r => existingNames.has(r.item_name.trim().toLowerCase()));
    if (duplicates.length > 0) {
      toast({ title: "Duplicate Found", description: `Item(s) already exist: ${duplicates.map(d => d.item_name.trim()).join(", ")}`, variant: "destructive" });
      return;
    }

    const namesInBatch = validRows.map(r => r.item_name.trim().toLowerCase());
    const batchDuplicates = namesInBatch.filter((name, i) => namesInBatch.indexOf(name) !== i);
    if (batchDuplicates.length > 0) {
      toast({ title: "Duplicate Found", description: `Duplicate item names in current entries`, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const results = await Promise.all(
        validRows.map(row =>
          itemApi.create({
            item_name: toProperCase(row.item_name.trim()),
            cat_name: row.cat_name,
            brand: row.brand.trim(),
            unit_short: row.unit_short,
            item_rate: row.item_rate.trim(),
            remark: row.remark.trim(),
            created_by: user?.user_name || "",
          })
        )
      );

      const allSuccess = results.every(r => r.status === "success" || r.status === "ok");
      if (allSuccess) {
        validRows.forEach(r => existingNames.add(r.item_name.trim().toLowerCase()));
        toast({ title: "Success", description: `${validRows.length} item(s) created successfully` });
        setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
        onSuccess?.();
      } else {
        toast({ title: "Error", description: "Some items failed to create", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Unable to connect to server", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingDropdowns) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="p-3 border rounded-lg bg-muted/30 space-y-2">
            <div className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Item Name *</Label>}
                  <Input
                    placeholder="Item name"
                    value={row.item_name}
                    onChange={(e) => updateRow(row.id, "item_name", e.target.value)}
                    onKeyDown={alphabetOnly}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Category *</Label>}
                  <Select value={row.cat_name} onValueChange={(v) => updateRow(row.id, "cat_name", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {categories.map((cat) => (
                        <SelectItem key={cat.cat_name} value={cat.cat_name}>{cat.cat_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Unit *</Label>}
                  <Select value={row.unit_short} onValueChange={(v) => updateRow(row.id, "unit_short", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Unit" /></SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {units.map((unit) => (
                        <SelectItem key={unit.unit_short} value={unit.unit_short}>{unit.unit_short}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-1 pt-1">
                {index === rows.length - 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={addRow}>
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
                {rows.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRow(row.id)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                {index === 0 && <Label className="text-xs">Brand</Label>}
                <Input
                  placeholder="Brand"
                  value={row.brand}
                  onChange={(e) => updateRow(row.id, "brand", e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                {index === 0 && <Label className="text-xs">Rate</Label>}
                <Input
                  placeholder="Rate"
                  value={row.item_rate}
                  onChange={(e) => updateRow(row.id, "item_rate", e.target.value)}
                  onKeyDown={numericOnly}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                {index === 0 && <Label className="text-xs">Remarks</Label>}
                <Input
                  placeholder="Remarks"
                  value={row.remark}
                  onChange={(e) => updateRow(row.id, "remark", e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-2">
        <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
          <Plus className="w-4 h-4" />
          {isLoading ? "Creating..." : `Add ${rows.filter(r => r.item_name.trim() && r.cat_name && r.unit_short).length || ""} Item(s)`}
        </Button>
      </div>
    </form>
  );
};

export default ItemFormFields;
