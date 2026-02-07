import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, PackageCheck, Loader2, Plus, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { packingApi } from "@/lib/api";

interface PackingRecord {
  pack_date: string;
  recipe_type: string;
  req_qty: string;
  avbl_qty: string;
  pack_qty: string;
  created_by: string;
}

interface RecipeQtyData {
  recipe_type: string;
  req_qty: number;
}

const PackingPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Table state
  const [records, setRecords] = useState<PackingRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);

  // Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [recipeQtyList, setRecipeQtyList] = useState<RecipeQtyData[]>([]);
  const [formRows, setFormRows] = useState<Array<{ recipe_type: string; req_qty: string; avbl_qty: string; pack_qty: string }>>([]);
  const [isLoadingDateData, setIsLoadingDateData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing records
  const fetchRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const response = await packingApi.getAll();
      if (response.data) {
        setRecords(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch packing records:", error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Fetch recipe data when date changes
  useEffect(() => {
    if (!selectedDate) {
      setRecipeQtyList([]);
      setFormRows([]);
      return;
    }

    const fetchDateData = async () => {
      setIsLoadingDateData(true);
      try {
        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        const response = await packingApi.getByDate(formattedDate);

        if (response.status === "success" && response.data) {
          const data = response.data;
          const recipes = data.recipes || [];
          const reqQtyArray = data.req_qty || [];

          const list: RecipeQtyData[] = recipes.map((r: any, i: number) => ({
            recipe_type: (r.recipe_type || "").trim(),
            req_qty: Number(reqQtyArray[i]) || 0,
          }));

          setRecipeQtyList(list);
          setFormRows(
            list.map((item) => ({
              recipe_type: item.recipe_type,
              req_qty: String(item.req_qty),
              avbl_qty: "",
              pack_qty: "",
            }))
          );
        } else {
          setRecipeQtyList([]);
          setFormRows([]);
        }
      } catch (error) {
        console.error("Failed to fetch date data:", error);
        toast({ title: "Error", description: "Failed to load data for the selected date", variant: "destructive" });
      } finally {
        setIsLoadingDateData(false);
      }
    };

    fetchDateData();
  }, [selectedDate, toast]);

  const updateFormRow = (index: number, field: "avbl_qty" | "pack_qty", value: string) => {
    setFormRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleSubmit = async () => {
    if (!selectedDate || formRows.length === 0) {
      toast({ title: "Validation Error", description: "Please select a date with recipe data", variant: "destructive" });
      return;
    }

    const rowsToSubmit = formRows.filter((r) => r.avbl_qty && r.pack_qty);
    if (rowsToSubmit.length === 0) {
      toast({ title: "Validation Error", description: "Please enter available and packed quantity for at least one row", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDate = format(selectedDate, "yyyy-MM-dd'T'00:00:00");
      const createdBy = user?.user_name || "";

      await Promise.all(
        rowsToSubmit.map((row) =>
          packingApi.create({
            pack_date: formattedDate,
            recipe_type: row.recipe_type,
            req_qty: row.req_qty,
            avbl_qty: row.avbl_qty,
            pack_qty: row.pack_qty,
            created_by: createdBy,
          })
        )
      );

      toast({ title: "Success", description: "Packing data saved successfully" });
      setDialogOpen(false);
      setSelectedDate(undefined);
      setFormRows([]);
      fetchRecords();
    } catch (error) {
      console.error("Failed to save packing:", error);
      toast({ title: "Error", description: "Failed to save packing data", variant: "destructive" });
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
                <PackageCheck className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">Packing</CardTitle>
                <CardDescription>Manage packing operations</CardDescription>
              </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Add Packing
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Packing</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Date Picker */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Packing Date</label>
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
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Loading */}
                  {isLoadingDateData && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}

                  {/* Form rows */}
                  {!isLoadingDateData && formRows.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Recipe Type</TableHead>
                            <TableHead className="text-right">Req Qty</TableHead>
                            <TableHead className="text-right">Available Qty</TableHead>
                            <TableHead className="text-right">Packed Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formRows.map((row, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{row.recipe_type}</TableCell>
                              <TableCell className="text-right">{row.req_qty}</TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={row.avbl_qty}
                                  onChange={(e) => updateFormRow(index, "avbl_qty", e.target.value)}
                                  className="w-24 ml-auto text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={row.pack_qty}
                                  onChange={(e) => updateFormRow(index, "pack_qty", e.target.value)}
                                  className="w-24 ml-auto text-right"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {!isLoadingDateData && selectedDate && formRows.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No recipe data found for the selected date.</p>
                  )}

                  {/* Submit */}
                  <Button onClick={handleSubmit} disabled={isSubmitting || formRows.length === 0} className="w-full gap-2">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Packing
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Existing records table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Recipe Type</TableHead>
                  <TableHead className="text-right">Req Qty</TableHead>
                  <TableHead className="text-right">Available Qty</TableHead>
                  <TableHead className="text-right">Packed Qty</TableHead>
                  <TableHead>Created By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingRecords ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No packing records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{record.pack_date}</TableCell>
                      <TableCell className="font-medium">{record.recipe_type}</TableCell>
                      <TableCell className="text-right">{record.req_qty}</TableCell>
                      <TableCell className="text-right">{record.avbl_qty}</TableCell>
                      <TableCell className="text-right">{record.pack_qty}</TableCell>
                      <TableCell>{record.created_by}</TableCell>
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

export default PackingPage;
