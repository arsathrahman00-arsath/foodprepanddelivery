import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supplierApi, itemCategoryApi } from "@/lib/api";
import { alphabetOnly, toProperCase } from "@/lib/utils";

const schema = z.object({
  sup_name: z.string().min(1, "Required").max(100),
  sup_add: z.string().min(1, "Required").max(200),
  sup_city: z.string().min(1, "Required").max(50),
  sup_mobile: z.string().min(10, "Min 10 digits").max(15).regex(/^\d+$/, "Digits only"),
  cat_code: z.string().min(1, "Please select a category"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
}

interface CategoryOption {
  cat_code: number;
  cat_name: string;
}

const SupplierFormFields: React.FC<Props> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sup_name: "", sup_add: "", sup_city: "", sup_mobile: "", cat_code: "" },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [supRes, catRes] = await Promise.all([
          supplierApi.getAll(),
          itemCategoryApi.getAll(),
        ]);
        if (supRes.status === "success" || supRes.status === "ok") {
          setExistingNames(new Set((supRes.data || []).map((r: any) => r.sup_name?.toLowerCase())));
        }
        if ((catRes.status === "success" || catRes.status === "ok") && catRes.data) {
          setCategories(Array.isArray(catRes.data) ? catRes.data : []);
        }
      } catch {}
    };
    loadData();
  }, []);

  const onSubmit = async (data: FormData) => {
    if (existingNames.has(data.sup_name.trim().toLowerCase())) {
      setError(`Supplier "${data.sup_name.trim()}" already exists`);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const selectedCat = categories.find(c => String(c.cat_code) === data.cat_code);
      const response = await supplierApi.create({
        sup_name: toProperCase(data.sup_name.trim()),
        sup_add: toProperCase(data.sup_add.trim()),
        sup_city: toProperCase(data.sup_city.trim()),
        sup_mobile: data.sup_mobile,
        cat_code: data.cat_code,
        cat_name: selectedCat?.cat_name || "",
        created_by: user?.user_name || "",
      });

      if (response.status === "success" || response.status === "ok") {
        existingNames.add(data.sup_name.trim().toLowerCase());
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
          onKeyDown={alphabetOnly}
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
            onKeyDown={alphabetOnly}
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
      <div className="space-y-2">
        <Label htmlFor="cat_code">Category Name *</Label>
        <Select
          value={form.watch("cat_code")}
          onValueChange={(val) => form.setValue("cat_code", val, { shouldValidate: true })}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="z-[200] bg-popover">
            {categories.map((c) => (
              <SelectItem key={c.cat_code} value={String(c.cat_code)}>{c.cat_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.cat_code && (
          <p className="text-xs text-destructive">{form.formState.errors.cat_code.message}</p>
        )}
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
