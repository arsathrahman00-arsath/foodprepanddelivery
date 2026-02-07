import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, Save, Truck } from "lucide-react";
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
}

const DeliveryPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [records, setRecords] = useState<DeliveryRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isLoadingDateData, setIsLoadingDateData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [masjidList, setMasjidList] = useState<MasjidInfo[]>([]);
  const [selectedMasjid, setSelectedMasjid] = useState<string>("");
  const [deliveryTime, setDeliveryTime] = useState<string>("");
  const [deliveryBy, setDeliveryBy] = useState<string>("");
  const [deliveryQty, setDeliveryQty] = useState<string>("");

  const fetchRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const response = await deliveryApi.getAll();
      if (response.data) {
        setRecords(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch delivery records:", error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  // Fetch schedule data when date changes
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
        const response = await deliveryApi.getScheduleRequirement(formattedDate);

        if (response.status === "success" && response.data) {
          const data = response.data;
          const masjids = data.masjid_names || data.masjid_name || [];
          const reqQtys = data.req_qty || [];
          const list: MasjidInfo[] = Array.isArray(masjids)
            ? masjids.map((name: string, i: number) => ({
                masjid_name: typeof name === "string" ? name.trim() : name,
                req_qty: Number(reqQtys[i]) || 0,
              }))
            : [];
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
    setDeliveryTime("");
    setDeliveryBy("");
    setDeliveryQty("");
  };

  // Auto-populate delivery time when location is selected
  useEffect(() => {
    if (selectedMasjid) {
      setDeliveryTime(format(new Date(), "HH:mm:ss"));
    } else {
      setDeliveryTime("");
    }
  }, [selectedMasjid]);

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
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setSelectedDate(undefined); resetFormFields(); } }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Delivery</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Delivery</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Date Picker */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Delivery Date</label>
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

                  {!isLoadingDateData && selectedDate && masjidList.length > 0 && (
                    <>
                      {/* Location Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Location (Masjid)</label>
                        <Select value={selectedMasjid} onValueChange={setSelectedMasjid}>
                          <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                          <SelectContent>
                            {masjidList.map((m, i) => (
                              <SelectItem key={i} value={m.masjid_name}>{m.masjid_name} (Req: {m.req_qty})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Delivery Time (auto-populated) */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Delivery Time</label>
                        <Input value={deliveryTime} readOnly className="bg-muted" placeholder="Auto-populated on location select" />
                      </div>

                      {/* Delivery By */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Delivery By</label>
                        <Input placeholder="Enter personnel name" value={deliveryBy} onChange={(e) => setDeliveryBy(e.target.value)} />
                      </div>

                      {/* Delivery Qty */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Delivery Qty</label>
                        <Input type="number" placeholder="Enter quantity" value={deliveryQty} onChange={(e) => setDeliveryQty(e.target.value)} />
                      </div>

                      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full gap-2">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Delivery
                      </Button>
                    </>
                  )}

                  {!isLoadingDateData && selectedDate && masjidList.length === 0 && (
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
                  <TableHead>Delivery By</TableHead>
                  <TableHead className="text-right">Delivery Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingRecords ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : records.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No delivery records found</TableCell></TableRow>
                ) : (
                  records.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{record.delivery_date}</TableCell>
                      <TableCell className="font-medium">{record.location}</TableCell>
                      <TableCell>{record.delivery_by}</TableCell>
                      <TableCell className="text-right">{record.delivery_qty}</TableCell>
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

export default DeliveryPage;
