import React, { useState, useEffect } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { recipeApi, recipeTypeApi, itemApi } from "@/lib/api";

interface RecipeItem {
  id: string;
  item_name: string;
  item_code: string;
  cat_name: string;
  unit_short: string;
  req_qty: string;
}

interface ItemData {
  item_name: string;
  item_code: string;
  cat_name: string;
  unit_short: string;
}

interface RecipeTypeData {
  recipe_type: string;
  recipe_code: string;
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
  const [items, setItems] = useState<ItemData[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  
  // Form state
  const [selectedRecipeType, setSelectedRecipeType] = useState<string>("");
  const [selectedRecipeCode, setSelectedRecipeCode] = useState<string>("");
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  
  // Current row being added
  const [currentItem, setCurrentItem] = useState<string>("");
  const [currentItemData, setCurrentItemData] = useState<ItemData | null>(null);
  const [currentQty, setCurrentQty] = useState<string>("");

  // Load dropdown data on mount
  useEffect(() => {
    const loadDropdownData = async () => {
      setLoadingDropdowns(true);
      try {
        const [recipeTypeRes, itemRes] = await Promise.all([
          recipeTypeApi.getAll(),
          itemApi.getAll(),
        ]);
        
        if (recipeTypeRes.status === "success" || recipeTypeRes.status === "ok") {
          setRecipeTypes(recipeTypeRes.data || []);
        }
        if (itemRes.status === "success" || itemRes.status === "ok") {
          setItems(itemRes.data || []);
        }
      } catch (err) {
        console.error("Failed to load dropdown data:", err);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    
    loadDropdownData();
  }, []);

  // Handle recipe type selection
  const handleRecipeTypeChange = (value: string) => {
    const selected = recipeTypes.find((rt) => rt.recipe_type === value);
    setSelectedRecipeType(value);
    setSelectedRecipeCode(selected?.recipe_code || "");
  };

  // Handle item selection - auto-populate category and unit
  const handleItemChange = (value: string) => {
    const selected = items.find((item) => item.item_name === value);
    setCurrentItem(value);
    setCurrentItemData(selected || null);
  };

  // Add item to recipe
  const handleAddItem = () => {
    if (!currentItem || !currentItemData || !currentQty) {
      setError("Please select an item and enter quantity");
      return;
    }
    
    // Check for duplicate item
    if (recipeItems.some((ri) => ri.item_name === currentItem)) {
      setError("This item is already added to the recipe");
      return;
    }
    
    const newItem: RecipeItem = {
      id: Date.now().toString(),
      item_name: currentItem,
      item_code: currentItemData.item_code,
      cat_name: currentItemData.cat_name,
      unit_short: currentItemData.unit_short,
      req_qty: currentQty,
    };
    
    setRecipeItems([...recipeItems, newItem]);
    setCurrentItem("");
    setCurrentItemData(null);
    setCurrentQty("");
    setError(null);
  };

  // Remove item from recipe
  const handleRemoveItem = (id: string) => {
    setRecipeItems(recipeItems.filter((item) => item.id !== id));
  };

  // Submit all recipe items
  const handleSubmit = async () => {
    if (!selectedRecipeType || !selectedRecipeCode) {
      setError("Please select a recipe type");
      return;
    }
    
    if (recipeItems.length === 0) {
      setError("Please add at least one item to the recipe");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Submit each item as a separate record
      for (const item of recipeItems) {
        const response = await recipeApi.create({
          recipe_type: selectedRecipeType,
          recipe_code: selectedRecipeCode,
          item_name: item.item_name,
          item_code: item.item_code,
          cat_name: item.cat_name,
          unit_short: item.unit_short,
          req_qty: item.req_qty,
          created_by: user?.user_name || "",
        });
        
        if (response.status !== "success" && response.status !== "ok") {
          throw new Error(response.message || "Failed to create recipe");
        }
      }
      
      // Reset form on success
      setSelectedRecipeType("");
      setSelectedRecipeCode("");
      setRecipeItems([]);
      onSuccess?.();
    } catch (err: any) {
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

      {/* Add Item Section */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <h4 className="text-sm font-medium mb-4">Add Items to Recipe</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Item Selection */}
          <div className="space-y-2">
            <Label>Item Name *</Label>
            <Select value={currentItem} onValueChange={handleItemChange}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50 max-h-60">
                {items.map((item) => (
                  <SelectItem key={item.item_name} value={item.item_name}>
                    {item.item_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-populated Category */}
          <div className="space-y-2">
            <Label>Category Name</Label>
            <Input
              value={currentItemData?.cat_name || ""}
              readOnly
              disabled
              placeholder="Auto-populated"
              className="h-10 bg-muted"
            />
          </div>

          {/* Auto-populated Unit */}
          <div className="space-y-2">
            <Label>Unit</Label>
            <Input
              value={currentItemData?.unit_short || ""}
              readOnly
              disabled
              placeholder="Auto-populated"
              className="h-10 bg-muted"
            />
          </div>

          {/* Required Quantity */}
          <div className="space-y-2">
            <Label>Required Quantity *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={currentQty}
              onChange={(e) => setCurrentQty(e.target.value)}
              placeholder="Enter quantity"
              className="h-10"
            />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleAddItem}
          className="mt-4 gap-2"
          disabled={!currentItem || !currentQty}
        >
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {/* Items Table */}
      {recipeItems.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="w-12">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipeItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell>{item.cat_name}</TableCell>
                  <TableCell>{item.unit_short}</TableCell>
                  <TableCell>{item.req_qty}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(item.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          type="button"
          onClick={handleSubmit}
          className="bg-gradient-warm hover:opacity-90 gap-2 w-full"
          disabled={isLoading || recipeItems.length === 0 || !selectedRecipeType}
        >
          <Plus className="w-4 h-4" />
          {isLoading ? "Saving..." : `Save Recipe (${recipeItems.length} items)`}
        </Button>
      </div>
    </div>
  );
};

export default RecipeFormFields;
