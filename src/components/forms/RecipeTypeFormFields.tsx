import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { recipeTypeApi } from "@/lib/api";

const schema = z.object({
  recipe_type: z.string().min(1, "Required").max(50),
  recipe_perkg: z.string().min(1, "Required"),
  recipe_totpkt: z.string().min(1, "Required"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
}

const RecipeTypeFormFields: React.FC<Props> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { recipe_type: "", recipe_perkg: "", recipe_totpkt: "" },
  });

  useEffect(() => {
    const loadExisting = async () => {
      try {
        const res = await recipeTypeApi.getAll();
        if (res.status === "success" || res.status === "ok") {
          setExistingNames(new Set((res.data || []).map((r: any) => r.recipe_type?.toLowerCase())));
        }
      } catch {}
    };
    loadExisting();
  }, []);

  const onSubmit = async (data: FormData) => {
    if (existingNames.has(data.recipe_type.trim().toLowerCase())) {
      setError(`Recipe Type "${data.recipe_type.trim()}" already exists`);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await recipeTypeApi.create({
        recipe_type: data.recipe_type,
        recipe_perkg: data.recipe_perkg,
        recipe_totpkt: data.recipe_totpkt,
        created_by: user?.user_name || "",
      });

      if (response.status === "success" || response.status === "ok") {
        existingNames.add(data.recipe_type.trim().toLowerCase());
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
        <Label htmlFor="recipe_type">Recipe Type *</Label>
        <Input
          id="recipe_type"
          placeholder="e.g., Breakfast, Lunch"
          {...form.register("recipe_type")}
          className="h-10"
        />
        {form.formState.errors.recipe_type && (
          <p className="text-xs text-destructive">{form.formState.errors.recipe_type.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recipe_perkg">Recipe per kg *</Label>
          <Input
            id="recipe_perkg"
            type="number"
            step="0.01"
            min="0"
            placeholder="Enter per kg value"
            {...form.register("recipe_perkg")}
            className="h-10"
          />
          {form.formState.errors.recipe_perkg && (
            <p className="text-xs text-destructive">{form.formState.errors.recipe_perkg.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipe_totpkt">Recipe tot pkt *</Label>
          <Input
            id="recipe_totpkt"
            type="number"
            step="1"
            min="0"
            placeholder="Enter total packets"
            {...form.register("recipe_totpkt")}
            className="h-10"
          />
          {form.formState.errors.recipe_totpkt && (
            <p className="text-xs text-destructive">{form.formState.errors.recipe_totpkt.message}</p>
          )}
        </div>
      </div>
      <div className="pt-2">
        <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
          <Plus className="w-4 h-4" />
          {isLoading ? "Creating..." : "Add Recipe Type"}
        </Button>
      </div>
    </form>
  );
};

export default RecipeTypeFormFields;
