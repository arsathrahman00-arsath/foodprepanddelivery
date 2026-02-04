import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { recipeApi } from "@/lib/api";

const schema = z.object({
  recipe_name: z.string().min(1, "Required").max(100),
  recipe_type: z.string().min(1, "Required").max(50),
  item_name: z.string().min(1, "Required").max(100),
  unit_short: z.string().min(1, "Required").max(10),
  req_qty: z.string().min(1, "Required").regex(/^\d+(\.\d+)?$/, "Must be a number"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
}

const RecipeFormFields: React.FC<Props> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      recipe_name: "",
      recipe_type: "",
      item_name: "",
      unit_short: "",
      req_qty: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await recipeApi.create({
        recipe_name: data.recipe_name,
        recipe_type: data.recipe_type,
        item_name: data.item_name,
        unit_short: data.unit_short,
        req_qty: data.req_qty,
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
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recipe_name">Recipe Name *</Label>
          <Input id="recipe_name" placeholder="Recipe name" {...form.register("recipe_name")} className="h-10" />
          {form.formState.errors.recipe_name && <p className="text-xs text-destructive">{form.formState.errors.recipe_name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipe_type">Recipe Type *</Label>
          <Input id="recipe_type" placeholder="e.g., Breakfast" {...form.register("recipe_type")} className="h-10" />
          {form.formState.errors.recipe_type && <p className="text-xs text-destructive">{form.formState.errors.recipe_type.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="item_name">Item Name *</Label>
        <Input id="item_name" placeholder="Item name" {...form.register("item_name")} className="h-10" />
        {form.formState.errors.item_name && <p className="text-xs text-destructive">{form.formState.errors.item_name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="unit_short">Unit *</Label>
          <Input id="unit_short" placeholder="e.g., kg" {...form.register("unit_short")} className="h-10" />
          {form.formState.errors.unit_short && <p className="text-xs text-destructive">{form.formState.errors.unit_short.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="req_qty">Required Quantity *</Label>
          <Input id="req_qty" placeholder="Quantity" {...form.register("req_qty")} className="h-10" />
          {form.formState.errors.req_qty && <p className="text-xs text-destructive">{form.formState.errors.req_qty.message}</p>}
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
          <Plus className="w-4 h-4" />
          {isLoading ? "Creating..." : "Add Recipe"}
        </Button>
      </div>
    </form>
  );
};

export default RecipeFormFields;
