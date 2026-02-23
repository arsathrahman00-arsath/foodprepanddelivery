import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { CalendarIcon, Download, Loader2, Plus, Save, Trash2, Utensils } from "lucide-react";
import { generateAllocationPdf } from "@/lib/generateAllocationPdf";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn, numericOnly, toProperCase, formatDateForTable } from "@/lib/utils";
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

interface RecipeOption {
  recipe_type: string;
  recipe_code: string;
}

interface AllocationRow {
  id: string;
  recipe_type: string;
  recipe_code: string;
  masjid_name: string;
  req_qty: number;
  alloc_qty: string;
  isManual?: boolean;
}

const FoodAllocationPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [records, setRecords] = useState<AllocationRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const formInteracted = useRef(false);
  const [filterDate, setFilterDate] = useState<Date | undefined>();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isLoadingDateData, setIsLoadingDateData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [masjidRequirements, setMasjidRequirements] = useState<MasjidRequirement[]>([]);
  const [availableQty, setAvailableQty] = useState<number>(0);
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [autoPopulated, setAutoPopulated] = useState(false);

  const fetchRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const response = await allocationApi.getAll();
      if (response.data) {
        const raw = Array.isArray(response.data) ? response.data : [];
        raw.sort((a: AllocationRecord, b: AllocationRecord) => new Date(a.alloc_date).getTime() - new Date(b.alloc_date).getTime());
        setRecords(raw);
      }
    } catch (error) {
      console.error("Failed to fetch allocation records:", error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const filteredRecords = filterDate
    ? records.filter(r => r.alloc_date.split("T")[0] === format(filterDate, "yyyy-MM-dd"))
    : records;




  const resetDialog = () => {
    setSelectedDate(undefined);
    setRecipes([]);
    setMasjidRequirements([]);
    setAvailableQty(0);
    setRows([]);
    setAutoPopulated(false);
    formInteracted.current = false;
  };

  useEffect(() => {
    if (!selectedDate) {
      setRecipes([]);
      setMasjidRequirements([]);
      setAvailableQty(0);
      setRows([]);
      setAutoPopulated(false);
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

        let recipeList: RecipeOption[] = [];
        let masjidList: MasjidRequirement[] = [];

        if (scheduleRes.status === "success" && scheduleRes.data) {
          const data = scheduleRes.data;
          recipeList = (data.recipes || []).map((r: any) => ({
            recipe_type: (r.recipe_type || "").trim(),
            recipe_code: r.recipe_code || "",
          }));
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

        // Auto-populate rows from API response — filter out already allocated masjids
        const allocatedMasjids = records
          .filter(r => r.alloc_date.startsWith(format(selectedDate, "yyyy-MM-dd")))
          .map(r => r.masjid_name.toLowerCase());

        const autoRows: AllocationRow[] = masjidList
          .filter(m => !allocatedMasjids.includes(m.masjid_name.toLowerCase()))
          .map(m => ({
            id: crypto.randomUUID(),
            recipe_type: recipeList.length === 1 ? recipeList[0].recipe_type : "",
            recipe_code: recipeList.length === 1 ? recipeList[0].recipe_code : "",
            masjid_name: m.masjid_name,
            req_qty: m.req_qty,
            alloc_qty: "",
          }));

        setRows(autoRows.length > 0 ? autoRows : []);
        setAutoPopulated(true);
      } catch (error) {
        console.error("Failed to fetch date data:", error);
        toast({ title: "Error", description: "Failed to load data for selected date", variant: "destructive" });
      } finally {
        setIsLoadingDateData(false);
      }
    };

    fetchDateData();
  }, [selectedDate, toast, records]);

  const totalAllocated = rows.reduce((sum, r) => sum + (Number(r.alloc_qty) || 0), 0);
  const remainingQty = availableQty - totalAllocated;

  // Validation: check if any row has alloc_qty > available qty
  const hasAllocExceedsAvail = remainingQty < 0;

  const addNewRow = () => {
    formInteracted.current = true;
    setRows(prev => [...prev, {
      id: crypto.randomUUID(),
      recipe_type: recipes.length === 1 ? recipes[0].recipe_type : "",
      recipe_code: recipes.length === 1 ? recipes[0].recipe_code : "",
      masjid_name: "",
      req_qty: 0,
      alloc_qty: "",
      isManual: true,
    }]);
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(row => row.id !== id));
  };

  const updateRow = (id: string, field: keyof AllocationRow, value: string | number) => {
    formInteracted.current = true;
    setRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      if (field === "masjid_name") {
        const found = masjidRequirements.find(m => m.masjid_name === value);
        return { ...row, masjid_name: value as string, req_qty: found ? found.req_qty : row.req_qty };
      }
      if (field === "recipe_type") {
        const found = recipes.find(r => r.recipe_type === value);
        return { ...row, recipe_type: value as string, recipe_code: found ? found.recipe_code : "" };
      }
      return { ...row, [field]: value };
    }));
  };

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r.masjid_name && r.alloc_qty);
    if (!selectedDate || validRows.length === 0) {
      toast({ title: "Validation Error", description: "Please select a date and fill at least one allocation row", variant: "destructive" });
      return;
    }

    if (hasAllocExceedsAvail) {
      toast({ title: "Validation Error", description: "Allocate Qty is higher than Available Qty", variant: "destructive" });
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
          recipe_code: row.recipe_code,
        });
      }

      // Update available qty after successful save
      const formattedDateForUpdate = format(selectedDate, "yyyy-MM-dd");
      await allocationApi.updateAvailableQty({
        alloc_date: formattedDateForUpdate,
        avbl_qty: String(remainingQty),
      });

      toast({ title: "Success", description: `${validRows.length} allocation(s) saved successfully` });
      formInteracted.current = false;
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
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              if (!open && formInteracted.current) {
                setShowCloseWarning(true);
                return;
              }
              if (open) formInteracted.current = false;
              setDialogOpen(open);
              if (!open) resetDialog();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Allocation</Button>
              </DialogTrigger>
              <DialogContent
                className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle>Add Food Allocation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
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
                          <Calendar mode="single" selected={selectedDate} onSelect={(d) => { setSelectedDate(d); formInteracted.current = true; }} initialFocus className="p-3 pointer-events-auto" />
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

                  {/* Alloc > Avail error message */}
                  {hasAllocExceedsAvail && (
                    <p className="text-sm text-destructive font-medium">Allocate Qty is higher than Available Qty</p>
                  )}

                  {isLoadingDateData && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}

                  {!isLoadingDateData && selectedDate && autoPopulated && rows.length > 0 && (
                    <>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Recipe Type</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead className="text-right">Req Qty</TableHead>
                              <TableHead className="text-right">Allocate Qty</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((row) => (
                              <TableRow key={row.id}>
                                <TableCell>
                                  {row.isManual ? (
                                    <Select value={row.recipe_type} onValueChange={(v) => updateRow(row.id, "recipe_type", v)}>
                                      <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                                      <SelectContent>
                                        {recipes.map(r => (
                                          <SelectItem key={r.recipe_type} value={r.recipe_type}>{toProperCase(r.recipe_type)}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span className="text-sm font-medium">{toProperCase(row.recipe_type || (recipes.length === 1 ? recipes[0].recipe_type : ""))}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {row.isManual ? (
                                    <Select value={row.masjid_name} onValueChange={(v) => updateRow(row.id, "masjid_name", v)}>
                                      <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                                      <SelectContent>
                                        {masjidRequirements.map(m => (
                                          <SelectItem key={m.masjid_name} value={m.masjid_name}>{toProperCase(m.masjid_name)}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span className="text-sm font-medium">{toProperCase(row.masjid_name)}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {row.isManual ? (
                                    <Input
                                      type="number"
                                      placeholder="Qty"
                                      value={row.req_qty || ""}
                                      onChange={(e) => updateRow(row.id, "req_qty", Number(e.target.value))}
                                      onKeyDown={numericOnly}
                                      className="h-9 text-right"
                                    />
                                  ) : (
                                    <span className="text-sm font-medium">{row.req_qty}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    placeholder="Qty"
                                    value={row.alloc_qty}
                                    onChange={(e) => updateRow(row.id, "alloc_qty", e.target.value)}
                                    onKeyDown={numericOnly}
                                    className="h-9 text-right"
                                  />
                                </TableCell>
                                <TableCell className="w-10">
                                  {row.isManual && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeRow(row.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <Button variant="outline" onClick={addNewRow} className="w-full gap-2" disabled={!selectedDate}>
                        <Plus className="h-4 w-4" /> Add New Entry
                      </Button>

                      <Button onClick={handleSubmit} disabled={isSubmitting || hasAllocExceedsAvail} className="w-full gap-2">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Allocation{rows.filter(r => r.alloc_qty).length > 1 ? "s" : ""}
                      </Button>
                    </>
                  )}

                  {!isLoadingDateData && selectedDate && autoPopulated && rows.length === 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground text-center py-4">All locations already have allocations for this date.</p>
                      <Button variant="outline" onClick={addNewRow} className="w-full gap-2">
                        <Plus className="h-4 w-4" /> Add New Entry
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !filterDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDate ? format(filterDate, "PPP") : "Filter by date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[200]" align="start">
                <Calendar mode="single" selected={filterDate} onSelect={setFilterDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {filterDate && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setFilterDate(undefined)}>Clear</Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 ml-auto"
                  onClick={() => generateAllocationPdf(records as any, format(filterDate, "yyyy-MM-dd"))}
                  disabled={filteredRecords.length === 0}
                >
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              </>
            )}
          </div>
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
                ) : filteredRecords.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{filterDate ? "No records for selected date" : "No allocation records found"}</TableCell></TableRow>
                ) : (
                  filteredRecords.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{formatDateForTable(record.alloc_date)}</TableCell>
                      <TableCell className="font-medium">{toProperCase(record.masjid_name)}</TableCell>
                      <TableCell>{toProperCase(record.recipe_type)}</TableCell>
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

      <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you want to close the form without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={() => { formInteracted.current = false; setShowCloseWarning(false); setDialogOpen(false); resetDialog(); }}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FoodAllocationPage;
