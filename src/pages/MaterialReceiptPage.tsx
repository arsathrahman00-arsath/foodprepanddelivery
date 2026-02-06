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
  cat_name?: string;
  unit_short?: string;
}

interface CategoryOption {
  cat_name: string;
}

interface ReceiptRow {
  id: number;
  itemName: string;
  categoryName: string;
  uom: string;
  receivedQty: string;
}

interface SupplierGroup {
  id: number;
  supplierName: string;
  rows: ReceiptRow[];
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
  
  // Grouped entries by supplier
  const [supplierGroups, setSupplierGroups] = useState<SupplierGroup[]>([
    { 
      id: 1, 
      supplierName: "", 
      rows: [{ id: 1, itemName: "", categoryName: "", uom: "", receivedQty: "" }] 
    }
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

  // Update supplier name for a group
  const updateSupplierName = (groupId: number, supplierName: string) => {
    setSupplierGroups(prev => prev.map(group => 
      group.id === groupId ? { ...group, supplierName } : group
    ));
  };

  // Update a row within a supplier group (with auto-fill for item selection)
  const updateRow = (groupId: number, rowId: number, field: keyof ReceiptRow, value: string) => {
    setSupplierGroups(prev => prev.map(group => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        rows: group.rows.map(row => {
          if (row.id !== rowId) return row;
          
          // If item is being selected, auto-fill category and uom
          if (field === 'itemName') {
            const selectedItem = items.find(item => item.item_name === value);
            return {
              ...row,
              itemName: value,
              categoryName: selectedItem?.cat_name || row.categoryName,
              uom: selectedItem?.unit_short || row.uom,
            };
          }
          
          return { ...row, [field]: value };
        })
      };
    }));
  };

  // Add a new row to a supplier group
  const addRow = (groupId: number) => {
    setSupplierGroups(prev => prev.map(group => {
      if (group.id !== groupId) return group;
      const newRowId = Math.max(...group.rows.map(r => r.id), 0) + 1;
      return {
        ...group,
        rows: [...group.rows, { id: newRowId, itemName: "", categoryName: "", uom: "", receivedQty: "" }]
      };
    }));
  };

  // Remove a row from a supplier group
  const removeRow = (groupId: number, rowId: number) => {
    setSupplierGroups(prev => prev.map(group => {
      if (group.id !== groupId) return group;
      if (group.rows.length <= 1) return group; // Keep at least one row
      return {
        ...group,
        rows: group.rows.filter(row => row.id !== rowId)
      };
    }));
  };

  // Add a new supplier group
  const addSupplierGroup = () => {
    const newGroupId = Math.max(...supplierGroups.map(g => g.id), 0) + 1;
    setSupplierGroups(prev => [
      ...prev,
      { 
        id: newGroupId, 
        supplierName: "", 
        rows: [{ id: 1, itemName: "", categoryName: "", uom: "", receivedQty: "" }] 
      }
    ]);
  };

  // Remove a supplier group
  const removeSupplierGroup = (groupId: number) => {
    if (supplierGroups.length > 1) {
      setSupplierGroups(prev => prev.filter(group => group.id !== groupId));
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

    // Collect all valid entries
    const validEntries: { supplierName: string; row: ReceiptRow }[] = [];
    
    supplierGroups.forEach(group => {
      if (!group.supplierName) return;
      group.rows.forEach(row => {
        if (row.categoryName && row.itemName && row.uom && row.receivedQty) {
          validEntries.push({ supplierName: group.supplierName, row });
        }
      });
    });

    if (validEntries.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in at least one complete entry with supplier",
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
            mat_rec_date: formattedDate,
            sup_name: entry.supplierName,
            cat_name: entry.row.categoryName,
            item_name: entry.row.itemName,
            unit_short: entry.row.uom,
            mat_rec_qty: entry.row.receivedQty,
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
      setSupplierGroups([
        { 
          id: 1, 
          supplierName: "", 
          rows: [{ id: 1, itemName: "", categoryName: "", uom: "", receivedQty: "" }] 
        }
      ]);
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
            Enter the details of received materials organized by supplier
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

          {/* Supplier Groups */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Supplier Entries</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSupplierGroup}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </Button>
            </div>

            {supplierGroups.map((group, groupIndex) => (
              <div
                key={group.id}
                className="border rounded-lg overflow-hidden"
              >
                {/* Supplier Header */}
                <div className="bg-muted/50 p-4 flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm">Supplier Name</Label>
                    <Select
                      value={group.supplierName}
                      onValueChange={(value) => updateSupplierName(group.id, value)}
                    >
                      <SelectTrigger className="bg-background">
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
                  {supplierGroups.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSupplierGroup(group.id)}
                      className="text-destructive hover:text-destructive mt-6"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Material Rows */}
                <div className="p-4 space-y-3">
                  {/* Header Row */}
                  <div className="hidden md:grid md:grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                    <div className="col-span-3">Item Name</div>
                    <div className="col-span-3">Category Name</div>
                    <div className="col-span-2">Unit of Measure</div>
                    <div className="col-span-3">Received Quantity</div>
                    <div className="col-span-1">Action</div>
                  </div>

                  {group.rows.map((row) => (
                    <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                      {/* Item Name - First */}
                      <div className="md:col-span-3">
                        <Label className="md:hidden text-xs mb-1 block">Item Name</Label>
                        <Select
                          value={row.itemName}
                          onValueChange={(value) => updateRow(group.id, row.id, "itemName", value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={isLoadingItems ? "Loading..." : "Item"} />
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

                      {/* Category Name - Auto-filled */}
                      <div className="md:col-span-3">
                        <Label className="md:hidden text-xs mb-1 block">Category Name</Label>
                        <Input
                          value={row.categoryName}
                          readOnly
                          disabled
                          placeholder="Select item first"
                          className="h-9 bg-muted text-muted-foreground"
                        />
                      </div>

                      {/* UoM - Auto-filled */}
                      <div className="md:col-span-2">
                        <Label className="md:hidden text-xs mb-1 block">Unit of Measure</Label>
                        <Input
                          value={row.uom}
                          readOnly
                          disabled
                          placeholder="Auto"
                          className="h-9 bg-muted text-muted-foreground"
                        />
                      </div>

                      {/* Received Quantity */}
                      <div className="md:col-span-3">
                        <Label className="md:hidden text-xs mb-1 block">Received Quantity</Label>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={row.receivedQty}
                          onChange={(e) => updateRow(group.id, row.id, "receivedQty", e.target.value)}
                          min="0"
                          step="0.01"
                          className="h-9"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="md:col-span-1 flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => addRow(group.id)}
                          className="h-9 w-9"
                          title="Add row"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        {group.rows.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeRow(group.id, row.id)}
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
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
