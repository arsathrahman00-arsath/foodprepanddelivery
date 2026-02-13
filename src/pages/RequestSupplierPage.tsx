import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, ClipboardList, Download, Loader2, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn, toProperCase } from "@/lib/utils";
import { dayRequirementsApi, materialReceiptApi, itemCategoryApi, supplierRequisitionApi } from "@/lib/api";
import { generateSupplierReqPdf } from "@/lib/generateSupplierReqPdf";

interface RecipeData {
  recipe_code: string;
  recipe_type: string;
}

interface SupplierItem {
  item_name: string;
  cat_name: string;
  unit_short: string;
  day_req_qty: string | number;
}

interface CategoryData {
  cat_name: string;
  cat_code: string;
}

const RequestSupplierPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [recipeTypes, setRecipeTypes] = useState<RecipeData[]>([]);
  const [selectedRecipeCode, setSelectedRecipeCode] = useState("");
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [selectedCatCode, setSelectedCatCode] = useState("");

  // Data state
  const [items, setItems] = useState<SupplierItem[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch suppliers and categories on mount
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [supRes, catRes] = await Promise.all([
          materialReceiptApi.getSuppliers(),
          itemCategoryApi.getAll(),
        ]);
        if (supRes.status === "success" && supRes.data) {
          setSuppliers(
            Array.isArray(supRes.data) ? supRes.data.map((s: any) => s.sup_name || s) : []
          );
        }
        if (catRes.status === "success" && catRes.data) {
          setCategories(Array.isArray(catRes.data) ? catRes.data : []);
        }
      } catch (error) {
        console.error("Failed to fetch dropdowns:", error);
      }
    };
    fetchDropdowns();
  }, []);

  // Fetch recipe types when date changes
  useEffect(() => {
    if (!selectedDate) {
      setRecipeTypes([]);
      setSelectedRecipeCode("");
      return;
    }
    const fetchRecipes = async () => {
      setIsLoadingRecipes(true);
      try {
        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        const response = await dayRequirementsApi.getByDate(formattedDate);
        if (response.status === "success" && response.data) {
          const recipes = response.data.recipes || [];
          setRecipeTypes(recipes);
          if (recipes.length > 0) {
            setSelectedRecipeCode(recipes[0].recipe_code);
          } else {
            setSelectedRecipeCode("");
          }
        } else {
          setRecipeTypes([]);
          setSelectedRecipeCode("");
        }
      } catch (error) {
        console.error("Failed to fetch recipes:", error);
        setRecipeTypes([]);
        setSelectedRecipeCode("");
      } finally {
        setIsLoadingRecipes(false);
      }
    };
    fetchRecipes();
  }, [selectedDate]);

  // Clear items when filters change
  useEffect(() => {
    setItems([]);
  }, [selectedDate, selectedRecipeCode, selectedSupplier, selectedCatCode]);

  const selectedCategory = categories.find((c) => c.cat_code === selectedCatCode);
  const selectedRecipe = recipeTypes.find((r) => r.recipe_code === selectedRecipeCode);

  const canFetch = selectedDate && selectedRecipeCode && selectedSupplier && selectedCatCode;

  const handleFetchItems = async () => {
    if (!selectedDate || !selectedRecipeCode || !selectedCatCode) return;

    setIsLoadingItems(true);
    try {
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      const response = await supplierRequisitionApi.getItems({
        cat_code: selectedCatCode,
        day_req_date: formattedDate,
        recipe_code: selectedRecipeCode,
      });

      if (response.status === "success" && response.data) {
        setItems(Array.isArray(response.data) ? response.data : []);
      } else {
        setItems([]);
        toast({
          title: "No Data",
          description: response.message || "No items found for the selected filters",
        });
      }
    } catch (error) {
      console.error("Failed to fetch supplier items:", error);
      toast({ title: "Error", description: "Failed to fetch items", variant: "destructive" });
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedDate || !selectedRecipe || !selectedCategory || items.length === 0) return;
    setIsDownloading(true);
    try {
      generateSupplierReqPdf({
        date: format(selectedDate, "yyyy-MM-dd"),
        recipeType: selectedRecipe.recipe_type,
        supplierName: selectedSupplier,
        categoryName: selectedCategory.cat_name,
        items,
      });
      toast({ title: "Success", description: "PDF downloaded successfully" });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setIsDownloading(false);
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
              <CardTitle className="text-xl">Request For Supplier</CardTitle>
              <CardDescription>Generate supplier requisition requests based on daily requirements</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
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
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Recipe Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipe Type</label>
              <Select value={selectedRecipeCode} onValueChange={setSelectedRecipeCode} disabled={!selectedDate || isLoadingRecipes}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingRecipes ? "Loading..." : "Select recipe type"} />
                </SelectTrigger>
                <SelectContent className="z-[200] bg-popover">
                  {recipeTypes.map((r) => (
                    <SelectItem key={r.recipe_code} value={r.recipe_code}>
                      {r.recipe_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier</label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent className="z-[200] bg-popover">
                  {suppliers.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={selectedCatCode} onValueChange={setSelectedCatCode}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="z-[200] bg-popover">
                  {categories.map((c) => (
                    <SelectItem key={c.cat_code} value={c.cat_code}>{c.cat_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <Button onClick={handleFetchItems} disabled={!canFetch || isLoadingItems} className="gap-2">
              {isLoadingItems ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Get Items
            </Button>
            {items.length > 0 && (
              <Button onClick={handleDownloadPdf} variant="outline" disabled={isDownloading} className="gap-2">
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download PDF
              </Button>
            )}
          </div>

          {/* Items Table */}
          {isLoadingItems ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading items...</span>
            </div>
          ) : items.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Required Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}</TableCell>
                      <TableCell>{toProperCase(item.item_name)}</TableCell>
                      <TableCell>{toProperCase(item.cat_name)}</TableCell>
                      <TableCell>{item.unit_short}</TableCell>
                      <TableCell className="text-right font-semibold">{item.day_req_qty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Select all filters and click "Get Items" to view supplier requisition data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestSupplierPage;
