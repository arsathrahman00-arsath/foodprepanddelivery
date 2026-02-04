import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tag, Plus, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { itemCategoryApi } from "@/lib/api";

const categorySchema = z.object({
  cat_name: z.string().min(1, "Category name is required").max(100, "Name too long"),
  cat_code: z.string().min(1, "Category code is required").max(20, "Code too long"),
});

type CategoryFormData = z.infer<typeof categorySchema>;

const ItemCategoryForm: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { cat_name: "", cat_code: "" },
  });

  const onSubmit = async (data: CategoryFormData) => {
    setIsLoading(true);
    try {
      const response = await itemCategoryApi.create({
        cat_name: data.cat_name,
        cat_code: data.cat_code,
        created_by: user?.user_name || "",
      });

      if (response.status === "success" || response.status === "ok") {
        toast({
          title: "Category created!",
          description: `${data.cat_name} has been added successfully.`,
        });
        form.reset();
      } else {
        toast({
          title: "Failed to create category",
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
          <h1 className="text-2xl font-bold text-foreground">Item Category</h1>
          <p className="text-muted-foreground">Add new item categories</p>
        </div>
      </div>

      <Card className="max-w-2xl form-section">
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <Tag className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Add New Category</CardTitle>
          <CardDescription>Enter the details for the new item category</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cat_name">Category Name *</Label>
                <Input
                  id="cat_name"
                  placeholder="Enter category name"
                  {...form.register("cat_name")}
                  className="h-11"
                />
                {form.formState.errors.cat_name && (
                  <p className="text-sm text-destructive">{form.formState.errors.cat_name.message}</p>
                )}
              </div>

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
            </div>

            <div className="pt-4">
              <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2" disabled={isLoading}>
                <Plus className="w-4 h-4" />
                {isLoading ? "Creating..." : "Add Category"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ItemCategoryForm;
