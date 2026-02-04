import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { locationApi } from "@/lib/api";

const locationSchema = z.object({
  masjid_name: z.string().min(1, "Required").max(100),
  address: z.string().min(1, "Required").max(200),
  city: z.string().min(1, "Required").max(50),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
}

const LocationFormFields: React.FC<Props> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: { masjid_name: "", address: "", city: "" },
  });

  const onSubmit = async (data: LocationFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await locationApi.create({
        masjid_name: data.masjid_name,
        address: data.address,
        city: data.city,
        created_by: user?.user_name || "",
      });

      if (response.status === "success" || response.status === "ok") {
        form.reset();
        onSuccess?.();
      } else {
        setError(response.message || "Failed to create");
      }
    } catch {
      setError("Unable to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="masjid_name">Masjid Name *</Label>
        <Input
          id="masjid_name"
          placeholder="Enter masjid name"
          {...form.register("masjid_name")}
          className="h-10"
        />
        {form.formState.errors.masjid_name && (
          <p className="text-xs text-destructive">{form.formState.errors.masjid_name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Input
          id="address"
          placeholder="Enter address"
          {...form.register("address")}
          className="h-10"
        />
        {form.formState.errors.address && (
          <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">City *</Label>
        <Input
          id="city"
          placeholder="Enter city"
          {...form.register("city")}
          className="h-10"
        />
        {form.formState.errors.city && (
          <p className="text-xs text-destructive">{form.formState.errors.city.message}</p>
        )}
      </div>
      <div className="pt-2">
        <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
          <Plus className="w-4 h-4" />
          {isLoading ? "Creating..." : "Add Location"}
        </Button>
      </div>
    </form>
  );
};

export default LocationFormFields;
