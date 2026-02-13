import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { deliveryScheduleApi, recipeTypeListApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RecipeTypeOption {
  recipe_type: string;
  recipe_code?: number;
}

interface ExistingSchedule {
  schd_date: string;
  recipe_type: string;
}

interface ScheduleFormFieldsProps {
  onSuccess?: () => void;
  isModal?: boolean;
}

const ScheduleFormFields: React.FC<ScheduleFormFieldsProps> = ({
  onSuccess,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recipeTypes, setRecipeTypes] = useState<RecipeTypeOption[]>([]);
  const [existingSchedules, setExistingSchedules] = useState<ExistingSchedule[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [recipeType, setRecipeType] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipeResponse, scheduleResponse] = await Promise.all([
          recipeTypeListApi.getAll(),
          deliveryScheduleApi.getAll(),
        ]);

        if (recipeResponse.status === "success" && recipeResponse.data) {
          setRecipeTypes(recipeResponse.data.map((item: any) => ({
            recipe_type: item.recipe_type,
            recipe_code: item.recipe_code,
          })));
        }

        if (scheduleResponse.status === "success" && scheduleResponse.data) {
          setExistingSchedules(scheduleResponse.data);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ title: "Error", description: "Failed to load form data", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, "yyyy-MM-dd");
    const exists = selectedDates.some(d => format(d, "yyyy-MM-dd") === dateStr);
    if (exists) {
      setSelectedDates(prev => prev.filter(d => format(d, "yyyy-MM-dd") !== dateStr));
    } else {
      setSelectedDates(prev => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
    }
  };

  const toggleDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    setSelectedDates(prev => prev.filter(d => format(d, "yyyy-MM-dd") !== dateStr));
  };

  const checkDuplicate = (date: Date, rt: string): boolean => {
    const formattedDate = format(date, "yyyy-MM-dd");
    return existingSchedules.some((schedule) => {
      const existingDate = schedule.schd_date.split("T")[0];
      return existingDate === formattedDate &&
        schedule.recipe_type.trim().toLowerCase() === rt.trim().toLowerCase();
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      return;
    }

    if (selectedDates.length === 0 || !recipeType) {
      toast({ title: "Validation Error", description: "Please select at least one date and a recipe type", variant: "destructive" });
      return;
    }

    // Check for duplicates
    for (const date of selectedDates) {
      if (checkDuplicate(date, recipeType)) {
        toast({
          title: "Duplicate Entry",
          description: `"${recipeType}" is already scheduled for ${format(date, "PPP")}`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const selectedRecipe = recipeTypes.find(r => r.recipe_type === recipeType);
      const results = await Promise.all(
        selectedDates.map(date => {
          const formattedDate = format(date, "yyyy-MM-dd'T'00:00:00");
          return deliveryScheduleApi.create({
            schd_date: formattedDate,
            recipe_type: recipeType,
            recipe_code: String(selectedRecipe?.recipe_code || ""),
            created_by: user.user_name,
          });
        })
      );

      const allSuccess = results.every(r => r.status === "success" || r.status === "ok");
      if (allSuccess) {
        selectedDates.forEach(date => {
          setExistingSchedules(prev => [...prev, {
            schd_date: format(date, "yyyy-MM-dd'T'00:00:00"),
            recipe_type: recipeType,
          }]);
        });
        toast({ title: "Success", description: `${selectedDates.length} schedule(s) created successfully` });
        setSelectedDates([]);
        setRecipeType("");
        onSuccess?.();
      } else {
        throw new Error("Some schedules failed to create");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create schedule", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading form data...</span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-sm">Schedule Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn("w-full pl-3 text-left font-normal h-9 text-xs", selectedDates.length === 0 && "text-muted-foreground")}
              >
                {selectedDates.length > 0
                  ? selectedDates.map(d => format(d, "dd MMM yyyy")).join(", ")
                  : "Pick dates"}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar
                mode="single"
                selected={undefined}
                onSelect={handleDateSelect}
                modifiers={{ selected: selectedDates }}
                modifiersStyles={{ selected: { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" } }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Recipe Type *</Label>
          <Select value={recipeType} onValueChange={setRecipeType}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select recipe" /></SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              {recipeTypes.map((recipe) => (
                <SelectItem key={recipe.recipe_type} value={recipe.recipe_type}>{recipe.recipe_type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedDates.length > 0 && (
        <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
          <Label className="text-xs text-muted-foreground">Selected Dates</Label>
          <div className="space-y-1">
            {selectedDates.map(date => (
              <div key={format(date, "yyyy-MM-dd")} className="flex items-center gap-2">
                <Checkbox
                  checked={true}
                  onCheckedChange={() => toggleDate(date)}
                />
                <span className="text-sm">{format(date, "dd MMM yyyy")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button type="submit" className="w-full bg-gradient-warm hover:opacity-90" disabled={isSubmitting}>
        {isSubmitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
        ) : (
          `Create ${selectedDates.length || ""} Schedule(s)`
        )}
      </Button>
    </form>
  );
};

export default ScheduleFormFields;
