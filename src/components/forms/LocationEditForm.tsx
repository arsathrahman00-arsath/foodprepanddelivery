import React, { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { alphabetOnly, toProperCase } from "@/lib/utils";
import { locationApi } from "@/lib/api";

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
  editData?: any;
}

const LocationEditForm: React.FC<Props> = ({ onSuccess, editData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [masjidName, setMasjidName] = useState(editData?.masjid_name || "");
  const [address, setAddress] = useState(editData?.address || "");
  const [city, setCity] = useState(editData?.city || "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masjidName.trim() || !address.trim() || !city.trim()) {
      setError("All fields are required");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await locationApi.update({
        masjid_code: String(editData?.masjid_code || ""),
        masjid_name: toProperCase(masjidName.trim()),
        address: toProperCase(address.trim()),
        city: toProperCase(city.trim()),
      });
      if (response.status === "success" || response.status === "ok") {
        onSuccess?.();
      } else {
        setError(response.message || "Failed to update");
      }
    } catch {
      setError("Unable to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
      <div className="space-y-2">
        <Label>Masjid Name *</Label>
        <Input value={masjidName} onChange={(e) => setMasjidName(e.target.value)} onKeyDown={alphabetOnly} className="h-10" />
      </div>
      <div className="space-y-2">
        <Label>Address *</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-10" />
      </div>
      <div className="space-y-2">
        <Label>City *</Label>
        <Input value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={alphabetOnly} className="h-10" />
      </div>
      <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
        <Save className="w-4 h-4" />
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
};

export default LocationEditForm;
