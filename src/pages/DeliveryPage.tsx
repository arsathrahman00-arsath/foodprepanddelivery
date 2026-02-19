import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, Download, Loader2, Plus, Save, Truck, X } from "lucide-react";
import { generateDeliveryPdf } from "@/lib/generateDeliveryPdf";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { cn, formatDateForTable } from "@/lib/utils";
import { deliveryApi } from "@/lib/api";

interface DeliveryRecord {
  location: string;
  delivery_date: string;
  delivery_qty: string;
  delivery_by: string;
}

interface MasjidInfo {
  masjid_name: string;
  req_qty: number;
  alloc_qty: number;
}

const DeliveryPage: React.FC = () => {
  const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [records, setRecords] = useState<DeliveryRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [filterDate, setFilterDate] = useState<Date | undefined>();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const formInteracted = useRef(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isLoadingDateData, setIsLoadingDateData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [masjidList, setMasjidList] = useState<MasjidInfo[]>([]);
  const [selectedMasjid, setSelectedMasjid] = useState<string>("");
  const [allocatedQty, setAllocatedQty] = useState<number>(0);
  const [deliveryTime, setDeliveryTime] = useState<string>("");
  const [deliveryBy, setDeliveryBy] = useState<string>("");
  const [deliveryQty, setDeliveryQty] = useState<string>("");

  const fetchRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const response = await deliveryApi.getAll();
      if (response.data) {
        const raw = Array.isArray(response.data) ? response.data : [];
        raw.sort((a: DeliveryRecord, b: DeliveryRecord) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime());
        setRecords(raw);
      }
    } catch (error) {
      console.error("Failed to fetch delivery records:", error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  // Fetch schedule data when date changes — also filter out already-delivered mosques
  useEffect(() => {
    if (!selectedDate) {
      setMasjidList([]);
      resetFormFields();
      return;
    }

    const fetchDateData = async () => {
      setIsLoadingDateData(true);
      try {
        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        const [scheduleRes, allDeliveryRes] = await Promise.all([
          deliveryApi.getScheduleRequirement(formattedDate),
          deliveryApi.getAll(),
        ]);

        // Get already-delivered mosques for this date
        const existingDeliveries: DeliveryRecord[] = Array.isArray(allDeliveryRes.data) ? allDeliveryRes.data : [];
        const deliveredMosquesForDate = new Set(
          existingDeliveries
            .filter(d => d.delivery_date?.split("T")[0] === formattedDate)
            .map(d => d.location)
        );

        if (scheduleRes.status === "success" && scheduleRes.data) {
          const data = scheduleRes.data;
          const requirements = data.requirements || [];
          const list: MasjidInfo[] = requirements
            .map((r: any) => ({
              masjid_name: r.masjid_name,
              req_qty: Number(r.req_qty) || 0,
              alloc_qty: Number(r.alloc_qty) || 0,
            }))
            .filter((m: MasjidInfo) => !deliveredMosquesForDate.has(m.masjid_name));
          setMasjidList(list);
        } else {
          setMasjidList([]);
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
    setAllocatedQty(0);
    setDeliveryTime("");
    setDeliveryBy("");
    setDeliveryQty("");
    formInteracted.current = false;
  };

  useEffect(() => {
    if (selectedMasjid) {
      setDeliveryTime(format(new Date(), "HH:mm:ss"));
      const found = masjidList.find(m => m.masjid_name === selectedMasjid);
      const qty = found ? found.alloc_qty : 0;
      setAllocatedQty(qty);
      setDeliveryQty(qty > 0 ? String(qty) : "");
    } else {
      setDeliveryTime("");
      setAllocatedQty(0);
      setDeliveryQty("");
    }
  }, [selectedMasjid, masjidList]);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedMasjid || !deliveryQty || !deliveryBy) {
      toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDate = format(selectedDate, "yyyy-MM-dd'T'00:00:00");

      await deliveryApi.create({
        location: selectedMasjid,
        delivery_date: formattedDate,
        delivery_qty: deliveryQty,
        delivery_by: deliveryBy,
      });

      toast({ title: "Success", description: "Delivery recorded successfully" });
      formInteracted.current = false;
      resetFormFields();
      fetchRecords();
    } catch (error) {
      console.error("Failed to save delivery:", error);
      toast({ title: "Error", description: "Failed to save delivery", variant: "destructive" });
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
                <Truck className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">Delivery</CardTitle>
                <CardDescription>Track food delivery to locations</CardDescription>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              if (!open && formInteracted.current) {
                setShowCloseWarning(true);
                return;
              }
              if (open) formInteracted.current = false;
              setDialogOpen(open);
              if (!open) { setSelectedDate(undefined); resetFormFields(); }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Delivery</Button>
              </DialogTrigger>
              <DialogContent
                className="sm:max-w-lg"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle>Add Delivery</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Delivery Date</label>
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

                  {isLoadingDateData && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}

                  {!isLoadingDateData && selectedDate && masjidList.length > 0 && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Location (Masjid)</label>
                        <Popover open={locationPopoverOpen} onOpenChange={setLocationPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={locationPopoverOpen}
                              className={cn("w-full justify-between font-normal", !selectedMasjid && "text-muted-foreground")}
                            >
                              {selectedMasjid
                                ? `${selectedMasjid} (Req: ${masjidList.find(m => m.masjid_name === selectedMasjid)?.req_qty ?? 0})`
                                : "Search and select location..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[200]" align="start">
                            <Command>
                              <CommandInput placeholder="Search masjid..." />
                              <CommandList>
                                <CommandEmpty>No location found.</CommandEmpty>
                                <CommandGroup>
                                  {masjidList.map((m) => (
                                    <CommandItem
                                      key={m.masjid_name}
                                      value={m.masjid_name}
                                      onSelect={(val) => {
                                        const found = masjidList.find(
                                          (x) => x.masjid_name.toLowerCase() === val.toLowerCase()
                                        );
                                        if (found) {
                                          setSelectedMasjid(found.masjid_name);
                                          formInteracted.current = true;
                                        }
                                        setLocationPopoverOpen(false);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", selectedMasjid === m.masjid_name ? "opacity-100" : "opacity-0")} />
                                      {m.masjid_name} (Req: {m.req_qty})
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Allocated Quantity</label>
                        <Input value={allocatedQty || "—"} readOnly className="bg-muted font-semibold" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Delivery Time</label>
                        <Input value={deliveryTime} readOnly className="bg-muted" placeholder="Auto-populated on location select" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Delivery By</label>
                        <Input placeholder="Enter personnel name" value={deliveryBy} onChange={(e) => { setDeliveryBy(e.target.value); formInteracted.current = true; }} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Delivery Qty</label>
                        <Input type="number" placeholder="Enter quantity" value={deliveryQty} onChange={(e) => { setDeliveryQty(e.target.value); formInteracted.current = true; }} />
                      </div>

                      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full gap-2">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Delivery
                      </Button>
                    </>
                  )}

                  {!isLoadingDateData && selectedDate && masjidList.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No pending deliveries for the selected date.</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[220px] justify-start text-left font-normal", !filterDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDate ? format(filterDate, "PPP") : "Filter by date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={filterDate} onSelect={setFilterDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {filterDate && (
              <Button variant="ghost" size="icon" onClick={() => setFilterDate(undefined)}>
                <X className="h-4 w-4" />
              </Button>
            )}
            {filterDate && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => generateDeliveryPdf(format(filterDate, "yyyy-MM-dd"), records)}
              >
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            )}
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Delivery By</TableHead>
                  <TableHead className="text-right">Delivery Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingRecords ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : (() => {
                  const filtered = filterDate
                    ? records.filter(r => r.delivery_date.split("T")[0] === format(filterDate, "yyyy-MM-dd"))
                    : records;
                  return filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No delivery records found</TableCell></TableRow>
                  ) : (
                    filtered.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{formatDateForTable(record.delivery_date)}</TableCell>
                      <TableCell className="font-medium">{record.location}</TableCell>
                      <TableCell>{record.delivery_by}</TableCell>
                      <TableCell className="text-right">{record.delivery_qty}</TableCell>
                    </TableRow>
                  ))
                  );
                })()}
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
            <AlertDialogAction onClick={() => { formInteracted.current = false; setShowCloseWarning(false); setDialogOpen(false); setSelectedDate(undefined); resetFormFields(); }}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeliveryPage;
