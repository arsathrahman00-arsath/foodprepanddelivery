import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, Save, Utensils } from "lucide-react";
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
  masjid_code?: string;
  req_qty: number;
}

interface RecipeInfo {
  recipe_type: string;
  recipe_code: string;
}

const FoodAllocationPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [records, setRecords] = useState<AllocationRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isLoadingDateData, setIsLoadingDateData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data from APIs
  const [recipes, setRecipes] = useState<RecipeInfo[]>([]);
  const [masjidRequirements, setMasjidRequirements] = useState<MasjidRequirement[]>([]);
  const [availableQty, setAvailableQty] = useState<number>(0);
  const [currentAvailableQty, setCurrentAvailableQty] = useState<number>(0);

  // Form fields
  const [selectedMasjid, setSelectedMasjid] = useState<string>("");
  const [reqQty, setReqQty] = useState<string>("");
  const [allocQty, setAllocQty] = useState<string>("");

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

  // Fetch data when date changes
  useEffect(() => {
    if (!selectedDate) {
      setRecipes([]);
      setMasjidRequirements([]);
      setAvailableQty(0);
      setCurrentAvailableQty(0);
      resetFormFields();
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

        if (scheduleRes.status === "success" && scheduleRes.data) {
          const data = scheduleRes.data;
          // recipes is an array of strings like ["Mutton Biriyani"]
          const recipeList = (data.recipes || []).map((r: any) =>
            typeof r === "string" ? { recipe_type: r, recipe_code: r } : r
          );
          setRecipes(recipeList);
          // requirements is an array of {masjid_name, req_qty}
          const requirements = data.requirements || [];
          const masjidList: MasjidRequirement[] = requirements.map((r: any) => ({
            masjid_name: r.masjid_name,
            req_qty: Number(r.req_qty) || 0,
          }));
          setMasjidRequirements(masjidList);
        }

        if (availRes.status === "success" && availRes.data) {
          const qty = Number(availRes.data.avbl_qty || availRes.data.available_qty || availRes.data) || 0;
          setAvailableQty(qty);
          setCurrentAvailableQty(qty);
        }
      } catch (error) {
        console.error("Failed to fetch date data:", error);
        toast({ title: "Error", description: "Failed to load data for selected date", variant: "destructive" });
      } finally {
        setIsLoadingDateData(false);
      }
    };

    fetchDateData();
  }, [selectedDate, toast]);

  const resetFormFields = () => {
    setSelectedMasjid("");
    setReqQty("");
    setAllocQty("");
  };

  // When masjid is selected, auto-populate req_qty
  useEffect(() => {
    if (!selectedMasjid) {
      setReqQty("");
      return;
    }
    const found = masjidRequirements.find(m => m.masjid_name === selectedMasjid);
    setReqQty(found ? String(found.req_qty) : "0");
  }, [selectedMasjid, masjidRequirements]);

  // Update available qty in real-time when alloc_qty changes
  useEffect(() => {
    const allocNum = Number(allocQty) || 0;
    setCurrentAvailableQty(availableQty - allocNum);
  }, [allocQty, availableQty]);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedMasjid || !allocQty) {
      toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDate = format(selectedDate, "yyyy-MM-dd'T'00:00:00");
      const recipe = recipes[0] || { recipe_type: "", recipe_code: "" };

      await allocationApi.create({
        alloc_date: formattedDate,
        masjid_name: selectedMasjid,
        req_qty: reqQty,
        avbl_qty: String(currentAvailableQty),
        alloc_qty: allocQty,
        created_by: user?.user_name || "",
        recipe_type: recipe.recipe_type,
        recipe_code: recipe.recipe_code,
      });

      toast({ title: "Success", description: "Allocation saved successfully" });
      // Update available qty for next allocation
      setAvailableQty(currentAvailableQty);
      resetFormFields();
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
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setSelectedDate(undefined); resetFormFields(); } }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Allocation</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Food Allocation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Date Picker */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Allocation Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {isLoadingDateData && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}

                  {!isLoadingDateData && selectedDate && recipes.length > 0 && (
                    <>
                      {/* Recipe Info */}
                      <div className="p-3 rounded-lg bg-muted/50 text-sm">
                        <span className="font-medium">Recipe: </span>
                        {recipes.map(r => r.recipe_type).join(", ")}
                      </div>

                      {/* Available Qty */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Available Qty</label>
                        <div className={cn("h-10 px-3 py-2 rounded-md border bg-muted flex items-center font-semibold text-lg", currentAvailableQty < 0 && "text-destructive")}>
                          {currentAvailableQty}
                        </div>
                      </div>

                      {/* Location Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Location (Masjid)</label>
                        <Select value={selectedMasjid} onValueChange={setSelectedMasjid}>
                          <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                          <SelectContent>
                            {masjidRequirements.map((m, i) => (
                              <SelectItem key={i} value={m.masjid_name}>{m.masjid_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Required Qty (auto-populated) */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Required Qty</label>
                        <Input type="number" value={reqQty} readOnly className="bg-muted" />
                      </div>

                      {/* Allocate Qty */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Allocate Qty</label>
                        <Input type="number" placeholder="Enter quantity" value={allocQty} onChange={(e) => setAllocQty(e.target.value)} />
                      </div>

                      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full gap-2">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Allocation
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
