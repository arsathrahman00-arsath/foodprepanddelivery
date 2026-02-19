import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, Package, Loader2, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { materialReceiptApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, numericOnly, toProperCase } from "@/lib/utils";

interface CategoryData {
  cat_name: string;
  cat_code: string;
}

interface ItemRow {
  item_name: string;
  unit_short: string;
  day_req_qty: string;
  received_qty: string;
}

const standardizeUnit = (unit: string): string => {
  if (!unit) return "";
  return unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();
};

const MaterialReceiptPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Form fields
  const today = new Date();
  const [receiptDate] = useState<Date>(today);
  const [purchaseReqDate, setPurchaseReqDate] = useState<Date | undefined>();
  const [purchaseType, setPurchaseType] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedCatCode, setSelectedCatCode] = useState<string>("");
  const [supplierName, setSupplierName] = useState<string>("");

  // Data
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);

  // Loading states
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingSupplier, setIsLoadingSupplier] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const response = await materialReceiptApi.getCategories();
        if (response.status === "success" && response.data) {
          setCategories(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Fetch supplier when category changes
  useEffect(() => {
    if (!selectedCatCode) {
      setSupplierName("");
      return;
    }
    const fetchSupplier = async () => {
      setIsLoadingSupplier(true);
      setSupplierName("");
      try {
        const response = await materialReceiptApi.getSuppliersByCategory(selectedCatCode);
        if (response.status === "success" && response.data) {
          const supName = typeof response.data === "string"
            ? response.data
            : response.data.sup_name || (Array.isArray(response.data) && response.data[0]?.sup_name) || "";
          setSupplierName(supName);
        }
      } catch (error) {
        console.error("Failed to fetch supplier:", error);
      } finally {
        setIsLoadingSupplier(false);
      }
    };
    fetchSupplier();
  }, [selectedCatCode]);

  // Fetch items when purchase req date + purchase type + category are all set
  useEffect(() => {
    if (!purchaseReqDate || !purchaseType || !selectedCategory) {
      setItems([]);
      return;
    }
    const fetchItems = async () => {
      setIsLoadingItems(true);
      try {
        const response = await materialReceiptApi.getItemsByDateAndCategory({
          day_req_date: format(purchaseReqDate, "yyyy-MM-dd"),
          purc_type: purchaseType,
          cat_name: selectedCategory,
        });
        if (response.status === "success" && response.data) {
          const rawItems = Array.isArray(response.data) ? response.data : [];
          setItems(rawItems.map((item: any) => ({
            item_name: item.item_name || "",
            unit_short: standardizeUnit(item.unit_short || ""),
            day_req_qty: String(item.day_req_qty || "0"),
            received_qty: "",
          })));
        }
      } catch (error) {
        console.error("Failed to fetch items:", error);
        setItems([]);
      } finally {
        setIsLoadingItems(false);
      }
    };
    fetchItems();
  }, [purchaseReqDate, purchaseType, selectedCategory]);

  const handleCategoryChange = (catName: string) => {
    setSelectedCategory(catName);
    const cat = categories.find(c => c.cat_name === catName);
    setSelectedCatCode(cat?.cat_code || "");
  };

  const updateReceivedQty = (index: number, value: string) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, received_qty: value } : item
    ));
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const validItems = items.filter(item => item.received_qty && parseFloat(item.received_qty) > 0);

  const handleSubmit = async () => {
    if (!purchaseReqDate) {
      toast({ title: "Validation Error", description: "Please select a Purchase Request Date", variant: "destructive" });
      return;
    }
    if (!purchaseType) {
      toast({ title: "Validation Error", description: "Please select a Purchase Type", variant: "destructive" });
      return;
    }
    if (!selectedCategory) {
      toast({ title: "Validation Error", description: "Please select a Category", variant: "destructive" });
      return;
    }
    if (validItems.length === 0) {
      toast({ title: "Validation Error", description: "Please fill in at least one item with received quantity", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const createdBy = user?.user_name || "system";
    const formattedReceiptDate = format(receiptDate, "yyyy-MM-dd");
    const formattedPurchaseReqDate = format(purchaseReqDate, "yyyy-MM-dd");

    try {
      await Promise.all(
        validItems.map(item =>
          materialReceiptApi.create({
            mat_rec_date: formattedReceiptDate,
            day_req_date: formattedPurchaseReqDate,
            sup_name: supplierName,
            cat_name: selectedCategory,
            item_name: item.item_name,
            unit_short: item.unit_short,
            mat_rec_qty: item.received_qty,
            created_by: createdBy,
          })
        )
      );

      toast({ title: "Success", description: `${validItems.length} material receipt(s) saved successfully` });
      // Reset form
      setPurchaseReqDate(undefined);
      setPurchaseType("");
      setSelectedCategory("");
      setSelectedCatCode("");
      setSupplierName("");
      setItems([]);
    } catch (error) {
      console.error("Failed to save material receipts:", error);
      toast({ title: "Error", description: "Failed to save material receipts", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Material Receipt</h1>
        <p className="text-muted-foreground">Record incoming materials from suppliers</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            New Material Receipt
          </CardTitle>
          <CardDescription>
            Select purchase request details and record received item quantities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Row 1: Receipt Date + Purchase Request Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Receipt Date - Current date only */}
            <div className="space-y-2">
              <Label>Receipt Date</Label>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal cursor-default"
                disabled
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(receiptDate, "PPP")}
              </Button>
            </div>

            {/* Purchase Request Date - unrestricted */}
            <div className="space-y-2">
              <Label>Purchase Request Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !purchaseReqDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {purchaseReqDate ? format(purchaseReqDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
                  <Calendar
                    mode="single"
                    selected={purchaseReqDate}
                    onSelect={setPurchaseReqDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Purchase Type Dropdown */}
            <div className="space-y-2">
              <Label>Purchase Type</Label>
              <Select value={purchaseType} onValueChange={setPurchaseType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Bulk">Bulk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Name Dropdown */}
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingCategories ? "Loading..." : "Select category"} />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  {categories.map((cat) => (
                    <SelectItem key={cat.cat_code} value={cat.cat_name}>{cat.cat_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Supplier Name - auto populated */}
          {selectedCategory && (
            <div className="space-y-2 max-w-sm">
              <Label>Supplier Name</Label>
              <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center">
                {isLoadingSupplier ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="font-medium">{supplierName || "No supplier found"}</span>
                )}
              </div>
            </div>
          )}

          {/* Items Table */}
          {isLoadingItems && (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Loading items...</p>
            </div>
          )}

          {!isLoadingItems && items.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-2">
                <h4 className="text-sm font-medium">Items in {selectedCategory}</h4>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Item Name</TableHead>
                    <TableHead className="w-32">Unit of Measure</TableHead>
                    <TableHead className="w-36">Allocated Qty</TableHead>
                    <TableHead className="w-40">Received Quantity</TableHead>
                    <TableHead className="w-20">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={`${item.item_name}-${index}`}>
                      <TableCell className="font-medium">{toProperCase(item.item_name)}</TableCell>
                      <TableCell>{toProperCase(item.unit_short)}</TableCell>
                      <TableCell>
                        <span className="font-medium text-primary">{item.day_req_qty || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Enter qty"
                          value={item.received_qty}
                          onChange={(e) => updateReceivedQty(index, e.target.value)}
                          onKeyDown={numericOnly}
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItemRow(index)}
                          disabled={items.length <= 1}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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

          {!isLoadingItems && purchaseReqDate && purchaseType && selectedCategory && items.length === 0 && (
            <div className="text-center py-4 text-muted-foreground border rounded-lg">
              No items found for the selected criteria
            </div>
          )}

          {/* Submit Section */}
          {validItems.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Total items with quantity: <span className="font-medium text-foreground">{validItems.length}</span>
              </p>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Receipt ({validItems.length} items)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MaterialReceiptPage;
