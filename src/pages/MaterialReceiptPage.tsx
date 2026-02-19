import React, { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon, Package, Loader2, Trash2, Save, Plus, X } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface CategoryTab {
  id: string;
  cat_name: string;
  cat_code: string;
  supplierName: string;
  supplierOptions: string[];
  supplierError: string;
  isLoadingSupplier: boolean;
  items: ItemRow[];
  isLoadingItems: boolean;
}

const standardizeUnit = (unit: string): string => {
  if (!unit) return "";
  return unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();
};

const MaterialReceiptPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const today = new Date();
  const [receiptDate] = useState<Date>(today);
  const [purchaseReqDate, setPurchaseReqDate] = useState<Date | undefined>();
  const [purchaseType, setPurchaseType] = useState<string>("");

  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-category tabs
  const [categoryTabs, setCategoryTabs] = useState<CategoryTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");

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

  // Categories already added as tabs
  const usedCatCodes = useMemo(() => categoryTabs.map(t => t.cat_code), [categoryTabs]);

  const availableCategories = useMemo(
    () => categories.filter(c => !usedCatCodes.includes(c.cat_code)),
    [categories, usedCatCodes]
  );

  const addCategoryTab = useCallback((catName: string) => {
    const cat = categories.find(c => c.cat_name === catName);
    if (!cat) return;

    const tabId = `tab-${cat.cat_code}-${Date.now()}`;
    const newTab: CategoryTab = {
      id: tabId,
      cat_name: cat.cat_name,
      cat_code: cat.cat_code,
      supplierName: "",
      supplierOptions: [],
      supplierError: "",
      isLoadingSupplier: true,
      items: [],
      isLoadingItems: false,
    };

    setCategoryTabs(prev => [...prev, newTab]);
    setActiveTabId(tabId);

    // Fetch supplier for this category
    fetchSupplierForTab(tabId, cat.cat_code);
  }, [categories]);

  const fetchSupplierForTab = async (tabId: string, catCode: string) => {
    try {
      const response = await materialReceiptApi.getSuppliersByCategory(catCode);
      const names: string[] = [];
      let errorMsg = "";

      if (response.status === "success") {
        const topSupName = (response as any).sup_name;
        const data = response.data;
        if (topSupName) {
          names.push(topSupName);
        } else if (data) {
          if (typeof data === "string") names.push(data);
          else if (Array.isArray(data)) data.forEach((d: any) => { if (d.sup_name) names.push(d.sup_name); });
          else if (data.sup_name) names.push(data.sup_name);
        }
      } else if (response.status === "error") {
        errorMsg = (response as any).message || "Supplier not found for this category";
      }

      setCategoryTabs(prev => prev.map(tab =>
        tab.id === tabId
          ? {
              ...tab,
              supplierOptions: names,
              supplierName: names.length === 1 ? names[0] : "",
              supplierError: names.length === 0 && !errorMsg ? "No supplier found" : errorMsg,
              isLoadingSupplier: false,
            }
          : tab
      ));
    } catch (error) {
      console.error("Failed to fetch supplier:", error);
      setCategoryTabs(prev => prev.map(tab =>
        tab.id === tabId
          ? { ...tab, isLoadingSupplier: false, supplierError: "Failed to fetch supplier" }
          : tab
      ));
    }
  };

  // Fetch items when purchaseReqDate or purchaseType changes for all tabs
  useEffect(() => {
    if (!purchaseReqDate || !purchaseType) return;

    categoryTabs.forEach(tab => {
      if (tab.items.length === 0 && !tab.isLoadingItems) {
        fetchItemsForTab(tab.id, tab.cat_name);
      }
    });
  }, [purchaseReqDate, purchaseType]);

  // Fetch items when a new tab is added and date+type are set
  const fetchItemsForTab = async (tabId: string, catName: string) => {
    if (!purchaseReqDate || !purchaseType) return;

    setCategoryTabs(prev => prev.map(tab =>
      tab.id === tabId ? { ...tab, isLoadingItems: true } : tab
    ));

    try {
      const response = await materialReceiptApi.getItemsByDateAndCategory({
        day_req_date: format(purchaseReqDate, "yyyy-MM-dd"),
        purc_type: purchaseType,
        cat_name: catName,
      });
      if (response.status === "success" && response.data) {
        const rawItems = Array.isArray(response.data) ? response.data : [];
        setCategoryTabs(prev => prev.map(tab =>
          tab.id === tabId
            ? {
                ...tab,
                items: rawItems.map((item: any) => ({
                  item_name: item.item_name || "",
                  unit_short: standardizeUnit(item.unit_short || ""),
                  day_req_qty: String(item.day_req_qty || "0"),
                  received_qty: "",
                })),
                isLoadingItems: false,
              }
            : tab
        ));
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
      setCategoryTabs(prev => prev.map(tab =>
        tab.id === tabId ? { ...tab, items: [], isLoadingItems: false } : tab
      ));
    }
  };

  // When a new tab is added and date+type already set, fetch items
  useEffect(() => {
    if (!purchaseReqDate || !purchaseType) return;
    const lastTab = categoryTabs[categoryTabs.length - 1];
    if (lastTab && lastTab.items.length === 0 && !lastTab.isLoadingItems) {
      fetchItemsForTab(lastTab.id, lastTab.cat_name);
    }
  }, [categoryTabs.length]);

  const updateTabSupplier = (tabId: string, value: string) => {
    setCategoryTabs(prev => prev.map(tab =>
      tab.id === tabId ? { ...tab, supplierName: value } : tab
    ));
  };

  const updateTabItemQty = (tabId: string, index: number, value: string) => {
    setCategoryTabs(prev => prev.map(tab =>
      tab.id === tabId
        ? { ...tab, items: tab.items.map((item, i) => i === index ? { ...item, received_qty: value } : item) }
        : tab
    ));
  };

  const removeTabItem = (tabId: string, index: number) => {
    setCategoryTabs(prev => prev.map(tab => {
      if (tab.id !== tabId || tab.items.length <= 1) return tab;
      return { ...tab, items: tab.items.filter((_, i) => i !== index) };
    }));
  };

  const removeCategoryTab = (tabId: string) => {
    setCategoryTabs(prev => {
      const updated = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId && updated.length > 0) {
        setActiveTabId(updated[updated.length - 1].id);
      }
      return updated;
    });
  };

  // Collect all valid items across all tabs
  const allValidItems = useMemo(() => {
    const result: { tab: CategoryTab; item: ItemRow }[] = [];
    categoryTabs.forEach(tab => {
      tab.items.forEach(item => {
        if (item.received_qty && parseFloat(item.received_qty) > 0) {
          result.push({ tab, item });
        }
      });
    });
    return result;
  }, [categoryTabs]);

  const handleSubmit = async () => {
    if (!purchaseReqDate) {
      toast({ title: "Validation Error", description: "Please select a Purchase Request Date", variant: "destructive" });
      return;
    }
    if (!purchaseType) {
      toast({ title: "Validation Error", description: "Please select a Purchase Type", variant: "destructive" });
      return;
    }
    if (categoryTabs.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one category", variant: "destructive" });
      return;
    }
    if (allValidItems.length === 0) {
      toast({ title: "Validation Error", description: "Please fill in at least one item with received quantity", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const createdBy = user?.user_name || "system";
    const formattedReceiptDate = format(receiptDate, "yyyy-MM-dd");
    const formattedPurchaseReqDate = format(purchaseReqDate, "yyyy-MM-dd");

    try {
      await Promise.all(
        allValidItems.map(({ tab, item }) =>
          materialReceiptApi.create({
            mat_rec_date: formattedReceiptDate,
            day_req_date: formattedPurchaseReqDate,
            sup_name: tab.supplierName,
            cat_name: tab.cat_name,
            item_name: item.item_name,
            unit_short: item.unit_short,
            mat_rec_qty: item.received_qty,
            created_by: createdBy,
          })
        )
      );

      toast({ title: "Success", description: `${allValidItems.length} material receipt(s) saved successfully` });
      setPurchaseReqDate(undefined);
      setPurchaseType("");
      setCategoryTabs([]);
      setActiveTabId("");
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
            Select purchase request details, add categories, and record received quantities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Row 1: Receipt Date + Purchase Request Date + Purchase Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>

          {/* Add Category Section */}
          <div className="flex items-end gap-3">
            <div className="space-y-2 flex-1 max-w-sm">
              <Label>Add Category</Label>
              <Select
                value=""
                onValueChange={addCategoryTab}
                disabled={isLoadingCategories || availableCategories.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      isLoadingCategories
                        ? "Loading..."
                        : availableCategories.length === 0
                          ? "All categories added"
                          : "Select category to add"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat.cat_code} value={cat.cat_name}>{cat.cat_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category Tabs */}
          {categoryTabs.length > 0 && (
            <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
              <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {categoryTabs.map(tab => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="relative pr-7 data-[state=active]:bg-background"
                  >
                    {tab.cat_name}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeCategoryTab(tab.id); }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </TabsTrigger>
                ))}
              </TabsList>

              {categoryTabs.map(tab => (
                <TabsContent key={tab.id} value={tab.id} className="space-y-4 mt-4">
                  {/* Supplier */}
                  <div className="space-y-2 max-w-sm">
                    <Label>Supplier Name</Label>
                    {tab.isLoadingSupplier ? (
                      <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : tab.supplierError ? (
                      <div className="h-10 px-3 py-2 rounded-md border border-destructive/50 bg-destructive/10 flex items-center">
                        <span className="text-sm text-destructive">{tab.supplierError}</span>
                      </div>
                    ) : (
                      <Select value={tab.supplierName} onValueChange={(v) => updateTabSupplier(tab.id, v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-popover">
                          {tab.supplierOptions.map(sup => (
                            <SelectItem key={sup} value={sup}>{sup}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Items Table */}
                  {tab.isLoadingItems && (
                    <div className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">Loading items...</p>
                    </div>
                  )}

                  {!tab.isLoadingItems && tab.items.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2">
                        <h4 className="text-sm font-medium">Items in {tab.cat_name}</h4>
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
                          {tab.items.map((item, index) => (
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
                                  onChange={(e) => updateTabItemQty(tab.id, index, e.target.value)}
                                  onKeyDown={numericOnly}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeTabItem(tab.id, index)}
                                  disabled={tab.items.length <= 1}
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

                  {!tab.isLoadingItems && purchaseReqDate && purchaseType && tab.items.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground border rounded-lg">
                      No items found for {tab.cat_name}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* Submit Section */}
          {allValidItems.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Total items with quantity: <span className="font-medium text-foreground">{allValidItems.length}</span>
                {" across "}
                <span className="font-medium text-foreground">
                  {new Set(allValidItems.map(v => v.tab.cat_name)).size}
                </span>
                {" category(ies)"}
              </p>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Receipt ({allValidItems.length} items)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MaterialReceiptPage;
