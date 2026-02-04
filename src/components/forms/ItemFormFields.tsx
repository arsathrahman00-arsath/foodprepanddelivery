import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { itemApi } from "@/lib/api";

const schema = z.object({
  item_name: z.string().min(1, "Required").max(100),
  cat_name: z.string().min(1, "Required").max(100),
  unit_short: z.string().min(1, "Required").max(10),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
}

const ItemFormFields: React.FC<Props> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { item_name: "", cat_name: "", unit_short: "" },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await itemApi.create({
        item_name: data.item_name,
        cat_name: data.cat_name,
        unit_short: data.unit_short,
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
        <Label htmlFor="item_name">Item Name *</Label>
        <Input
          id="item_name"
          placeholder="Enter item name"
          {...form.register("item_name")}
          className="h-10"
        />
        {form.formState.errors.item_name && (
          <p className="text-xs text-destructive">{form.formState.errors.item_name.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cat_name">Category Name *</Label>
          <Input
            id="cat_name"
            placeholder="Enter category name"
            {...form.register("cat_name")}
            className="h-10"
          />
          {form.formState.errors.cat_name && (
            <p className="text-xs text-destructive">{form.formState.errors.cat_name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit_short">Unit Short *</Label>
          <Input
            id="unit_short"
            placeholder="e.g., kg, g, l"
            {...form.register("unit_short")}
            className="h-10"
          />
          {form.formState.errors.unit_short && (
            <p className="text-xs text-destructive">{form.formState.errors.unit_short.message}</p>
          )}
        </div>
      </div>
      <div className="pt-2">
        <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
          <Plus className="w-4 h-4" />
          {isLoading ? "Creating..." : "Add Item"}
        </Button>
      </div>
    </form>
  );
};

export default ItemFormFields;
