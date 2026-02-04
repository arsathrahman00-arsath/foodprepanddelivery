import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, Plus, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { recipeTypeApi } from "@/lib/api";

const recipeTypeSchema = z.object({
  recipe_type: z.string().min(1, "Recipe type is required").max(50, "Type too long"),
  recipe_code: z.string().min(1, "Recipe code is required").max(20, "Code too long"),
});

type RecipeTypeFormData = z.infer<typeof recipeTypeSchema>;

const RecipeTypeForm: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RecipeTypeFormData>({
    resolver: zodResolver(recipeTypeSchema),
    defaultValues: { recipe_type: "", recipe_code: "" },
  });

  const onSubmit = async (data: RecipeTypeFormData) => {
    setIsLoading(true);
    try {
      const response = await recipeTypeApi.create({
        recipe_type: data.recipe_type,
        recipe_code: data.recipe_code,
        created_by: user?.user_name || "",
      });

      if (response.status === "success" || response.status === "ok") {
        toast({
          title: "Recipe type created!",
          description: `${data.recipe_type} has been added successfully.`,
        });
        form.reset();
      } else {
        toast({
          title: "Failed to create recipe type",
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
          <h1 className="text-2xl font-bold text-foreground">Recipe Type</h1>
          <p className="text-muted-foreground">Add new recipe types</p>
        </div>
      </div>

      <Card className="max-w-2xl form-section">
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center mb-3">
            <BookOpen className="w-6 h-6 text-cyan-600" />
          </div>
          <CardTitle>Add New Recipe Type</CardTitle>
          <CardDescription>Enter the details for the new recipe type</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipe_type">Recipe Type *</Label>
                <Input
                  id="recipe_type"
                  placeholder="e.g., Breakfast, Lunch, Dinner"
                  {...form.register("recipe_type")}
                  className="h-11"
                />
                {form.formState.errors.recipe_type && (
                  <p className="text-sm text-destructive">{form.formState.errors.recipe_type.message}</p>
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
            </div>

            <div className="pt-4">
              <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2" disabled={isLoading}>
                <Plus className="w-4 h-4" />
                {isLoading ? "Creating..." : "Add Recipe Type"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecipeTypeForm;
