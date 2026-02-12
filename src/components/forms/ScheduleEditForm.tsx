import React, { useState, useEffect } from "react";
import { Save, Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { deliveryScheduleApi, recipeTypeListApi } from "@/lib/api";

interface Props {
  onSuccess?: () => void;
  isModal?: boolean;
  editData?: any;
}

const ScheduleEditForm: React.FC<Props> = ({ onSuccess, editData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [recipeTypes, setRecipeTypes] = useState<any[]>([]);

  const [schdDate, setSchdDate] = useState<Date | undefined>(
    editData?.schd_date ? new Date(editData.schd_date) : undefined
  );
  const [recipeType, setRecipeType] = useState(editData?.recipe_type || "");

  useEffect(() => {
    recipeTypeListApi.getAll().then((res) => {
      if (res.status === "success" || res.status === "ok") setRecipeTypes(res.data || []);
    }).finally(() => setLoadingDropdowns(false));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schdDate || !recipeType) { setError("All fields are required"); return; }
    setIsLoading(true);
    setError(null);
    try {
      const selectedRecipe = recipeTypes.find((r: any) => r.recipe_type === recipeType);
      const response = await deliveryScheduleApi.update({
        schd_date: format(schdDate, "yyyy-MM-dd'T'00:00:00"),
        recipe_type: recipeType,
        recipe_code: String(selectedRecipe?.recipe_code || editData?.recipe_code || ""),
      });
      if (response.status === "success" || response.status === "ok") { onSuccess?.(); }
      else { setError(response.message || "Failed to update"); }
    } catch { setError("Unable to connect to server"); }
    finally { setIsLoading(false); }
  };

  if (loadingDropdowns) return <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
      <div className="space-y-2">
        <Label>Schedule Date *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className={cn("w-full pl-3 text-left font-normal h-10", !schdDate && "text-muted-foreground")}>
              {schdDate ? format(schdDate, "PPP") : "Pick a date"}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50" align="start">
            <Calendar mode="single" selected={schdDate} onSelect={setSchdDate} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-2">
        <Label>Recipe Type *</Label>
        <Select value={recipeType} onValueChange={setRecipeType}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Select recipe type" /></SelectTrigger>
          <SelectContent className="bg-background border z-50">
            {recipeTypes.map((rt: any) => <SelectItem key={rt.recipe_type} value={rt.recipe_type}>{rt.recipe_type}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="bg-gradient-warm hover:opacity-90 gap-2 w-full" disabled={isLoading}>
        <Save className="w-4 h-4" />{isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
};

export default ScheduleEditForm;
