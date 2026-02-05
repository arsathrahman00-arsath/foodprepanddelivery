import React, { useState, useEffect, useCallback } from "react";
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
import { recipeApi, recipeTypeApi, itemSendApi, itemDetailsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface RecipeItem {
  id: string;
  item_name: string;
  item_code: string;
  cat_name: string;
  cat_code: string;
  unit_short: string;
  req_qty: string;
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
        const [recipeTypeRes, itemRes, itemDetailRes] = await Promise.all([
          recipeTypeApi.getAll(),
          itemSendApi.getAll(),
          itemDetailsApi.getAll(),
        ]);
        
        console.log("Recipe Types:", recipeTypeRes);
        console.log("Items:", itemRes);
        console.log("Item Details:", itemDetailRes);
        
        if (recipeTypeRes.status === "success" || recipeTypeRes.status === "ok") {
          setRecipeTypes(recipeTypeRes.data || []);
        }
        if (itemRes.status === "success" || itemRes.status === "ok") {
          setItems(itemRes.data || []);
        }
        if (itemDetailRes.status === "success" || itemDetailRes.status === "ok") {
          setItemDetails(itemDetailRes.data || []);
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

  // Handle recipe type selection
  const handleRecipeTypeChange = (value: string) => {
    setSelectedRecipeType(value);
    const selectedType = recipeTypes.find(rt => rt.recipe_type === value);
    setSelectedRecipeCode(selectedType?.recipe_code?.toString() || value);
  };

  // Handle item selection for a specific row
  const handleItemChange = useCallback((rowId: string, value: string) => {
    // Find item to get item_code
    const selectedItem = items.find((item: ItemSendData) => item.item_name === value);
    
    // Find matching item detail by item_name for category and unit
    const detail = itemDetails.find((d: ItemDetailData) => d.item_name === value);
    
    console.log("Selected item:", selectedItem);
    console.log("Matched detail:", detail);
    
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
  }, [items, itemDetails]);

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

  // Remove row
  const handleRemoveRow = (id: string) => {
    if (recipeItems.length > 1) {
      setRecipeItems((prev) => prev.filter((row) => row.id !== id));
    }
  };

  // Submit all recipe items
  const handleSubmit = async () => {
    if (!selectedRecipeType) {
      setError("Please select a recipe type");
      return;
    }

    // Filter valid items (those with item_name and qty)
    const validItems = recipeItems.filter((item) => item.item_name && item.req_qty);

    if (validItems.length === 0) {
      setError("Please add at least one item with quantity");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Submit each item as a separate record
      for (const item of validItems) {
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
        
        console.log("Submitting recipe item:", payload);
        
        const response = await recipeApi.create(payload);
        
        console.log("Recipe API response:", response);
        
        if (response.status !== "success" && response.status !== "ok") {
          throw new Error(response.message || "Failed to create recipe");
        }
      }
      
      toast({
        title: "Recipe saved successfully",
        description: `${validItems.length} item(s) added to the recipe.`,
      });
      
      // Reset form on success
      setSelectedRecipeType("");
      setSelectedRecipeCode("");
      setRecipeItems([
        { id: Date.now().toString(), item_name: "", item_code: "", cat_name: "", cat_code: "", unit_short: "", req_qty: "" },
      ]);
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

  const validItemCount = recipeItems.filter((item) => item.item_name && item.req_qty).length;

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
          <div className="col-span-3">Category Name</div>
          <div className="col-span-2">Unit</div>
          <div className="col-span-3">Required Qty *</div>
          <div className="col-span-1">Action</div>
        </div>

        {/* Item Rows */}
        <div className="space-y-3">
          {recipeItems.map((row) => (
            <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
              {/* Item Name Dropdown */}
              <div className="md:col-span-3">
                <Label className="md:hidden text-xs mb-1 block">Item Name</Label>
                <Select
                  value={row.item_name}
                  onValueChange={(value) => handleItemChange(row.id, value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50 max-h-60">
                    {items.map((item) => (
                      <SelectItem key={`${item.item_name}-${item.item_code}`} value={item.item_name}>
                        {item.item_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Name (Auto-filled) */}
              <div className="md:col-span-3">
                <Label className="md:hidden text-xs mb-1 block">Category Name</Label>
                <Input
                  value={row.cat_name}
                  readOnly
                  disabled
                  placeholder="Select item first"
                  className="h-9 bg-muted text-muted-foreground"
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
                  placeholder="Enter qty"
                  className="h-9"
                />
              </div>

              {/* Add/Remove Buttons */}
              <div className="md:col-span-1 flex gap-1">
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
                {recipeItems.length > 1 && (
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
          disabled={isLoading || validItemCount === 0 || !selectedRecipeType}
        >
          <Plus className="w-4 h-4" />
          {isLoading ? "Saving..." : `Save Recipe (${validItemCount} items)`}
        </Button>
      </div>
    </div>
  );
};

export default RecipeFormFields;