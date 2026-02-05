 import React, { useEffect, useState } from "react";
 import { useForm } from "react-hook-form";
 import { zodResolver } from "@hookform/resolvers/zod";
 import { z } from "zod";
 import { format } from "date-fns";
 import { CalendarIcon, Loader2 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Calendar } from "@/components/ui/calendar";
 import {
   Form,
   FormControl,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
 } from "@/components/ui/form";
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
 import { useToast } from "@/hooks/use-toast";
 import { useAuth } from "@/contexts/AuthContext";
import { deliveryScheduleApi, recipeTypeListApi, ApiResponse } from "@/lib/api";
 import { cn } from "@/lib/utils";
 
 const formSchema = z.object({
   schd_date: z.date({
     required_error: "Please select a date",
   }),
   recipe_type: z.string().min(1, "Please select a recipe type"),
 });
 
 type FormData = z.infer<typeof formSchema>;
 
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
   isModal = false,
 }) => {
   const { toast } = useToast();
   const { user } = useAuth();
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [recipeTypes, setRecipeTypes] = useState<RecipeTypeOption[]>([]);
  const [existingSchedules, setExistingSchedules] = useState<ExistingSchedule[]>([]);
   const [isLoadingData, setIsLoadingData] = useState(true);
 
   const form = useForm<FormData>({
     resolver: zodResolver(formSchema),
     defaultValues: {
       recipe_type: "",
     },
   });
 
   useEffect(() => {
    const fetchData = async () => {
       try {
        const [recipeResponse, scheduleResponse] = await Promise.all([
          recipeTypeListApi.getAll(),
          deliveryScheduleApi.getAll(),
        ]);

        if (recipeResponse.status === "success" && recipeResponse.data) {
          const typesWithCodes = recipeResponse.data.map((item: any) => ({
             recipe_type: item.recipe_type,
            recipe_code: item.recipe_code,
           }));
           setRecipeTypes(typesWithCodes);
         }

        if (scheduleResponse.status === "success" && scheduleResponse.data) {
          setExistingSchedules(scheduleResponse.data);
        }
       } catch (error) {
        console.error("Failed to fetch data:", error);
         toast({
           title: "Error",
          description: "Failed to load form data",
           variant: "destructive",
         });
       } finally {
         setIsLoadingData(false);
       }
     };
 
    fetchData();
   }, [toast]);
 
  const checkDuplicate = (date: Date, recipeType: string): boolean => {
    const formattedDate = format(date, "yyyy-MM-dd");
    return existingSchedules.some((schedule) => {
      const existingDate = schedule.schd_date.split("T")[0];
      return existingDate === formattedDate && 
             schedule.recipe_type.trim().toLowerCase() === recipeType.trim().toLowerCase();
    });
  };

   const onSubmit = async (data: FormData) => {
     if (!user) {
       toast({
         title: "Error",
         description: "You must be logged in to create a schedule",
         variant: "destructive",
       });
       return;
     }
 
    // Check for duplicate
    if (checkDuplicate(data.schd_date, data.recipe_type)) {
      toast({
        title: "Duplicate Entry",
        description: `This recipe is already scheduled for ${format(data.schd_date, "PPP")}`,
        variant: "destructive",
      });
      return;
    }

     setIsSubmitting(true);
     try {
       const selectedRecipe = recipeTypes.find(
         (r) => r.recipe_type === data.recipe_type
       );
 
       const formattedDate = format(data.schd_date, "yyyy-MM-dd'T'00:00:00");
 
       const response = await deliveryScheduleApi.create({
         schd_date: formattedDate,
         recipe_type: data.recipe_type,
         recipe_code: String(selectedRecipe?.recipe_code || ""),
         created_by: user.user_name,
       });
 
       if (response.status === "success" || response.status === "ok") {
        // Add to existing schedules to prevent duplicate in same session
        setExistingSchedules((prev) => [
          ...prev,
          { schd_date: formattedDate, recipe_type: data.recipe_type },
        ]);
         toast({
           title: "Success",
           description: "Schedule created successfully",
         });
         form.reset();
         onSuccess?.();
       } else {
         throw new Error(response.message || "Failed to create schedule");
       }
     } catch (error: any) {
       toast({
         title: "Error",
         description: error.message || "Failed to create schedule",
         variant: "destructive",
       });
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
     <Form {...form}>
       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
         <FormField
           control={form.control}
           name="schd_date"
           render={({ field }) => (
             <FormItem className="flex flex-col">
               <FormLabel>Schedule Date</FormLabel>
               <Popover>
                 <PopoverTrigger asChild>
                   <FormControl>
                     <Button
                       variant="outline"
                       className={cn(
                         "w-full pl-3 text-left font-normal",
                         !field.value && "text-muted-foreground"
                       )}
                     >
                       {field.value ? (
                         format(field.value, "PPP")
                       ) : (
                         <span>Pick a date</span>
                       )}
                       <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                     </Button>
                   </FormControl>
                 </PopoverTrigger>
                 <PopoverContent className="w-auto p-0 z-50" align="start">
                   <Calendar
                     mode="single"
                     selected={field.value}
                     onSelect={field.onChange}
                     initialFocus
                     className={cn("p-3 pointer-events-auto")}
                   />
                 </PopoverContent>
               </Popover>
               <FormMessage />
             </FormItem>
           )}
         />
 
         <FormField
           control={form.control}
           name="recipe_type"
           render={({ field }) => (
             <FormItem>
               <FormLabel>Recipe Type</FormLabel>
               <Select onValueChange={field.onChange} value={field.value}>
                 <FormControl>
                   <SelectTrigger>
                     <SelectValue placeholder="Select recipe type" />
                   </SelectTrigger>
                 </FormControl>
                 <SelectContent className="z-50 bg-popover">
                   {recipeTypes.map((recipe) => (
                     <SelectItem key={recipe.recipe_type} value={recipe.recipe_type}>
                       {recipe.recipe_type}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
               <FormMessage />
             </FormItem>
           )}
         />
 
         <Button
           type="submit"
           className="w-full bg-gradient-warm hover:opacity-90"
           disabled={isSubmitting}
         >
           {isSubmitting ? (
             <>
               <Loader2 className="w-4 h-4 mr-2 animate-spin" />
               Creating...
             </>
           ) : (
             "Create Schedule"
           )}
         </Button>
       </form>
     </Form>
   );
 };
 
 export default ScheduleFormFields;