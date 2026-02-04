import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ruler, Plus, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { unitApi } from "@/lib/api";

const unitSchema = z.object({
  unit_name: z.string().min(1, "Unit name is required").max(50, "Name too long"),
  unit_code: z.string().min(1, "Unit code is required").max(20, "Code too long"),
  unit_short: z.string().min(1, "Short form is required").max(10, "Short form too long"),
});

type UnitFormData = z.infer<typeof unitSchema>;

const UnitForm: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: { unit_name: "", unit_code: "", unit_short: "" },
  });

  const onSubmit = async (data: UnitFormData) => {
    setIsLoading(true);
    try {
      const response = await unitApi.create({
        unit_name: data.unit_name,
        unit_code: data.unit_code,
        unit_short: data.unit_short,
        created_by: user?.user_name || "",
      });

      if (response.status === "success" || response.status === "ok") {
        toast({
          title: "Unit created!",
          description: `${data.unit_name} has been added successfully.`,
        });
        form.reset();
      } else {
        toast({
          title: "Failed to create unit",
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
          <h1 className="text-2xl font-bold text-foreground">Master Unit</h1>
          <p className="text-muted-foreground">Add new measurement units</p>
        </div>
      </div>

      <Card className="max-w-2xl form-section">
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
            <Ruler className="w-6 h-6 text-purple-600" />
          </div>
          <CardTitle>Add New Unit</CardTitle>
          <CardDescription>Enter the details for the new measurement unit</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unit_name">Unit Name *</Label>
              <Input
                id="unit_name"
                placeholder="Enter unit name (e.g., Kilogram)"
                {...form.register("unit_name")}
                className="h-11"
              />
              {form.formState.errors.unit_name && (
                <p className="text-sm text-destructive">{form.formState.errors.unit_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_code">Unit Code *</Label>
                <Input
                  id="unit_code"
                  placeholder="Enter unit code"
                  {...form.register("unit_code")}
                  className="h-11"
                />
                {form.formState.errors.unit_code && (
                  <p className="text-sm text-destructive">{form.formState.errors.unit_code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_short">Short Form *</Label>
                <Input
                  id="unit_short"
                  placeholder="e.g., kg, g, l"
                  {...form.register("unit_short")}
                  className="h-11"
                />
                {form.formState.errors.unit_short && (
                  <p className="text-sm text-destructive">{form.formState.errors.unit_short.message}</p>
                )}
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2" disabled={isLoading}>
                <Plus className="w-4 h-4" />
                {isLoading ? "Creating..." : "Add Unit"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnitForm;
