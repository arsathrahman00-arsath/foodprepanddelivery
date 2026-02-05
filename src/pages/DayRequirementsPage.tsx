import React, { useState, useEffect } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { recipeTypeListApi, dayRequirementsApi } from "@/lib/api";

interface RecipeType {
  recipe_type: string;
  recipe_code: number;
}

interface RecipeItem {
  item_name: string;
  cat_name: string;
  unit_short: string;
  req_qty: number;
}

const DayRequirementsPage: React.FC = () => {
  const { toast } = useToast();
  
  // State
  const [selectedRecipeType, setSelectedRecipeType] = useState<string>("");
  const [recipeTypes, setRecipeTypes] = useState<RecipeType[]>([]);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  
  // Loading states
  const [isLoadingRecipeTypes, setIsLoadingRecipeTypes] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Fetch recipe types on mount
  useEffect(() => {
    const fetchRecipeTypes = async () => {
      setIsLoadingRecipeTypes(true);
      try {
        const response = await recipeTypeListApi.getAll();
        if (response.status === "success" && response.data) {
          setRecipeTypes(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch recipe types:", error);
        toast({
          title: "Error",
          description: "Failed to load recipe types",
          variant: "destructive",
        });
      } finally {
        setIsLoadingRecipeTypes(false);
      }
    };
    fetchRecipeTypes();
  }, [toast]);

  // Fetch recipe items when recipe type changes
  useEffect(() => {
    if (!selectedRecipeType) {
      setRecipeItems([]);
      return;
    }

    const fetchRecipeItems = async () => {
      setIsLoadingItems(true);
      try {
        const selectedRecipe = recipeTypes.find(r => r.recipe_type === selectedRecipeType);
        if (!selectedRecipe) return;

        const response = await dayRequirementsApi.getRecipeItems(String(selectedRecipe.recipe_code));
        
        if (response.status === "success" && response.data) {
          setRecipeItems(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch recipe items:", error);
        setRecipeItems([]);
      } finally {
        setIsLoadingItems(false);
      }
    };

    fetchRecipeItems();
  }, [selectedRecipeType, recipeTypes]);

  // Calculate total quantity
  const totalQuantity = recipeItems.reduce((sum, item) => sum + (Number(item.req_qty) || 0), 0);

  return (
    <div className="space-y-6">
      <Card className="shadow-warm border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-warm flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Day Requirements</CardTitle>
              <CardDescription>View ingredient requirements by recipe type</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recipe Type Selection */}
          <div className="max-w-md">
            <label className="text-sm font-medium mb-2 block">Recipe Type</label>
            <Select value={selectedRecipeType} onValueChange={setSelectedRecipeType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isLoadingRecipeTypes ? "Loading..." : "Select recipe type"} />
              </SelectTrigger>
              <SelectContent>
                {recipeTypes.map((recipe) => (
                  <SelectItem key={recipe.recipe_code} value={recipe.recipe_type}>
                    {recipe.recipe_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingItems ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    recipeItems.map((item) => (
                      <TableRow key={item.item_name}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>{item.cat_name}</TableCell>
                        <TableCell>{item.unit_short}</TableCell>
                        <TableCell className="text-right">{item.req_qty}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {/* Total Row */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t">
                <span className="text-sm font-medium">Total Items: {recipeItems.length}</span>
                <span className="text-sm font-semibold">Total Quantity: {totalQuantity}</span>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingItems && recipeItems.length === 0 && selectedRecipeType && (
            <div className="text-center py-8 text-muted-foreground">
              No items found for the selected recipe type
            </div>
          )}

          {/* Initial State */}
          {!selectedRecipeType && (
            <div className="text-center py-8 text-muted-foreground">
              Select a recipe type to view items
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DayRequirementsPage;
