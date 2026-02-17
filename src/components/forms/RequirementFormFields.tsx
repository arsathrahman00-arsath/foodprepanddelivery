import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, eachDayOfInterval } from "date-fns";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { deliveryRequirementApi, masjidListApi } from "@/lib/api";
import { cn, numericOnly } from "@/lib/utils";

const entrySchema = z.object({
  masjid_name: z.string().min(1, "Please select a mosque"),
  req_qty: z.string().min(1, "Required quantity is required"),
});

const formSchema = z.object({
  req_date_from: z.date({ required_error: "Please select a start date" }),
  req_date_to: z.date({ required_error: "Please select an end date" }),
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
  const [existingRecords, setExistingRecords] = useState<{ req_date: string; masjid_name: string }[]>([]);

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

  const watchDateFrom = form.watch("req_date_from");
  const watchDateTo = form.watch("req_date_to");
  const watchEntries = form.watch("entries");

  // Auto-populate all mosques when dates are selected
  useEffect(() => {
    if (watchDateFrom && watchDateTo && masjidList.length > 0) {
      const currentEntries = form.getValues("entries");
      // Only auto-populate if there's just the default empty entry
      const isDefault = currentEntries.length === 1 && !currentEntries[0].masjid_name && !currentEntries[0].req_qty;
      if (isDefault) {
        form.setValue("entries", masjidList.map(m => ({ masjid_name: m.masjid_name, req_qty: "" })));
      }
    }
  }, [watchDateFrom, watchDateTo, masjidList, form]);

  const dateRange = watchDateFrom && watchDateTo && watchDateTo >= watchDateFrom
    ? eachDayOfInterval({ start: watchDateFrom, end: watchDateTo })
    : [];

  const validEntries = watchEntries?.filter(e => e.masjid_name && e.req_qty) || [];
  const generatedRecords = dateRange.flatMap(date =>
    validEntries.map(entry => ({
      date,
      masjid_name: entry.masjid_name,
      req_qty: entry.req_qty,
    }))
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [masjidResponse, reqResponse] = await Promise.all([
          masjidListApi.getAll(),
          deliveryRequirementApi.getAll(),
        ]);
        if (masjidResponse.status === "success" && masjidResponse.data) {
          setMasjidList(masjidResponse.data.map((item: any) => ({
            masjid_name: item.masjid_name,
            masjid_code: item.masjid_code,
          })));
        }
        if ((reqResponse.status === "success" || reqResponse.status === "ok") && reqResponse.data) {
          setExistingRecords(reqResponse.data.map((item: any) => ({
            req_date: item.req_date,
            masjid_name: item.masjid_name?.toLowerCase(),
          })));
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

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create a requirement", variant: "destructive" });
      return;
    }

    const dates = eachDayOfInterval({ start: data.req_date_from, end: data.req_date_to });
    const entries = data.entries.filter(e => e.masjid_name && e.req_qty);

    if (entries.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one complete mosque entry", variant: "destructive" });
      return;
    }

    // Check for duplicates against existing records
    const duplicates = dates.flatMap(date =>
      entries.filter(entry =>
        existingRecords.some(rec =>
          rec.masjid_name === entry.masjid_name.toLowerCase() &&
          rec.req_date?.startsWith(format(date, "yyyy-MM-dd"))
        )
      ).map(entry => `${entry.masjid_name} on ${format(date, "dd MMM yyyy")}`)
    );

    if (duplicates.length > 0) {
      toast({
        title: "Duplicate Found",
        description: `Mosque Name with date already exist: ${duplicates[0]}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const promises = dates.flatMap(date =>
        entries.map(entry => {
          const selectedMasjid = masjidList.find(m => m.masjid_name === entry.masjid_name);
          return deliveryRequirementApi.create({
            req_date: format(date, "yyyy-MM-dd'T'00:00:00"),
            masjid_name: entry.masjid_name,
            masjid_code: String(selectedMasjid?.masjid_code || ""),
            req_qty: entry.req_qty,
            created_by: user.user_name,
          });
        })
      );

      const responses = await Promise.all(promises);
      const allSuccess = responses.every(r => r.status === "success" || r.status === "ok");

      if (allSuccess) {
        toast({ title: "Success", description: `${responses.length} requirement(s) created successfully` });
        form.reset({ entries: [{ masjid_name: "", req_qty: "" }] });
        onSuccess?.();
      } else {
        throw new Error("Some requirements failed to create");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create requirements", variant: "destructive" });
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="req_date_from"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Requirement From</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "dd MMM yyyy") : "From date"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="req_date_to"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Requirement To</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "dd MMM yyyy") : "To date"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => watchDateFrom ? date < watchDateFrom : false}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base">Mosque Entries</FormLabel>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ masjid_name: "", req_qty: "" })} className="gap-1">
              <Plus className="w-4 h-4" /> Add Entry
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-start p-3 border rounded-lg bg-muted/30">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name={`entries.${index}.masjid_name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={index > 0 ? "sr-only" : ""}>Mosque Name</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select mosque" /></SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-50 bg-popover">
                          {masjidList
                            .filter(masjid => {
                              const usedNames = fields
                                .map((_, i) => form.getValues(`entries.${i}.masjid_name`))
                                .filter((name, i) => i !== index && name);
                              return !usedNames.includes(masjid.masjid_name) || masjid.masjid_name === field.value;
                            })
                            .map((masjid) => (
                              <SelectItem key={masjid.masjid_name} value={masjid.masjid_name}>{masjid.masjid_name}</SelectItem>
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
                      <FormLabel className={index > 0 ? "sr-only" : ""}>Required Qty</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Qty" onKeyDown={numericOnly} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {fields.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {generatedRecords.length > 0 && (
          <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
            <FormLabel className="text-sm text-muted-foreground">
              Generated Records ({generatedRecords.length})
            </FormLabel>
            <div className="max-h-48 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Mosque Name</TableHead>
                    <TableHead className="text-xs">Required Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedRecords.map((rec, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs py-1">{format(rec.date, "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-xs py-1">{rec.masjid_name}</TableCell>
                      <TableCell className="text-xs py-1">{rec.req_qty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <Button type="submit" className="w-full bg-gradient-warm hover:opacity-90" disabled={isSubmitting}>
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
          ) : (
            `Create ${generatedRecords.length || ""} Requirement${generatedRecords.length !== 1 ? "s" : ""}`
          )}
        </Button>
      </form>
    </Form>
  );
};

export default RequirementFormFields;
