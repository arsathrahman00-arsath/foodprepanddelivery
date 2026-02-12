import React, { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { alphabetOnly, toProperCase } from "@/lib/utils";
import { unitApi } from "@/lib/api";

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
  editData?: any;
}

const UnitEditForm: React.FC<Props> = ({ onSuccess, editData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unitName, setUnitName] = useState(editData?.unit_name || "");
  const [unitShort, setUnitShort] = useState(editData?.unit_short || "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim() || !unitShort.trim()) { setError("All fields are required"); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await unitApi.update({
        unit_code: String(editData?.unit_code || ""),
        unit_name: toProperCase(unitName.trim()),
        unit_short: toProperCase(unitShort.trim()),
      });
      if (response.status === "success" || response.status === "ok") { onSuccess?.(); }
      else { setError(response.message || "Failed to update"); }
    } catch { setError("Unable to connect to server"); }
    finally { setIsLoading(false); }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
      <div className="space-y-2">
        <Label>Unit Name *</Label>
        <Input value={unitName} onChange={(e) => setUnitName(e.target.value)} onKeyDown={alphabetOnly} className="h-10" />
      </div>
      <div className="space-y-2">
        <Label>Unit Short *</Label>
        <Input value={unitShort} onChange={(e) => setUnitShort(e.target.value)} onKeyDown={alphabetOnly} className="h-10" />
      </div>
      <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
        <Save className="w-4 h-4" />{isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
};

export default UnitEditForm;
