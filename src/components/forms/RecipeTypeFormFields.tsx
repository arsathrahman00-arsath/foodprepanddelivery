import React, { useState } from "react";
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

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { recipe_type: "" },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await recipeTypeApi.create({
        recipe_type: data.recipe_type,
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
