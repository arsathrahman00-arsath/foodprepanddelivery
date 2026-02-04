import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UtensilsCrossed, Plus, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { recipeApi } from "@/lib/api";

const recipeSchema = z.object({
  recipe_name: z.string().min(1, "Recipe name is required").max(100, "Name too long"),
  recipe_code: z.string().min(1, "Recipe code is required").max(20, "Code too long"),
  recipe_type: z.string().min(1, "Recipe type is required").max(50, "Type too long"),
  item_name: z.string().min(1, "Item name is required").max(100, "Item name too long"),
  item_code: z.string().min(1, "Item code is required").max(20, "Item code too long"),
  cat_code: z.string().min(1, "Category code is required").max(20, "Category code too long"),
  unit_short: z.string().min(1, "Unit short is required").max(10, "Unit short too long"),
  req_qty: z.string().min(1, "Required quantity is required").regex(/^\d+(\.\d+)?$/, "Must be a valid number"),
});

type RecipeFormData = z.infer<typeof recipeSchema>;

const RecipeForm: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      recipe_name: "",
      recipe_code: "",
      recipe_type: "",
      item_name: "",
      item_code: "",
      cat_code: "",
      unit_short: "",
      req_qty: "",
    },
  });

  const onSubmit = async (data: RecipeFormData) => {
    setIsLoading(true);
    try {
      const response = await recipeApi.create({
        recipe_name: data.recipe_name,
        recipe_code: data.recipe_code,
        recipe_type: data.recipe_type,
        item_name: data.item_name,
        item_code: data.item_code,
        cat_code: data.cat_code,
        unit_short: data.unit_short,
        req_qty: data.req_qty,
        created_by: user?.user_name || "",
      });

      if (response.status === "success" || response.status === "ok") {
        toast({
          title: "Recipe created!",
          description: `${data.recipe_name} has been added successfully.`,
        });
        form.reset();
      } else {
        toast({
          title: "Failed to create recipe",
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
          <h1 className="text-2xl font-bold text-foreground">Master Recipe</h1>
          <p className="text-muted-foreground">Add new recipes</p>
        </div>
      </div>

      <Card className="max-w-3xl form-section">
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
            <UtensilsCrossed className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle>Add New Recipe</CardTitle>
          <CardDescription>Enter all the details for the new recipe</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Recipe Details */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Recipe Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipe_name">Recipe Name *</Label>
                  <Input
                    id="recipe_name"
                    placeholder="Enter recipe name"
                    {...form.register("recipe_name")}
                    className="h-11"
                  />
                  {form.formState.errors.recipe_name && (
                    <p className="text-sm text-destructive">{form.formState.errors.recipe_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipe_code">Recipe Code *</Label>
                  <Input
                    id="recipe_code"
                    placeholder="Enter recipe code"
                    {...form.register("recipe_code")}
                    className="h-11"
                  />
                  {form.formState.errors.recipe_code && (
                    <p className="text-sm text-destructive">{form.formState.errors.recipe_code.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipe_type">Recipe Type *</Label>
                  <Input
                    id="recipe_type"
                    placeholder="e.g., Breakfast"
                    {...form.register("recipe_type")}
                    className="h-11"
                  />
                  {form.formState.errors.recipe_type && (
                    <p className="text-sm text-destructive">{form.formState.errors.recipe_type.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Item Details */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Item Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_name">Item Name *</Label>
                  <Input
                    id="item_name"
                    placeholder="Enter item name"
                    {...form.register("item_name")}
                    className="h-11"
                  />
                  {form.formState.errors.item_name && (
                    <p className="text-sm text-destructive">{form.formState.errors.item_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item_code">Item Code *</Label>
                  <Input
                    id="item_code"
                    placeholder="Enter item code"
                    {...form.register("item_code")}
                    className="h-11"
                  />
                  {form.formState.errors.item_code && (
                    <p className="text-sm text-destructive">{form.formState.errors.item_code.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quantity & Category */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Quantity & Category</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cat_code">Category Code *</Label>
                  <Input
                    id="cat_code"
                    placeholder="Enter category code"
                    {...form.register("cat_code")}
                    className="h-11"
                  />
                  {form.formState.errors.cat_code && (
                    <p className="text-sm text-destructive">{form.formState.errors.cat_code.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_short">Unit Short *</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="req_qty">Required Quantity *</Label>
                  <Input
                    id="req_qty"
                    placeholder="Enter quantity"
                    {...form.register("req_qty")}
                    className="h-11"
                  />
                  {form.formState.errors.req_qty && (
                    <p className="text-sm text-destructive">{form.formState.errors.req_qty.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2" disabled={isLoading}>
                <Plus className="w-4 h-4" />
                {isLoading ? "Creating..." : "Add Recipe"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecipeForm;
