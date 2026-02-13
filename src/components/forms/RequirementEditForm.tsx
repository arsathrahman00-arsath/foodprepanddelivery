import React, { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { numericOnly } from "@/lib/utils";
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
        <Label>Requirement Date</Label>
        <Input value={reqDate ? format(reqDate, "PPP") : ""} disabled className="h-10 bg-muted" />
      </div>
      <div className="space-y-2">
        <Label>Mosque Name</Label>
        <Input value={masjidName} disabled className="h-10 bg-muted" />
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
