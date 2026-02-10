import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { unitApi } from "@/lib/api";

const schema = z.object({
  unit_name: z.string().min(1, "Required").max(50),
  unit_short: z.string().min(1, "Required").max(10),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
}

const UnitFormFields: React.FC<Props> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { unit_name: "", unit_short: "" },
  });

  useEffect(() => {
    const loadExisting = async () => {
      try {
        const res = await unitApi.getAll();
        if (res.status === "success" || res.status === "ok") {
          setExistingNames(new Set((res.data || []).map((r: any) => r.unit_name?.toLowerCase())));
        }
      } catch {}
    };
    loadExisting();
  }, []);

  const onSubmit = async (data: FormData) => {
    if (existingNames.has(data.unit_name.trim().toLowerCase())) {
      setError(`Unit "${data.unit_name.trim()}" already exists`);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await unitApi.create({
        unit_name: data.unit_name,
        unit_short: data.unit_short,
        created_by: user?.user_name || "",
      });

      if (response.status === "success" || response.status === "ok") {
        existingNames.add(data.unit_name.trim().toLowerCase());
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
        <Label htmlFor="unit_name">Unit Name *</Label>
        <Input
          id="unit_name"
          placeholder="e.g., Kilogram"
          {...form.register("unit_name")}
          className="h-10"
        />
        {form.formState.errors.unit_name && (
          <p className="text-xs text-destructive">{form.formState.errors.unit_name.message}</p>
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
      <div className="pt-2">
        <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
          <Plus className="w-4 h-4" />
          {isLoading ? "Creating..." : "Add Unit"}
        </Button>
      </div>
    </form>
  );
};

export default UnitFormFields;
