import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, ClipboardList, Download, Loader2, Plus, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { dayRequirementsApi } from "@/lib/api";
import { generateDayReqPdf } from "@/lib/generateDayReqPdf";

// Add the new API for fetching existing requirements
const requirementListApi = {
  getAll: async () => {
    const response = await fetch("https://ngrchatbot.whindia.in/fpda/get_requirement/");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },
};

interface ExistingRequirement {
  day_req_date: string;
  recipe_type: string;
  day_tot_req: string;
  created_by: string;
}

interface RecipeData {
  recipe_code: string;
  recipe_type: string;
}

interface DateResponseData {
  recipes: RecipeData[];
  req_qty: number[];
}

interface RecipeTypeDisplay {
  recipe_type: string;
  recipe_code: string;
  req_qty: number;
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
  
  // Existing requirements table state
  const [existingRequirements, setExistingRequirements] = useState<ExistingRequirement[]>([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Dialog state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedRecipeCode, setSelectedRecipeCode] = useState<string>("");
  const [recipeTypesData, setRecipeTypesData] = useState<RecipeTypeDisplay[]>([]);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [totalDailyRequirement, setTotalDailyRequirement] = useState<number>(0);
  const [recipeTotpkt, setRecipeTotpkt] = useState<number>(0);
  const [totalDailyRequirementKg, setTotalDailyRequirementKg] = useState<number>(0);
  const [totalDailyRequirementRound, setTotalDailyRequirementRound] = useState<number>(0);
  
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isLoadingTotpkt, setIsLoadingTotpkt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  const handleDownloadPdf = async (req: ExistingRequirement, index: number) => {
    setDownloadingIndex(index);
    try {
      await generateDayReqPdf(req);
      toast({ title: "Success", description: "PDF downloaded successfully" });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setDownloadingIndex(null);
    }
  };

  // Fetch existing requirements for table
  const fetchExistingRequirements = async () => {
    setIsLoadingExisting(true);
    try {
      const response = await requirementListApi.getAll();
      if (response.status === "success" && response.data) {
        setExistingRequirements(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch existing requirements:", error);
    } finally {
      setIsLoadingExisting(false);
    }
  };

  useEffect(() => { fetchExistingRequirements(); }, []);

  // Check if date already has requirements
  const isDateAlreadyUsed = (date: Date): boolean => {
    const formatted = format(date, "yyyy-MM-dd");
    return existingRequirements.some(r => r.day_req_date?.split("T")[0] === formatted);
  };

  // Reset dialog state
  const resetDialog = () => {
    setSelectedDate(undefined);
    setSelectedRecipeCode("");
    setRecipeTypesData([]);
    setRecipeItems([]);
    setSelectedItems(new Set());
    setTotalDailyRequirement(0);
    setRecipeTotpkt(0);
    setTotalDailyRequirementKg(0);
    setTotalDailyRequirementRound(0);
  };

  // Fetch recipe types and quantities when date changes
  useEffect(() => {
    if (!selectedDate) {
      setRecipeTypesData([]);
      setTotalDailyRequirement(0);
      setRecipeTotpkt(0);
      setTotalDailyRequirementKg(0);
      setTotalDailyRequirementRound(0);
      setSelectedRecipeCode("");
      return;
    }

    // Validate date doesn't already exist
    if (isDateAlreadyUsed(selectedDate)) {
      toast({
        title: "Duplicate Date",
        description: "Day requirements already exist for this date",
        variant: "destructive",
      });
      setSelectedDate(undefined);
      return;
    }

    const fetchDataByDate = async () => {
      setIsLoadingData(true);
      try {
        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        const response = await dayRequirementsApi.getByDate(formattedDate);
        
        if (response.status === "success" && response.data) {
          const data = response.data as DateResponseData;
          const recipes = data.recipes || [];
          const reqQtyArray = data.req_qty || [];
          
          const transformedData: RecipeTypeDisplay[] = recipes.map((recipe, index) => ({
            recipe_type: recipe.recipe_type.trim(),
            recipe_code: recipe.recipe_code,
            req_qty: Number(reqQtyArray[index]) || 0,
          }));
          
          setRecipeTypesData(transformedData);
          
          if (transformedData.length > 0) {
            setSelectedRecipeCode(transformedData[0].recipe_code);
          }
          
          const total = reqQtyArray.reduce((sum: number, qty: number) => sum + (Number(qty) || 0), 0);
          setTotalDailyRequirement(total);
        } else {
          setRecipeTypesData([]);
          setTotalDailyRequirement(0);
        }
      } catch (error) {
        console.error("Failed to fetch data by date:", error);
        setRecipeTypesData([]);
        setTotalDailyRequirement(0);
        toast({ title: "Error", description: "Failed to load data for the selected date", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDataByDate();
  }, [selectedDate, toast]);

  const selectedRecipe = recipeTypesData.find(r => r.recipe_code === selectedRecipeCode);

  // Fetch recipe_totpkt when recipe type changes
  useEffect(() => {
    if (!selectedRecipeCode || !selectedRecipe) {
      setRecipeTotpkt(0);
      setTotalDailyRequirementKg(0);
      setTotalDailyRequirementRound(0);
      return;
    }

    const fetchRecipeTotpkt = async () => {
      setIsLoadingTotpkt(true);
      try {
        const response = await dayRequirementsApi.getRecipeTotpkt(selectedRecipe.recipe_type);
        if (response.status === "success" && response.data) {
          const totpkt = Number(response.data.recipe_totpkt) || 0;
          setRecipeTotpkt(totpkt);
          const kgValue = totpkt > 0 ? totalDailyRequirement / totpkt : 0;
          setTotalDailyRequirementKg(kgValue);
          setTotalDailyRequirementRound(Math.ceil(kgValue));
        }
      } catch (error) {
        console.error("Failed to fetch recipe totpkt:", error);
        setRecipeTotpkt(0);
        setTotalDailyRequirementKg(0);
        setTotalDailyRequirementRound(0);
      } finally {
        setIsLoadingTotpkt(false);
      }
    };

    fetchRecipeTotpkt();
  }, [selectedRecipeCode, selectedRecipe, totalDailyRequirement]);

  // Fetch recipe items when recipe code changes
  useEffect(() => {
    if (!selectedRecipeCode || !selectedRecipe) {
      setRecipeItems([]);
      setSelectedItems(new Set());
      return;
    }

    const fetchRecipeItems = async () => {
      setIsLoadingItems(true);
      try {
        const response = await dayRequirementsApi.getRecipeItems(selectedRecipe.recipe_type);
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
  }, [selectedRecipeCode, selectedRecipe]);

  const toggleItemSelection = (itemName: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemName)) newSelection.delete(itemName);
    else newSelection.add(itemName);
    setSelectedItems(newSelection);
  };

  const toggleAllItems = () => {
    if (selectedItems.size === recipeItems.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(recipeItems.map(item => item.item_name)));
  };

  const getMultipliedQty = (reqQty: number) => (Number(reqQty) || 0) * totalDailyRequirementRound;

  const selectedItemsTotal = recipeItems
    .filter(item => selectedItems.has(item.item_name))
    .reduce((sum, item) => sum + getMultipliedQty(item.req_qty), 0);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedRecipeCode || !selectedRecipe || selectedItems.size === 0) {
      toast({ title: "Validation Error", description: "Please select a date, recipe type, and at least one item", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDate = format(selectedDate, "yyyy-MM-dd'T'00:00:00");
      const recipeCode = selectedRecipe.recipe_code;
      const recipeType = selectedRecipe.recipe_type;
      const createdBy = user?.user_name || "";

      await dayRequirementsApi.createHeader({
        day_req_date: formattedDate,
        recipe_type: recipeType,
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

      toast({ title: "Success", description: "Day requirements saved successfully" });
      setDialogOpen(false);
      resetDialog();
      fetchExistingRequirements();
    } catch (error) {
      console.error("Failed to save day requirements:", error);
      toast({ title: "Error", description: "Failed to save day requirements", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-warm border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-warm flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">Day Requirements</CardTitle>
                <CardDescription>Plan daily ingredient requirements based on recipes</CardDescription>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Day Requirement</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Day Requirement</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Selection Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[200]" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => isDateAlreadyUsed(date)}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Recipe Type</label>
                      <Select value={selectedRecipeCode} onValueChange={setSelectedRecipeCode} disabled={!selectedDate || isLoadingData}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={isLoadingData ? "Loading..." : "Select recipe type"} />
                        </SelectTrigger>
                        <SelectContent className="z-[200] bg-popover">
                          {recipeTypesData.map((recipe) => (
                            <SelectItem key={recipe.recipe_code} value={recipe.recipe_code}>{recipe.recipe_type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Total Daily Req (pck)</label>
                      <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center">
                        {isLoadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-semibold text-lg">{totalDailyRequirement}</span>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Total Daily Req (kg)</label>
                      <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center">
                        {isLoadingData || isLoadingTotpkt ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-semibold text-lg text-primary">{totalDailyRequirementKg.toFixed(2)}</span>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Total Daily Req (Round)</label>
                      <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center justify-between">
                        {isLoadingData || isLoadingTotpkt ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                          <>
                            <span className="font-semibold text-lg text-accent-foreground">{totalDailyRequirementRound}</span>
                            {selectedDate && <span className="text-xs text-muted-foreground">{format(selectedDate, "dd/MM/yyyy")}</span>}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recipe Types Table */}
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
                              key={`${recipe.recipe_code}-${index}`}
                              className={cn("cursor-pointer hover:bg-muted/50", selectedRecipeCode === recipe.recipe_code && "bg-primary/10")}
                              onClick={() => setSelectedRecipeCode(recipe.recipe_code)}
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
                              <Checkbox checked={selectedItems.size === recipeItems.length && recipeItems.length > 0} onCheckedChange={toggleAllItems} />
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
                            <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                          ) : (
                            recipeItems.map((item) => (
                              <TableRow key={item.item_name}>
                                <TableCell>
                                  <Checkbox checked={selectedItems.has(item.item_name)} onCheckedChange={() => toggleItemSelection(item.item_name)} />
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
                      <Button onClick={handleSubmit} disabled={isSubmitting || selectedItems.size === 0 || !selectedDate || !selectedRecipeCode} className="gap-2">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Requirements
                      </Button>
                    </div>
                  )}

                  {!isLoadingData && selectedDate && recipeTypesData.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">No recipe data found for the selected date</div>
                  )}

                  {!isLoadingItems && recipeItems.length === 0 && selectedRecipeCode && (
                    <div className="text-center py-8 text-muted-foreground">No items found for the selected recipe type</div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Existing Requirements Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Recipe Type</TableHead>
                  <TableHead className="text-right">Total Daily Req</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingExisting ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : existingRequirements.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No day requirements found</TableCell></TableRow>
                ) : (
                  existingRequirements.map((req, index) => (
                    <TableRow key={index}>
                      <TableCell>{req.day_req_date}</TableCell>
                      <TableCell className="font-medium">{req.recipe_type}</TableCell>
                      <TableCell className="text-right">{req.day_tot_req}</TableCell>
                      <TableCell>{req.created_by}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownloadPdf(req, index)}
                          disabled={downloadingIndex === index}
                        >
                          {downloadingIndex === index ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DayRequirementsPage;
