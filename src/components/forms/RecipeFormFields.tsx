import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Minus, Loader2, Search } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { recipeApi, recipeTypeApi, itemSendApi, itemDetailsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { numericOnly } from "@/lib/utils";

interface RecipeItem {
  id: string;
  item_name: string;
  item_code: string;
  cat_name: string;
  cat_code: string;
  unit_short: string;
  req_qty: string;
  isExisting?: boolean;
}

interface ItemSendData {
  item_name: string;
  item_code: number;
}

interface ItemDetailData {
  item_name: string;
  cat_name: string;
  cat_code: number;
  unit_short: string;
}

interface RecipeTypeData {
  recipe_type: string;
  recipe_code?: number;
}

/** Searchable item select dropdown */
const ItemSearchSelect: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
  items: ItemSendData[];
  disabled?: boolean;
}> = ({ value, onValueChange, items, disabled }) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return items;
    return items.filter((item) =>
      item.item_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  if (disabled) {
    return (
      <Button variant="outline" className="h-9 w-full justify-between text-sm font-normal bg-muted" disabled>
        {value || <span className="text-muted-foreground">Select item</span>}
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="h-9 w-full justify-between text-sm font-normal">
          {value || <span className="text-muted-foreground">Select item</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0 z-50" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No items found.</p>
          ) : (
            filtered.map((item) => (
              <button
                key={`${item.item_name}-${item.item_code}`}
                type="button"
                onClick={() => {
                  onValueChange(item.item_name);
                  setOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left text-sm px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground ${
                  value === item.item_name ? "bg-accent" : ""
                }`}
              >
                {item.item_name}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
}

const RecipeFormFields: React.FC<Props> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dropdown data
  const [recipeTypes, setRecipeTypes] = useState<RecipeTypeData[]>([]);
  const [items, setItems] = useState<ItemSendData[]>([]);
  const [itemDetails, setItemDetails] = useState<ItemDetailData[]>([]);
  const [existingRecipes, setExistingRecipes] = useState<any[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  
  // Form state
  const [selectedRecipeType, setSelectedRecipeType] = useState<string>("");
  const [selectedRecipeCode, setSelectedRecipeCode] = useState<string>("");
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([
    { id: Date.now().toString(), item_name: "", item_code: "", cat_name: "", cat_code: "", unit_short: "", req_qty: "" }
  ]);

  // Load dropdown data on mount
  useEffect(() => {
    const loadDropdownData = async () => {
      setLoadingDropdowns(true);
      try {
        const [recipeTypeRes, itemRes, itemDetailRes, existingRes] = await Promise.all([
          recipeTypeApi.getAll(),
          itemSendApi.getAll(),
          itemDetailsApi.getAll(),
          recipeApi.getAll(),
        ]);
        
        if (recipeTypeRes.status === "success" || recipeTypeRes.status === "ok") {
          setRecipeTypes(recipeTypeRes.data || []);
        }
        if (itemRes.status === "success" || itemRes.status === "ok") {
          setItems(itemRes.data || []);
        }
        if (itemDetailRes.status === "success" || itemDetailRes.status === "ok") {
          setItemDetails(itemDetailRes.data || []);
        }
        if (existingRes.status === "success" || existingRes.status === "ok") {
          setExistingRecipes(existingRes.data || []);
        }
      } catch (err) {
        console.error("Failed to load dropdown data:", err);
        setError("Failed to load form data. Please refresh the page.");
      } finally {
        setLoadingDropdowns(false);
      }
    };
    
    loadDropdownData();
  }, []);

  // Handle recipe type selection - auto-populate existing items
  const handleRecipeTypeChange = (value: string) => {
    setSelectedRecipeType(value);
    const selectedType = recipeTypes.find(rt => rt.recipe_type === value);
    setSelectedRecipeCode(selectedType?.recipe_code?.toString() || value);

    // Find existing items for this recipe type
    const existingForType = existingRecipes.filter(
      (r: any) => r.recipe_type === value
    );

    if (existingForType.length > 0) {
      const existingRows: RecipeItem[] = existingForType.map((r: any, idx: number) => ({
        id: `existing-${idx}-${Date.now()}`,
        item_name: r.item_name || "",
        item_code: r.item_code?.toString() || "",
        cat_name: r.cat_name || "",
        cat_code: r.cat_code?.toString() || "",
        unit_short: r.unit_short || "",
        req_qty: r.req_qty?.toString() || "",
        isExisting: true,
      }));
      // Add one empty row for new entries
      existingRows.push({
        id: Date.now().toString(),
        item_name: "", item_code: "", cat_name: "", cat_code: "", unit_short: "", req_qty: "",
      });
      setRecipeItems(existingRows);
    } else {
      setRecipeItems([
        { id: Date.now().toString(), item_name: "", item_code: "", cat_name: "", cat_code: "", unit_short: "", req_qty: "" }
      ]);
    }
  };

  // Handle item selection for a specific row
  const handleItemChange = useCallback((rowId: string, value: string) => {
    // Check if item already exists for this recipe type (in existing records or current rows)
    const alreadyInRows = recipeItems.some(
      (r) => r.id !== rowId && r.item_name === value
    );
    const alreadyInExisting = existingRecipes.some(
      (r: any) => r.recipe_type === selectedRecipeType && r.item_name === value
    );

    if (alreadyInRows || alreadyInExisting) {
      toast({
        title: "Duplicate Item",
        description: "This item already exists for the selected Recipe Type.",
        variant: "destructive",
      });
      return;
    }

    const selectedItem = items.find((item: ItemSendData) => item.item_name === value);
    const detail = itemDetails.find((d: ItemDetailData) => d.item_name === value);
    
    setRecipeItems((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              item_name: value,
              item_code: selectedItem?.item_code?.toString() || "",
              cat_name: detail?.cat_name || "",
              cat_code: detail?.cat_code?.toString() || "",
              unit_short: detail?.unit_short || "",
            }
          : row
      )
    );
  }, [items, itemDetails, recipeItems, existingRecipes, selectedRecipeType]);

  // Handle quantity change for a specific row
  const handleQtyChange = useCallback((rowId: string, value: string) => {
    setRecipeItems((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, req_qty: value } : row))
    );
  }, []);

  // Add new row
  const handleAddRow = () => {
    setRecipeItems((prev) => [
      ...prev,
      { id: Date.now().toString(), item_name: "", item_code: "", cat_name: "", cat_code: "", unit_short: "", req_qty: "" },
    ]);
  };

  // Remove row (only non-existing rows)
  const handleRemoveRow = (id: string) => {
    const row = recipeItems.find((r) => r.id === id);
    if (row?.isExisting) return;
    if (recipeItems.filter((r) => !r.isExisting).length > 1 || recipeItems.length > 1) {
      setRecipeItems((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // Submit only new recipe items (not existing ones)
  const handleSubmit = async () => {
    if (!selectedRecipeType) {
      setError("Please select a recipe type");
      return;
    }

    const newItems = recipeItems.filter((item) => !item.isExisting && item.item_name && item.req_qty);

    if (newItems.length === 0) {
      setError("Please add at least one new item with quantity");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      for (const item of newItems) {
        const payload = {
          recipe_type: selectedRecipeType,
          recipe_code: selectedRecipeCode || selectedRecipeType,
          item_name: item.item_name,
          item_code: item.item_code,
          cat_name: item.cat_name,
          cat_code: item.cat_code,
          unit_short: item.unit_short,
          req_qty: item.req_qty,
          created_by: user?.user_name || "",
        };
        
        const response = await recipeApi.create(payload);
        
        if (response.status !== "success" && response.status !== "ok") {
          throw new Error(response.message || "Failed to create recipe");
        }
      }
      
      toast({
        title: "Recipe saved successfully",
        description: `${newItems.length} item(s) added to the recipe.`,
      });
      
      setSelectedRecipeType("");
      setSelectedRecipeCode("");
      setRecipeItems([
        { id: Date.now().toString(), item_name: "", item_code: "", cat_name: "", cat_code: "", unit_short: "", req_qty: "" },
      ]);
      
      // Refresh existing recipes
      try {
        const res = await recipeApi.getAll();
        if (res.status === "success" || res.status === "ok") {
          setExistingRecipes(res.data || []);
        }
      } catch {}
      
      onSuccess?.();
    } catch (err: any) {
      console.error("Recipe submission error:", err);
      setError(err.message || "Unable to connect to server");
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

  const newItemCount = recipeItems.filter((item) => !item.isExisting && item.item_name && item.req_qty).length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}
      
      {/* Recipe Type Selection */}
      <div className="space-y-2">
        <Label>Recipe Type *</Label>
        <Select value={selectedRecipeType} onValueChange={handleRecipeTypeChange}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select recipe type" />
          </SelectTrigger>
          <SelectContent className="bg-background border z-50">
            {recipeTypes.map((rt) => (
              <SelectItem key={rt.recipe_type} value={rt.recipe_type}>
                {rt.recipe_type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Add Items to Recipe Section */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <h4 className="text-sm font-medium mb-4">Add Items to Recipe</h4>

        {/* Header Row */}
        <div className="hidden md:grid md:grid-cols-12 gap-2 mb-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-3">Item Name</div>
          <div className="col-span-2">Unit</div>
          <div className="col-span-3">Required Qty *</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-1">Action</div>
        </div>

        {/* Item Rows */}
        <div className="space-y-3">
          {recipeItems.map((row) => (
            <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
              {/* Item Name */}
              <div className="md:col-span-3">
                <Label className="md:hidden text-xs mb-1 block">Item Name</Label>
                <ItemSearchSelect
                  value={row.item_name}
                  onValueChange={(value) => handleItemChange(row.id, value)}
                  items={items.filter((item) => {
                    const usedNames = recipeItems.filter(r => r.id !== row.id).map(r => r.item_name);
                    return !usedNames.includes(item.item_name);
                  })}
                  disabled={row.isExisting}
                />
              </div>

              {/* Unit (Auto-filled) */}
              <div className="md:col-span-2">
                <Label className="md:hidden text-xs mb-1 block">Unit</Label>
                <Input
                  value={row.unit_short}
                  readOnly
                  disabled
                  placeholder="Auto"
                  className="h-9 bg-muted text-muted-foreground"
                />
              </div>

              {/* Required Quantity */}
              <div className="md:col-span-3">
                <Label className="md:hidden text-xs mb-1 block">Required Qty *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.req_qty}
                  onChange={(e) => handleQtyChange(row.id, e.target.value)}
                  onKeyDown={numericOnly}
                  placeholder="Enter qty"
                  className="h-9"
                  disabled={row.isExisting}
                />
              </div>

              {/* Status */}
              <div className="md:col-span-3">
                <Label className="md:hidden text-xs mb-1 block">Status</Label>
                {row.isExisting ? (
                  <span className="inline-flex items-center h-9 px-2 text-xs text-muted-foreground bg-muted rounded-md">
                    Existing
                  </span>
                ) : (
                  <span className="inline-flex items-center h-9 px-2 text-xs text-primary">
                    {row.item_name ? "New" : "—"}
                  </span>
                )}
              </div>

              {/* Add/Remove Buttons */}
              <div className="md:col-span-1 flex gap-1">
                {!row.isExisting && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddRow}
                      className="h-9 w-9"
                      title="Add row"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    {recipeItems.filter((r) => !r.isExisting).length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveRow(row.id)}
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        title="Remove row"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          type="button"
          onClick={handleSubmit}
          className="bg-gradient-warm hover:opacity-90 gap-2 w-full"
          disabled={isLoading || newItemCount === 0 || !selectedRecipeType}
        >
          <Plus className="w-4 h-4" />
          {isLoading ? "Saving..." : `Save Recipe (${newItemCount} new items)`}
        </Button>
      </div>
    </div>
  );
};

export default RecipeFormFields;
