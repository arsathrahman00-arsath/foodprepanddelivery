import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { itemApi, categoryUnitApi } from "@/lib/api";

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
  const [categories, setCategories] = useState<{ cat_name: string }[]>([]);
  const [units, setUnits] = useState<{ unit_short: string }[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { item_name: "", cat_name: "", unit_short: "" },
  });

  useEffect(() => {
    const loadDropdownData = async () => {
      setLoadingDropdowns(true);
      try {
        const response = await categoryUnitApi.getAll();
        if (response.status === "success" || response.status === "ok") {
          setCategories(response.data?.categories || []);
          setUnits(response.data?.units || []);
        }
      } catch (err) {
        console.error("Failed to load dropdown data:", err);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    loadDropdownData();
  }, []);

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
        reset();
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

  if (loadingDropdowns) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          {...register("item_name")}
          className="h-10"
        />
        {errors.item_name && (
          <p className="text-xs text-destructive">{errors.item_name.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cat_name">Category Name *</Label>
          <Select onValueChange={(value) => setValue("cat_name", value)} value={watch("cat_name")}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {categories.map((cat) => (
                <SelectItem key={cat.cat_name} value={cat.cat_name}>
                  {cat.cat_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.cat_name && (
            <p className="text-xs text-destructive">{errors.cat_name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit_short">Unit Short *</Label>
          <Select onValueChange={(value) => setValue("unit_short", value)} value={watch("unit_short")}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {units.map((unit) => (
                <SelectItem key={unit.unit_short} value={unit.unit_short}>
                  {unit.unit_short}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.unit_short && (
            <p className="text-xs text-destructive">{errors.unit_short.message}</p>
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
