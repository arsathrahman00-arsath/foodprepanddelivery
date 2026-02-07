import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, Minus, Save, Utensils } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { allocationApi } from "@/lib/api";

interface AllocationRecord {
  alloc_date: string;
  masjid_name: string;
  recipe_type: string;
  req_qty: string;
  avbl_qty: string;
  alloc_qty: string;
  created_by: string;
}

interface MasjidRequirement {
  masjid_name: string;
  req_qty: number;
}

interface AllocationRow {
  id: string;
  recipe_type: string;
  masjid_name: string;
  req_qty: number;
  alloc_qty: string;
}

const FoodAllocationPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [records, setRecords] = useState<AllocationRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Dialog state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isLoadingDateData, setIsLoadingDateData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recipes, setRecipes] = useState<string[]>([]);
  const [masjidRequirements, setMasjidRequirements] = useState<MasjidRequirement[]>([]);
  const [availableQty, setAvailableQty] = useState<number>(0);
  const [rows, setRows] = useState<AllocationRow[]>([]);

  const fetchRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const response = await allocationApi.getAll();
      if (response.data) {
        setRecords(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch allocation records:", error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const createEmptyRow = useCallback((recipeList?: string[]): AllocationRow => ({
    id: crypto.randomUUID(),
    recipe_type: (recipeList || recipes).length === 1 ? (recipeList || recipes)[0] : "",
    masjid_name: "",
    req_qty: 0,
    alloc_qty: "",
  }), [recipes]);

  const resetDialog = () => {
    setSelectedDate(undefined);
    setRecipes([]);
    setMasjidRequirements([]);
    setAvailableQty(0);
    setRows([]);
  };

  // Fetch data when date changes
  useEffect(() => {
    if (!selectedDate) {
      setRecipes([]);
      setMasjidRequirements([]);
      setAvailableQty(0);
      setRows([]);
      return;
    }

    const fetchDateData = async () => {
      setIsLoadingDateData(true);
      try {
        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        const [scheduleRes, availRes] = await Promise.all([
          allocationApi.getScheduleRequirement(formattedDate),
          allocationApi.getAvailableQty(formattedDate),
        ]);

        let recipeList: string[] = [];
        let masjidList: MasjidRequirement[] = [];

        if (scheduleRes.status === "success" && scheduleRes.data) {
          const data = scheduleRes.data;
          recipeList = data.recipes || [];
          const requirements = data.requirements || [];
          masjidList = requirements.map((r: any) => ({
            masjid_name: r.masjid_name,
            req_qty: Number(r.req_qty) || 0,
          }));
        }

        setRecipes(recipeList);
        setMasjidRequirements(masjidList);

        if (availRes.status === "success" && availRes.data) {
          const qty = Number(availRes.data.avbl_qty || availRes.data.available_qty || availRes.data) || 0;
          setAvailableQty(qty);
        }

        setRows([{
          id: crypto.randomUUID(),
          recipe_type: recipeList.length === 1 ? recipeList[0] : "",
          masjid_name: "",
          req_qty: 0,
          alloc_qty: "",
        }]);
      } catch (error) {
        console.error("Failed to fetch date data:", error);
        toast({ title: "Error", description: "Failed to load data for selected date", variant: "destructive" });
      } finally {
        setIsLoadingDateData(false);
      }
    };

    fetchDateData();
  }, [selectedDate, toast]);

  const totalAllocated = rows.reduce((sum, r) => sum + (Number(r.alloc_qty) || 0), 0);
  const remainingQty = availableQty - totalAllocated;

  const addRow = () => {
    setRows(prev => [...prev, createEmptyRow()]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof AllocationRow, value: string | number) => {
    setRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: value };
      if (field === "masjid_name") {
        const found = masjidRequirements.find(m => m.masjid_name === value);
        updated.req_qty = found ? found.req_qty : 0;
      }
      return updated;
    }));
  };

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r.masjid_name && r.alloc_qty);
    if (!selectedDate || validRows.length === 0) {
      toast({ title: "Validation Error", description: "Please select a date and fill at least one allocation row", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDate = format(selectedDate, "yyyy-MM-dd'T'00:00:00");
      let runningAvail = availableQty;

      for (const row of validRows) {
        runningAvail -= Number(row.alloc_qty) || 0;
        await allocationApi.create({
          alloc_date: formattedDate,
          masjid_name: row.masjid_name,
          req_qty: String(row.req_qty),
          avbl_qty: String(runningAvail),
          alloc_qty: row.alloc_qty,
          created_by: user?.user_name || "",
          recipe_type: row.recipe_type,
          recipe_code: row.recipe_type,
        });
      }

      toast({ title: "Success", description: `${validRows.length} allocation(s) saved successfully` });
      setDialogOpen(false);
      resetDialog();
      fetchRecords();
    } catch (error) {
      console.error("Failed to save allocation:", error);
      toast({ title: "Error", description: "Failed to save allocation", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUsedMasjids = (currentRowId: string) =>
    rows.filter(r => r.id !== currentRowId && r.masjid_name).map(r => r.masjid_name);

  return (
    <div className="space-y-6">
      <Card className="shadow-warm border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-warm flex items-center justify-center">
                <Utensils className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">Food Allocation</CardTitle>
                <CardDescription>Allocate food quantities to locations</CardDescription>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Allocation</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Food Allocation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Date + Available Qty */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Allocation Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[200]" align="start">
                          <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Available Qty</label>
                      <div className={cn(
                        "h-10 px-3 py-2 rounded-md border bg-muted flex items-center font-semibold text-lg",
                        remainingQty < 0 && "text-destructive"
                      )}>
                        {selectedDate ? remainingQty : "—"}
                      </div>
                    </div>
                  </div>

                  {isLoadingDateData && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}

                  {!isLoadingDateData && selectedDate && recipes.length > 0 && (
                    <>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Recipe Type</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead className="text-right">Req Qty</TableHead>
                              <TableHead className="text-right">Allocate Qty</TableHead>
                              <TableHead className="w-[80px] text-center">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((row, index) => {
                              const usedMasjids = getUsedMasjids(row.id);
                              const availableMasjids = masjidRequirements.filter(
                                m => !usedMasjids.includes(m.masjid_name) || m.masjid_name === row.masjid_name
                              );
                              return (
                                <TableRow key={row.id}>
                                  <TableCell>
                                    {recipes.length === 1 ? (
                                      <span className="text-sm font-medium">{recipes[0]}</span>
                                    ) : (
                                      <Select value={row.recipe_type} onValueChange={(v) => updateRow(row.id, "recipe_type", v)}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Select recipe" /></SelectTrigger>
                                        <SelectContent className="z-[200] bg-popover">
                                          {recipes.map((r, i) => (
                                            <SelectItem key={i} value={r}>{r}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Select value={row.masjid_name} onValueChange={(v) => updateRow(row.id, "masjid_name", v)}>
                                      <SelectTrigger className="h-9"><SelectValue placeholder="Select location" /></SelectTrigger>
                                      <SelectContent className="z-[200] bg-popover">
                                        {availableMasjids.map((m, i) => (
                                          <SelectItem key={i} value={m.masjid_name}>{m.masjid_name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className="text-sm font-medium">{row.req_qty}</span>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      placeholder="Qty"
                                      value={row.alloc_qty}
                                      onChange={(e) => updateRow(row.id, "alloc_qty", e.target.value)}
                                      className="h-9 text-right"
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {index === rows.length - 1 && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={addRow}>
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      )}
                                      {rows.length > 1 && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRow(row.id)}>
                                          <Minus className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full gap-2">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Allocation{rows.filter(r => r.masjid_name && r.alloc_qty).length > 1 ? "s" : ""}
                      </Button>
                    </>
                  )}

                  {!isLoadingDateData && selectedDate && recipes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No schedule data found for the selected date.</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Recipe Type</TableHead>
                  <TableHead className="text-right">Req Qty</TableHead>
                  <TableHead className="text-right">Available Qty</TableHead>
                  <TableHead className="text-right">Alloc Qty</TableHead>
                  <TableHead>Created By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingRecords ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : records.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No allocation records found</TableCell></TableRow>
                ) : (
                  records.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{record.alloc_date}</TableCell>
                      <TableCell className="font-medium">{record.masjid_name}</TableCell>
                      <TableCell>{record.recipe_type}</TableCell>
                      <TableCell className="text-right">{record.req_qty}</TableCell>
                      <TableCell className="text-right">{record.avbl_qty}</TableCell>
                      <TableCell className="text-right">{record.alloc_qty}</TableCell>
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

export default FoodAllocationPage;
