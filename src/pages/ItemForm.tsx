import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, Plus, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { itemApi } from "@/lib/api";

const itemSchema = z.object({
  item_name: z.string().min(1, "Item name is required").max(100, "Name too long"),
  item_code: z.string().min(1, "Item code is required").max(20, "Code too long"),
  cat_name: z.string().min(1, "Category name is required").max(100, "Category name too long"),
  unit_short: z.string().min(1, "Unit short is required").max(10, "Unit short too long"),
});

type ItemFormData = z.infer<typeof itemSchema>;

const ItemForm: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: { item_name: "", item_code: "", cat_name: "", unit_short: "" },
  });

  const onSubmit = async (data: ItemFormData) => {
    setIsLoading(true);
    try {
      const response = await itemApi.create({
        item_name: data.item_name,
        item_code: data.item_code,
        cat_name: data.cat_name,
        unit_short: data.unit_short,
        created_by: user?.user_name || "",
      });

      if (response.status === "success" || response.status === "ok") {
        toast({
          title: "Item created!",
          description: `${data.item_name} has been added successfully.`,
        });
        form.reset();
      } else {
        toast({
          title: "Failed to create item",
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
          <h1 className="text-2xl font-bold text-foreground">Master Item</h1>
          <p className="text-muted-foreground">Add new inventory items</p>
        </div>
      </div>

      <Card className="max-w-2xl form-section">
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-amber-600" />
          </div>
          <CardTitle>Add New Item</CardTitle>
          <CardDescription>Enter the details for the new inventory item</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            </div>

            <div className="pt-4">
              <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2" disabled={isLoading}>
                <Plus className="w-4 h-4" />
                {isLoading ? "Creating..." : "Add Item"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ItemForm;
