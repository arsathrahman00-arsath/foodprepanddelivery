import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, ClipboardList, Loader2, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { dayRequirementsApi } from "@/lib/api";

interface RecipeTypeData {
  recipe_type: string;
  recipe_code?: number;
  req_qty?: number;
}

interface RecipeItem {
  item_name: string;
  cat_name: string;
  unit_short: string;
  req_qty: number;
}

const DayRequirementsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedRecipeType, setSelectedRecipeType] = useState<string>("");
  const [recipeTypesData, setRecipeTypesData] = useState<RecipeTypeData[]>([]);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [totalDailyRequirement, setTotalDailyRequirement] = useState<number>(0);
  const [totalDailyRequirementKg, setTotalDailyRequirementKg] = useState<number>(0);
  
  // Loading states
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch recipe types and quantities when date changes
  useEffect(() => {
    if (!selectedDate) {
      setRecipeTypesData([]);
      setTotalDailyRequirement(0);
      setTotalDailyRequirementKg(0);
      setSelectedRecipeType("");
      return;
    }

    const fetchDataByDate = async () => {
      setIsLoadingData(true);
      try {
        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        const response = await dayRequirementsApi.getByDate(formattedDate);
        
        if (response.status === "success" && response.data) {
          setRecipeTypesData(response.data);
          
          // Calculate total daily requirement as sum of all req_qty
          const total = response.data.reduce(
            (sum: number, item: RecipeTypeData) => sum + (Number(item.req_qty) || 0),
            0
          );
          setTotalDailyRequirement(total);
          
          // Calculate kg value (sum / 6)
          setTotalDailyRequirementKg(total > 0 ? total / 6 : 0);
        } else {
          setRecipeTypesData([]);
          setTotalDailyRequirement(0);
          setTotalDailyRequirementKg(0);
        }
      } catch (error) {
        console.error("Failed to fetch data by date:", error);
        setRecipeTypesData([]);
        setTotalDailyRequirement(0);
        setTotalDailyRequirementKg(0);
        toast({
          title: "Error",
          description: "Failed to load data for the selected date",
          variant: "destructive",
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDataByDate();
  }, [selectedDate, toast]);

  // Fetch recipe items when recipe type changes
  useEffect(() => {
    if (!selectedRecipeType) {
      setRecipeItems([]);
      setSelectedItems(new Set());
      return;
    }

    const fetchRecipeItems = async () => {
      setIsLoadingItems(true);
      try {
        const response = await dayRequirementsApi.getRecipeItems(selectedRecipeType);
        
        if (response.status === "success" && response.data) {
          setRecipeItems(response.data);
          setSelectedItems(new Set(response.data.map((item: RecipeItem) => item.item_name)));
        }
      } catch (error) {
        console.error("Failed to fetch recipe items:", error);
        setRecipeItems([]);
      } finally {
        setIsLoadingItems(false);
      }
    };

    fetchRecipeItems();
  }, [selectedRecipeType]);

  const toggleItemSelection = (itemName: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemName)) {
      newSelection.delete(itemName);
    } else {
      newSelection.add(itemName);
    }
    setSelectedItems(newSelection);
  };

  const toggleAllItems = () => {
    if (selectedItems.size === recipeItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(recipeItems.map(item => item.item_name)));
    }
  };

  // Calculate multiplied quantity for an item
  const getMultipliedQty = (reqQty: number) => {
    return (Number(reqQty) || 0) * totalDailyRequirement;
  };

  const selectedItemsTotal = recipeItems
    .filter(item => selectedItems.has(item.item_name))
    .reduce((sum, item) => sum + getMultipliedQty(item.req_qty), 0);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedRecipeType || selectedItems.size === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a date, recipe type, and at least one item",
        variant: "destructive",
      });
      return;
    }

    const selectedRecipe = recipeTypesData.find(r => r.recipe_type === selectedRecipeType);
    if (!selectedRecipe) return;

    setIsSubmitting(true);
    try {
      const formattedDate = format(selectedDate, "yyyy-MM-dd'T'00:00:00");
      const recipeCode = String(selectedRecipe.recipe_code || "");
      const createdBy = user?.user_name || "";

      await dayRequirementsApi.createHeader({
        day_req_date: formattedDate,
        recipe_type: selectedRecipeType,
        recipe_code: recipeCode,
        day_tot_req: String(totalDailyRequirement),
        created_by: createdBy,
      });

      const selectedItemsList = recipeItems.filter(item => selectedItems.has(item.item_name));
      
      await Promise.all(
        selectedItemsList.map(item =>
          dayRequirementsApi.createTransaction({
            day_req_date: formattedDate,
            recipe_code: recipeCode,
            item_name: item.item_name,
            cat_name: item.cat_name,
            unit_short: item.unit_short,
            day_req_qty: String(getMultipliedQty(item.req_qty)),
            created_by: createdBy,
          })
        )
      );

      toast({
        title: "Success",
        description: "Day requirements saved successfully",
      });

      setSelectedDate(undefined);
      setSelectedRecipeType("");
      setRecipeItems([]);
      setSelectedItems(new Set());
      setTotalDailyRequirement(0);
      setTotalDailyRequirementKg(0);
      setRecipeTypesData([]);
    } catch (error) {
      console.error("Failed to save day requirements:", error);
      toast({
        title: "Error",
        description: "Failed to save day requirements",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <CardDescription>Plan daily ingredient requirements based on recipes</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selection Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Recipe Type Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipe Type</label>
              <Select value={selectedRecipeType} onValueChange={setSelectedRecipeType} disabled={!selectedDate || isLoadingData}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingData ? "Loading..." : "Select recipe type"} />
                </SelectTrigger>
                <SelectContent>
                  {recipeTypesData.map((recipe, index) => (
                    <SelectItem key={`${recipe.recipe_type}-${index}`} value={recipe.recipe_type}>
                      {recipe.recipe_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total Daily Requirement Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Daily Requirement</label>
              <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center">
                {isLoadingData ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="font-semibold text-lg">{totalDailyRequirement}</span>
                )}
              </div>
            </div>

            {/* Total Daily Requirement (kg) Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Daily Req (kg)</label>
              <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center justify-between">
                {isLoadingData ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className="font-semibold text-lg text-primary">
                      {totalDailyRequirementKg.toFixed(2)}
                    </span>
                    {selectedDate && (
                      <span className="text-xs text-muted-foreground">
                        {format(selectedDate, "dd/MM/yyyy")}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Recipe Types Table when date is selected */}
          {selectedDate && recipeTypesData.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-2">
                <h4 className="text-sm font-medium">Recipe Types for {format(selectedDate, "PPP")}</h4>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Recipe Type</TableHead>
                    <TableHead className="text-right">Req Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipeTypesData.map((recipe, index) => (
                    <TableRow 
                      key={`${recipe.recipe_type}-${index}`}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        selectedRecipeType === recipe.recipe_type && "bg-primary/10"
                      )}
                      onClick={() => setSelectedRecipeType(recipe.recipe_type)}
                    >
                      <TableCell className="font-medium">{recipe.recipe_type}</TableCell>
                      <TableCell className="text-right">{recipe.req_qty || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Items Table */}
          {recipeItems.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.size === recipeItems.length && recipeItems.length > 0}
                        onCheckedChange={toggleAllItems}
                      />
                    </TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Req Qty</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingItems ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    recipeItems.map((item) => (
                      <TableRow key={item.item_name}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.item_name)}
                            onCheckedChange={() => toggleItemSelection(item.item_name)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>{item.cat_name}</TableCell>
                        <TableCell>{item.unit_short}</TableCell>
                        <TableCell className="text-right">{item.req_qty}</TableCell>
                        <TableCell className="text-right font-semibold">{getMultipliedQty(item.req_qty)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary and Submit */}
          {recipeItems.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Selected Items: <span className="font-medium text-foreground">{selectedItems.size}</span> of {recipeItems.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  Selected Quantity Total: <span className="font-semibold text-lg text-foreground">{selectedItemsTotal}</span>
                  {" / "}
                  <span className="font-semibold text-lg text-primary">{totalDailyRequirement}</span>
                </p>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedItems.size === 0 || !selectedDate || !selectedRecipeType}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Requirements
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingData && selectedDate && recipeTypesData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No recipe data found for the selected date
            </div>
          )}

          {!isLoadingItems && recipeItems.length === 0 && selectedRecipeType && (
            <div className="text-center py-8 text-muted-foreground">
              No items found for the selected recipe type
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DayRequirementsPage;
