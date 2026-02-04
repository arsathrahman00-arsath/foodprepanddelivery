import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Truck, Plus, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supplierApi } from "@/lib/api";

const supplierSchema = z.object({
  sup_name: z.string().min(1, "Supplier name is required").max(100, "Name too long"),
  sup_code: z.string().min(1, "Supplier code is required").max(20, "Code too long"),
  sup_add: z.string().min(1, "Address is required").max(200, "Address too long"),
  sup_city: z.string().min(1, "City is required").max(50, "City too long"),
  sup_mobile: z.string().min(10, "Mobile number must be at least 10 digits").max(15, "Mobile too long").regex(/^\d+$/, "Mobile must contain only digits"),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

const SupplierForm: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { sup_name: "", sup_code: "", sup_add: "", sup_city: "", sup_mobile: "" },
  });

  const onSubmit = async (data: SupplierFormData) => {
    setIsLoading(true);
    try {
      const response = await supplierApi.create({
        sup_name: data.sup_name,
        sup_code: data.sup_code,
        sup_add: data.sup_add,
        sup_city: data.sup_city,
        sup_mobile: data.sup_mobile,
        created_by: user?.user_name || "",
      });

      if (response.status === "success" || response.status === "ok") {
        toast({
          title: "Supplier created!",
          description: `${data.sup_name} has been added successfully.`,
        });
        form.reset();
      } else {
        toast({
          title: "Failed to create supplier",
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
          <h1 className="text-2xl font-bold text-foreground">Master Supplier</h1>
          <p className="text-muted-foreground">Add new suppliers</p>
        </div>
      </div>

      <Card className="max-w-2xl form-section">
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
            <Truck className="w-6 h-6 text-rose-600" />
          </div>
          <CardTitle>Add New Supplier</CardTitle>
          <CardDescription>Enter the details for the new supplier</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sup_name">Supplier Name *</Label>
                <Input
                  id="sup_name"
                  placeholder="Enter supplier name"
                  {...form.register("sup_name")}
                  className="h-11"
                />
                {form.formState.errors.sup_name && (
                  <p className="text-sm text-destructive">{form.formState.errors.sup_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sup_code">Supplier Code *</Label>
                <Input
                  id="sup_code"
                  placeholder="Enter supplier code"
                  {...form.register("sup_code")}
                  className="h-11"
                />
                {form.formState.errors.sup_code && (
                  <p className="text-sm text-destructive">{form.formState.errors.sup_code.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sup_add">Address *</Label>
              <Input
                id="sup_add"
                placeholder="Enter full address"
                {...form.register("sup_add")}
                className="h-11"
              />
              {form.formState.errors.sup_add && (
                <p className="text-sm text-destructive">{form.formState.errors.sup_add.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sup_city">City *</Label>
                <Input
                  id="sup_city"
                  placeholder="Enter city"
                  {...form.register("sup_city")}
                  className="h-11"
                />
                {form.formState.errors.sup_city && (
                  <p className="text-sm text-destructive">{form.formState.errors.sup_city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sup_mobile">Mobile *</Label>
                <Input
                  id="sup_mobile"
                  placeholder="Enter mobile number"
                  {...form.register("sup_mobile")}
                  className="h-11"
                />
                {form.formState.errors.sup_mobile && (
                  <p className="text-sm text-destructive">{form.formState.errors.sup_mobile.message}</p>
                )}
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2" disabled={isLoading}>
                <Plus className="w-4 h-4" />
                {isLoading ? "Creating..." : "Add Supplier"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierForm;
