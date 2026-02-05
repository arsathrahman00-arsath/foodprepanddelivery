 import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
 import { zodResolver } from "@hookform/resolvers/zod";
 import { z } from "zod";
 import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Calendar } from "@/components/ui/calendar";
 import { Input } from "@/components/ui/input";
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
 import { deliveryRequirementApi, masjidListApi } from "@/lib/api";
 import { cn } from "@/lib/utils";
 
const entrySchema = z.object({
  masjid_name: z.string().min(1, "Please select a mosque"),
  req_qty: z.string().min(1, "Required quantity is required"),
});

 const formSchema = z.object({
   req_date: z.date({
     required_error: "Please select a date",
   }),
  entries: z.array(entrySchema).min(1, "At least one entry is required"),
 });
 
 type FormData = z.infer<typeof formSchema>;
 
 interface MasjidOption {
   masjid_name: string;
   masjid_code?: number;
 }
 
 interface RequirementFormFieldsProps {
   onSuccess?: () => void;
   isModal?: boolean;
 }
 
 const RequirementFormFields: React.FC<RequirementFormFieldsProps> = ({
   onSuccess,
   isModal = false,
 }) => {
   const { toast } = useToast();
   const { user } = useAuth();
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [masjidList, setMasjidList] = useState<MasjidOption[]>([]);
   const [isLoadingData, setIsLoadingData] = useState(true);
 
   const form = useForm<FormData>({
     resolver: zodResolver(formSchema),
     defaultValues: {
      entries: [{ masjid_name: "", req_qty: "" }],
     },
   });
 
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "entries",
  });

   useEffect(() => {
     const fetchMasjidList = async () => {
       try {
         const response = await masjidListApi.getAll();
         if (response.status === "success" && response.data) {
          const masjidsWithCodes = response.data.map((item: any) => ({
             masjid_name: item.masjid_name,
            masjid_code: item.masjid_code,
           }));
           setMasjidList(masjidsWithCodes);
         }
       } catch (error) {
         console.error("Failed to fetch masjid list:", error);
         toast({
           title: "Error",
           description: "Failed to load mosque list",
           variant: "destructive",
         });
       } finally {
         setIsLoadingData(false);
       }
     };
 
     fetchMasjidList();
   }, [toast]);
 
   const onSubmit = async (data: FormData) => {
     if (!user) {
       toast({
         title: "Error",
         description: "You must be logged in to create a requirement",
         variant: "destructive",
       });
       return;
     }
 
     setIsSubmitting(true);
     try {
       const formattedDate = format(data.req_date, "yyyy-MM-dd'T'00:00:00");
      
      // Submit all entries
      const promises = data.entries.map((entry) => {
        const selectedMasjid = masjidList.find(
          (m) => m.masjid_name === entry.masjid_name
        );
 
        return deliveryRequirementApi.create({
          req_date: formattedDate,
          masjid_name: entry.masjid_name,
          masjid_code: String(selectedMasjid?.masjid_code || ""),
          req_qty: entry.req_qty,
          created_by: user.user_name,
        });
       });
 
      const responses = await Promise.all(promises);
      const allSuccess = responses.every(
        (r) => r.status === "success" || r.status === "ok"
      );

      if (allSuccess) {
         toast({
           title: "Success",
          description: `${data.entries.length} requirement(s) created successfully`,
         });
        form.reset({ entries: [{ masjid_name: "", req_qty: "" }] });
         onSuccess?.();
       } else {
        throw new Error("Some requirements failed to create");
       }
     } catch (error: any) {
       toast({
         title: "Error",
        description: error.message || "Failed to create requirements",
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
           name="req_date"
           render={({ field }) => (
             <FormItem className="flex flex-col">
               <FormLabel>Requirement Date</FormLabel>
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
 
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base">Mosque Entries</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ masjid_name: "", req_qty: "" })}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
          </div>
 
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex gap-3 items-start p-3 border rounded-lg bg-muted/30"
            >
              <div className="flex-1 grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name={`entries.${index}.masjid_name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={index > 0 ? "sr-only" : ""}>
                        Mosque Name
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select mosque" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-50 bg-popover">
                          {masjidList.map((masjid) => (
                            <SelectItem
                              key={masjid.masjid_name}
                              value={masjid.masjid_name}
                            >
                              {masjid.masjid_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`entries.${index}.req_qty`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={index > 0 ? "sr-only" : ""}>
                        Required Qty
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Qty"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
 
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
            `Create ${fields.length} Requirement${fields.length > 1 ? "s" : ""}`
           )}
         </Button>
       </form>
     </Form>
   );
 };
 
 export default RequirementFormFields;