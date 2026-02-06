import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, Package, Loader2, Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { materialReceiptApi, itemDetailsApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ItemData {
  item_name: string;
  cat_name: string;
  unit_short: string;
}

interface ItemRow {
  id: string;
  item_name: string;
  unit_short: string;
  received_qty: string;
}

// Standardize unit display
const standardizeUnit = (unit: string): string => {
  if (!unit) return "";
  return unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();
};

const MaterialReceiptPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [allItems, setAllItems] = useState<ItemData[]>([]);
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);
  
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract unique categories from items
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(allItems.map(item => item.cat_name))];
    return uniqueCategories.sort();
  }, [allItems]);

  // Fetch dropdown data on mount
  useEffect(() => {
    const fetchDropdownData = async () => {
      setIsLoadingSuppliers(true);
      try {
        const response = await materialReceiptApi.getSuppliers();
        if (response.status === "success" && response.data) {
          setSuppliers(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch suppliers:", error);
      } finally {
        setIsLoadingSuppliers(false);
      }

      setIsLoadingItems(true);
      try {
        const response = await itemDetailsApi.getAll();
        if (response.status === "success" && response.data) {
          setAllItems(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch items:", error);
      } finally {
        setIsLoadingItems(false);
      }
    };

    fetchDropdownData();
  }, []);

  // When category changes, populate all items from that category
  useEffect(() => {
    if (!selectedCategory) {
      setItemRows([]);
      return;
    }

    const categoryItems = allItems.filter(item => item.cat_name === selectedCategory);
    const rows: ItemRow[] = categoryItems.map((item, index) => ({
      id: `${item.item_name}-${index}`,
      item_name: item.item_name,
      unit_short: standardizeUnit(item.unit_short),
      received_qty: "",
    }));
    setItemRows(rows);
  }, [selectedCategory, allItems]);

  // Update received quantity for a row
  const updateReceivedQty = (id: string, value: string) => {
    setItemRows(prev => prev.map(row => 
      row.id === id ? { ...row, received_qty: value } : row
    ));
  };

  // Remove a row
  const removeRow = (id: string) => {
    if (itemRows.length > 1) {
      setItemRows(prev => prev.filter(row => row.id !== id));
    }
  };

  // Add back a removed item
  const addRow = () => {
    const categoryItems = allItems.filter(item => item.cat_name === selectedCategory);
    const existingItems = new Set(itemRows.map(r => r.item_name));
    const availableItems = categoryItems.filter(item => !existingItems.has(item.item_name));
    
    if (availableItems.length > 0) {
      const newItem = availableItems[0];
      setItemRows(prev => [...prev, {
        id: `${newItem.item_name}-${Date.now()}`,
        item_name: newItem.item_name,
        unit_short: standardizeUnit(newItem.unit_short),
        received_qty: "",
      }]);
    } else {
      toast({
        title: "Info",
        description: "All items from this category are already added",
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate) {
      toast({ title: "Validation Error", description: "Please select a date", variant: "destructive" });
      return;
    }
    if (!selectedSupplier) {
      toast({ title: "Validation Error", description: "Please select a supplier", variant: "destructive" });
      return;
    }
    if (!selectedCategory) {
      toast({ title: "Validation Error", description: "Please select a category", variant: "destructive" });
      return;
    }

    const validRows = itemRows.filter(row => row.received_qty && parseFloat(row.received_qty) > 0);
    
    if (validRows.length === 0) {
      toast({ title: "Validation Error", description: "Please enter quantity for at least one item", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const createdBy = user?.user_name || "system";
    const formattedDate = format(selectedDate, "yyyy-MM-dd");

    try {
      await Promise.all(
        validRows.map(row =>
          materialReceiptApi.create({
            mat_rec_date: formattedDate,
            sup_name: selectedSupplier,
            cat_name: selectedCategory,
            item_name: row.item_name,
            unit_short: row.unit_short,
            mat_rec_qty: row.received_qty,
            created_by: createdBy,
          })
        )
      );

      toast({
        title: "Success",
        description: `${validRows.length} material receipt(s) saved successfully`,
      });

      setSelectedDate(undefined);
      setSelectedSupplier("");
      setSelectedCategory("");
      setItemRows([]);
    } catch (error) {
      console.error("Failed to save material receipts:", error);
      toast({ title: "Error", description: "Failed to save material receipts", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validItemCount = itemRows.filter(row => row.received_qty && parseFloat(row.received_qty) > 0).length;

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
            Select supplier and category to view and record item quantities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Receipt Date */}
          <div className="space-y-2 max-w-xs">
            <Label>Receipt Date</Label>
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
                  {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Supplier and Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier Selection */}
            <div className="space-y-2">
              <Label>Supplier Name</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingSuppliers ? "Loading..." : "Select supplier"} />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingItems ? "Loading..." : "Select category"} />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items Table */}
          {selectedCategory && itemRows.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
                <h4 className="text-sm font-medium">Items in {selectedCategory}</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Item Name</TableHead>
                    <TableHead className="w-32">Unit of Measure</TableHead>
                    <TableHead className="w-40">Received Quantity</TableHead>
                    <TableHead className="w-20">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.item_name}</TableCell>
                      <TableCell>{row.unit_short}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Enter qty"
                          value={row.received_qty}
                          onChange={(e) => updateReceivedQty(row.id, e.target.value)}
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.id)}
                          disabled={itemRows.length <= 1}
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

          {/* Empty State */}
          {selectedCategory && itemRows.length === 0 && !isLoadingItems && (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              No items found for the selected category
            </div>
          )}

          {/* Submit Section */}
          {itemRows.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Items with quantity: <span className="font-medium text-foreground">{validItemCount}</span> of {itemRows.length}
              </p>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || validItemCount === 0}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Receipt ({validItemCount} items)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MaterialReceiptPage;
