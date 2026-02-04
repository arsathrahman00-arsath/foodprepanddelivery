import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supplierApi } from "@/lib/api";

const schema = z.object({
  sup_name: z.string().min(1, "Required").max(100),
  sup_add: z.string().min(1, "Required").max(200),
  sup_city: z.string().min(1, "Required").max(50),
  sup_mobile: z.string().min(10, "Min 10 digits").max(15).regex(/^\d+$/, "Digits only"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
}

const SupplierFormFields: React.FC<Props> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sup_name: "", sup_add: "", sup_city: "", sup_mobile: "" },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await supplierApi.create({
        sup_name: data.sup_name,
        sup_add: data.sup_add,
        sup_city: data.sup_city,
        sup_mobile: data.sup_mobile,
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
        <Label htmlFor="sup_name">Supplier Name *</Label>
        <Input
          id="sup_name"
          placeholder="Enter supplier name"
          {...form.register("sup_name")}
          className="h-10"
        />
        {form.formState.errors.sup_name && (
          <p className="text-xs text-destructive">{form.formState.errors.sup_name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="sup_add">Address *</Label>
        <Input
          id="sup_add"
          placeholder="Enter address"
          {...form.register("sup_add")}
          className="h-10"
        />
        {form.formState.errors.sup_add && (
          <p className="text-xs text-destructive">{form.formState.errors.sup_add.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sup_city">City *</Label>
          <Input
            id="sup_city"
            placeholder="Enter city"
            {...form.register("sup_city")}
            className="h-10"
          />
          {form.formState.errors.sup_city && (
            <p className="text-xs text-destructive">{form.formState.errors.sup_city.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="sup_mobile">Mobile *</Label>
          <Input
            id="sup_mobile"
            placeholder="Enter mobile number"
            {...form.register("sup_mobile")}
            className="h-10"
          />
          {form.formState.errors.sup_mobile && (
            <p className="text-xs text-destructive">{form.formState.errors.sup_mobile.message}</p>
          )}
        </div>
      </div>
      <div className="pt-2">
        <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
          <Plus className="w-4 h-4" />
          {isLoading ? "Creating..." : "Add Supplier"}
        </Button>
      </div>
    </form>
  );
};

export default SupplierFormFields;
