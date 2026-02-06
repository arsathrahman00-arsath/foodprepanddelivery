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

interface SupplierGroup {
  id: number;
  supplierName: string;
  categoryName: string;
  items: ItemRow[];
}

const standardizeUnit = (unit: string): string => {
  if (!unit) return "";
  return unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();
};

const MaterialReceiptPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [allItems, setAllItems] = useState<ItemData[]>([]);
  const [supplierGroups, setSupplierGroups] = useState<SupplierGroup[]>([
    { id: 1, supplierName: "", categoryName: "", items: [] }
  ]);
  
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(allItems.map(item => item.cat_name))];
    return uniqueCategories.sort();
  }, [allItems]);

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

  const getItemsForCategory = (categoryName: string): ItemRow[] => {
    return allItems
      .filter(item => item.cat_name === categoryName)
      .map((item, index) => ({
        id: `${item.item_name}-${index}`,
        item_name: item.item_name,
        unit_short: standardizeUnit(item.unit_short),
        received_qty: "",
      }));
  };

  const updateSupplierName = (groupId: number, value: string) => {
    setSupplierGroups(prev => prev.map(group =>
      group.id === groupId ? { ...group, supplierName: value } : group
    ));
  };

  const updateCategoryName = (groupId: number, value: string) => {
    const items = getItemsForCategory(value);
    setSupplierGroups(prev => prev.map(group =>
      group.id === groupId ? { ...group, categoryName: value, items } : group
    ));
  };

  const updateReceivedQty = (groupId: number, itemId: string, value: string) => {
    setSupplierGroups(prev => prev.map(group => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        items: group.items.map(item =>
          item.id === itemId ? { ...item, received_qty: value } : item
        )
      };
    }));
  };

  const removeItemRow = (groupId: number, itemId: string) => {
    setSupplierGroups(prev => prev.map(group => {
      if (group.id !== groupId) return group;
      if (group.items.length <= 1) return group;
      return { ...group, items: group.items.filter(item => item.id !== itemId) };
    }));
  };

  const addSupplierGroup = () => {
    const newId = Math.max(...supplierGroups.map(g => g.id), 0) + 1;
    setSupplierGroups(prev => [...prev, { id: newId, supplierName: "", categoryName: "", items: [] }]);
  };

  const removeSupplierGroup = (groupId: number) => {
    if (supplierGroups.length > 1) {
      setSupplierGroups(prev => prev.filter(group => group.id !== groupId));
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate) {
      toast({ title: "Validation Error", description: "Please select a date", variant: "destructive" });
      return;
    }

    const validEntries: { supplierName: string; categoryName: string; item: ItemRow }[] = [];
    
    supplierGroups.forEach(group => {
      if (!group.supplierName || !group.categoryName) return;
      group.items.forEach(item => {
        if (item.received_qty && parseFloat(item.received_qty) > 0) {
          validEntries.push({ supplierName: group.supplierName, categoryName: group.categoryName, item });
        }
      });
    });

    if (validEntries.length === 0) {
      toast({ title: "Validation Error", description: "Please fill in at least one item with quantity", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const createdBy = user?.user_name || "system";
    const formattedDate = format(selectedDate, "yyyy-MM-dd");

    try {
      await Promise.all(
        validEntries.map(entry =>
          materialReceiptApi.create({
            mat_rec_date: formattedDate,
            sup_name: entry.supplierName,
            cat_name: entry.categoryName,
            item_name: entry.item.item_name,
            unit_short: entry.item.unit_short,
            mat_rec_qty: entry.item.received_qty,
            created_by: createdBy,
          })
        )
      );

      toast({ title: "Success", description: `${validEntries.length} material receipt(s) saved successfully` });

      setSelectedDate(undefined);
      setSupplierGroups([{ id: 1, supplierName: "", categoryName: "", items: [] }]);
    } catch (error) {
      console.error("Failed to save material receipts:", error);
      toast({ title: "Error", description: "Failed to save material receipts", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalValidItems = supplierGroups.reduce((sum, group) => 
    sum + group.items.filter(item => item.received_qty && parseFloat(item.received_qty) > 0).length, 0
  );

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
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-2">
              <Label>Receipt Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
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

            <Button type="button" variant="outline" onClick={addSupplierGroup} className="gap-1">
              <Plus className="w-4 h-4" />
              Add Supplier
            </Button>
          </div>

          {/* Supplier Groups */}
          <div className="space-y-6">
            {supplierGroups.map((group, groupIndex) => (
              <div key={group.id} className="border rounded-lg p-4 space-y-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Supplier Entry {groupIndex + 1}</span>
                  {supplierGroups.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSupplierGroup(group.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>

                {/* Supplier and Category Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Supplier Name</Label>
                    <Select value={group.supplierName} onValueChange={(v) => updateSupplierName(group.id, v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={isLoadingSuppliers ? "Loading..." : "Select supplier"} />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category Name</Label>
                    <Select value={group.categoryName} onValueChange={(v) => updateCategoryName(group.id, v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={isLoadingItems ? "Loading..." : "Select category"} />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Items Table */}
                {group.categoryName && group.items.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2">
                      <h4 className="text-sm font-medium">Items in {group.categoryName}</h4>
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
                        {group.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.item_name}</TableCell>
                            <TableCell>{item.unit_short}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Enter qty"
                                value={item.received_qty}
                                onChange={(e) => updateReceivedQty(group.id, item.id, e.target.value)}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItemRow(group.id, item.id)}
                                disabled={group.items.length <= 1}
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

                {group.categoryName && group.items.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground border rounded-lg">
                    No items found for this category
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Section */}
          {totalValidItems > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Total items with quantity: <span className="font-medium text-foreground">{totalValidItems}</span>
              </p>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Receipt ({totalValidItems} items)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MaterialReceiptPage;
