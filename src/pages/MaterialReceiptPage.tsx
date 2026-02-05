import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Package, Loader2, Plus, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface ItemOption {
  item_name: string;
  item_code?: number;
}

interface CategoryOption {
  cat_name: string;
}

interface ReceiptEntry {
  id: number;
  supplierName: string;
  categoryName: string;
  itemName: string;
  uom: string;
  receivedQty: string;
}

const MaterialReceiptPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Multi-entry support
  const [entries, setEntries] = useState<ReceiptEntry[]>([
    { id: 1, supplierName: "", categoryName: "", itemName: "", uom: "", receivedQty: "" }
  ]);

  // Fetch all dropdown data on mount
  useEffect(() => {
    const fetchDropdownData = async () => {
      // Fetch suppliers (returns array of strings)
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

      // Fetch categories (returns { categories: [...], units: [...] })
      setIsLoadingCategories(true);
      try {
        const response = await materialReceiptApi.getCategories();
        if (response.status === "success" && response.data?.categories) {
          setCategories(response.data.categories);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setIsLoadingCategories(false);
      }

      // Fetch items
      setIsLoadingItems(true);
      try {
        const response = await materialReceiptApi.getItems();
        if (response.status === "success" && response.data) {
          setItems(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch items:", error);
      } finally {
        setIsLoadingItems(false);
      }

      // Fetch units (returns array of strings)
      setIsLoadingUnits(true);
      try {
        const response = await materialReceiptApi.getUnits();
        if (response.status === "success" && response.data) {
          setUnits(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch units:", error);
      } finally {
        setIsLoadingUnits(false);
      }
    };

    fetchDropdownData();
  }, []);

  const updateEntry = (id: number, field: keyof ReceiptEntry, value: string) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const addEntry = () => {
    const newId = Math.max(...entries.map(e => e.id)) + 1;
    setEntries(prev => [...prev, { 
      id: newId, 
      supplierName: "", 
      categoryName: "", 
      itemName: "", 
      uom: "", 
      receivedQty: "" 
    }]);
  };

  const removeEntry = (id: number) => {
    if (entries.length > 1) {
      setEntries(prev => prev.filter(entry => entry.id !== id));
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate) {
      toast({
        title: "Validation Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    const validEntries = entries.filter(
      entry => entry.supplierName && entry.categoryName && entry.itemName && entry.uom && entry.receivedQty
    );

    if (validEntries.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in at least one complete entry",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const createdBy = user?.user_name || "system";
    const formattedDate = format(selectedDate, "yyyy-MM-dd");

    try {
      // Submit all valid entries
      await Promise.all(
        validEntries.map(entry =>
          materialReceiptApi.create({
            receipt_date: formattedDate,
            sup_name: entry.supplierName,
            cat_name: entry.categoryName,
            item_name: entry.itemName,
            unit_short: entry.uom,
            received_qty: entry.receivedQty,
            created_by: createdBy,
          })
        )
      );

      toast({
        title: "Success",
        description: `${validEntries.length} material receipt(s) saved successfully`,
      });

      // Reset form
      setSelectedDate(undefined);
      setEntries([{ id: 1, supplierName: "", categoryName: "", itemName: "", uom: "", receivedQty: "" }]);
    } catch (error) {
      console.error("Failed to save material receipts:", error);
      toast({
        title: "Error",
        description: "Failed to save material receipts",
        variant: "destructive",
      });
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
            Enter the details of received materials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Receipt Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full md:w-[280px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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

          {/* Entries */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Material Entries</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEntry}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </Button>
            </div>

            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className="p-4 border rounded-lg space-y-4 bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Entry #{index + 1}
                  </span>
                  {entries.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(entry.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Supplier Name */}
                  <div className="space-y-2">
                    <Label>Supplier Name</Label>
                    <Select
                      value={entry.supplierName}
                      onValueChange={(value) => updateEntry(entry.id, "supplierName", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingSuppliers ? "Loading..." : "Select supplier"} />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier} value={supplier}>
                            {supplier}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Name */}
                  <div className="space-y-2">
                    <Label>Category Name</Label>
                    <Select
                      value={entry.categoryName}
                      onValueChange={(value) => updateEntry(entry.id, "categoryName", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingCategories ? "Loading..." : "Select category"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.cat_name} value={category.cat_name}>
                            {category.cat_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Item Name */}
                  <div className="space-y-2">
                    <Label>Item Name</Label>
                    <Select
                      value={entry.itemName}
                      onValueChange={(value) => updateEntry(entry.id, "itemName", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingItems ? "Loading..." : "Select item"} />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.item_name} value={item.item_name}>
                            {item.item_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* UoM */}
                  <div className="space-y-2">
                    <Label>Unit of Measure</Label>
                    <Select
                      value={entry.uom}
                      onValueChange={(value) => updateEntry(entry.id, "uom", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingUnits ? "Loading..." : "Select UoM"} />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Received Quantity */}
                  <div className="space-y-2">
                    <Label>Received Quantity</Label>
                    <Input
                      type="number"
                      placeholder="Enter quantity"
                      value={entry.receivedQty}
                      onChange={(e) => updateEntry(entry.id, "receivedQty", e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedDate}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Receipt"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaterialReceiptPage;
