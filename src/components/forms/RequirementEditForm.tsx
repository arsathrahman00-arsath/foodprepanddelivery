import React, { useState, useEffect } from "react";
import { Save, Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, numericOnly } from "@/lib/utils";
import { deliveryRequirementApi, masjidListApi } from "@/lib/api";

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
  editData?: any;
}

const RequirementEditForm: React.FC<Props> = ({ onSuccess, editData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [masjidList, setMasjidList] = useState<any[]>([]);

  const [reqDate, setReqDate] = useState<Date | undefined>(
    editData?.req_date ? new Date(editData.req_date) : undefined
  );
  const [masjidName, setMasjidName] = useState(editData?.masjid_name || "");
  const [reqQty, setReqQty] = useState(editData?.req_qty || "");

  useEffect(() => {
    masjidListApi.getAll().then((res) => {
      if (res.status === "success" || res.status === "ok") setMasjidList(res.data || []);
    }).finally(() => setLoadingDropdowns(false));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDate || !masjidName || !reqQty) { setError("All fields are required"); return; }
    setIsLoading(true);
    setError(null);
    try {
      const selectedMasjid = masjidList.find((m: any) => m.masjid_name === masjidName);
      const response = await deliveryRequirementApi.update({
        req_date: format(reqDate, "yyyy-MM-dd'T'00:00:00"),
        masjid_name: masjidName,
        masjid_code: String(selectedMasjid?.masjid_code || editData?.masjid_code || ""),
        req_qty: String(reqQty),
      });
      if (response.status === "success" || response.status === "ok") { onSuccess?.(); }
      else { setError(response.message || "Failed to update"); }
    } catch { setError("Unable to connect to server"); }
    finally { setIsLoading(false); }
  };

  if (loadingDropdowns) return <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
      <div className="space-y-2">
        <Label>Requirement Date *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className={cn("w-full pl-3 text-left font-normal h-10", !reqDate && "text-muted-foreground")}>
              {reqDate ? format(reqDate, "PPP") : "Pick a date"}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50" align="start">
            <Calendar mode="single" selected={reqDate} onSelect={setReqDate} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-2">
        <Label>Mosque Name *</Label>
        <Select value={masjidName} onValueChange={setMasjidName}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Select mosque" /></SelectTrigger>
          <SelectContent className="bg-background border z-50">
            {masjidList.map((m: any) => <SelectItem key={m.masjid_name} value={m.masjid_name}>{m.masjid_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Required Qty *</Label>
        <Input type="number" min="0" value={reqQty} onChange={(e) => setReqQty(e.target.value)} onKeyDown={numericOnly} className="h-10" />
      </div>
      <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
        <Save className="w-4 h-4" />{isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
};

export default RequirementEditForm;
