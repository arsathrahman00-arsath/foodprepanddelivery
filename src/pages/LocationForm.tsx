import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Plus, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { locationApi } from "@/lib/api";

const locationSchema = z.object({
  masjid_name: z.string().min(1, "Location name is required").max(100, "Name too long"),
  masjid_code: z.string().min(1, "Location code is required").max(20, "Code too long"),
  address: z.string().min(1, "Address is required").max(200, "Address too long"),
  city: z.string().min(1, "City is required").max(50, "City too long"),
});

type LocationFormData = z.infer<typeof locationSchema>;

const LocationForm: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: { masjid_name: "", masjid_code: "", address: "", city: "" },
  });

  const onSubmit = async (data: LocationFormData) => {
    setIsLoading(true);
    try {
      const response = await locationApi.create({
        masjid_name: data.masjid_name,
        masjid_code: data.masjid_code,
        address: data.address,
        city: data.city,
        created_by: user?.user_name || "",
      });

      if (response.status === "success" || response.status === "ok") {
        toast({
          title: "Location created!",
          description: `${data.masjid_name} has been added successfully.`,
        });
        form.reset();
      } else {
        toast({
          title: "Failed to create location",
          description: response.message || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to connect to server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Master Location</h1>
          <p className="text-muted-foreground">Add new masjid locations</p>
        </div>
      </div>

      <Card className="max-w-2xl form-section">
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
            <MapPin className="w-6 h-6 text-emerald-600" />
          </div>
          <CardTitle>Add New Location</CardTitle>
          <CardDescription>Enter the details for the new location</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="masjid_name">Location Name *</Label>
                <Input
                  id="masjid_name"
                  placeholder="Enter location name"
                  {...form.register("masjid_name")}
                  className="h-11"
                />
                {form.formState.errors.masjid_name && (
                  <p className="text-sm text-destructive">{form.formState.errors.masjid_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="masjid_code">Location Code *</Label>
                <Input
                  id="masjid_code"
                  placeholder="Enter location code"
                  {...form.register("masjid_code")}
                  className="h-11"
                />
                {form.formState.errors.masjid_code && (
                  <p className="text-sm text-destructive">{form.formState.errors.masjid_code.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                placeholder="Enter full address"
                {...form.register("address")}
                className="h-11"
              />
              {form.formState.errors.address && (
                <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                placeholder="Enter city"
                {...form.register("city")}
                className="h-11"
              />
              {form.formState.errors.city && (
                <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
              )}
            </div>

            <div className="pt-4">
              <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2" disabled={isLoading}>
                <Plus className="w-4 h-4" />
                {isLoading ? "Creating..." : "Add Location"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationForm;
