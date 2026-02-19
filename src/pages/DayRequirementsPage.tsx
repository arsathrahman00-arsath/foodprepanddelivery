import React, { useState, useEffect, useRef } from "react";
import { format, eachDayOfInterval, differenceInCalendarDays } from "date-fns";
import { CalendarIcon, ClipboardList, Download, Loader2, Plus, Save, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn, toProperCase, formatDateForTable } from "@/lib/utils";
import { dayRequirementsApi, bulkItemApi, bulkRequirementApi } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// API for fetching existing retail requirements
const requirementListApi = {
  getAll: async () => {
    const response = await fetch("https://ngrchatbot.whindia.in/fpda/get_requirement/");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },
};

interface ExistingRequirement {
  day_req_date: string;
  recipe_type: string;
  day_tot_req: string;
  purc_type: string;
  purc_id: string;
  created_by: string;
}

interface RecipeData {
  recipe_code: string;
  recipe_type: string;
}

interface DateResponseData {
  recipes: RecipeData[];
  req_qty: number[];
}

interface RecipeTypeDisplay {
  recipe_type: string;
  recipe_code: string;
  req_qty: number;
}

interface RecipeItem {
  item_name: string;
  cat_name: string;
  unit_short: string;
  req_qty: number;
}

interface BulkItem {
  item_name: string;
  item_code: string;
  cat_name: string;
  cat_code: string;
  unit_short: string;
  req_qty: number;
  message?: string;
}

interface BulkExisting {
  day_req_date: string;
  purc_type: string;
  purc_id: string;
  created_by: string;
}

const DayRequirementsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Active tab
  const [activeTab, setActiveTab] = useState("retail");

  // Retail table state
  const [retailRequirements, setRetailRequirements] = useState<ExistingRequirement[]>([]);
  const [isLoadingRetail, setIsLoadingRetail] = useState(true);
  const [retailSearch, setRetailSearch] = useState("");

  // Bulk table state
  const [bulkRequirements, setBulkRequirements] = useState<BulkExisting[]>([]);
  const [isLoadingBulk, setIsLoadingBulk] = useState(true);
  const [bulkSearch, setBulkSearch] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const formInteracted = useRef(false);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [downloadingBulkIndex, setDownloadingBulkIndex] = useState<number | null>(null);
  // Retail dialog state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedRecipeCode, setSelectedRecipeCode] = useState<string>("");
  const [recipeTypesData, setRecipeTypesData] = useState<RecipeTypeDisplay[]>([]);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [totalDailyRequirement, setTotalDailyRequirement] = useState<number>(0);
  const [recipeTotpkt, setRecipeTotpkt] = useState<number>(0);
  const [totalDailyRequirementKg, setTotalDailyRequirementKg] = useState<number>(0);
  const [totalDailyRequirementRound, setTotalDailyRequirementRound] = useState<number>(0);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isLoadingTotpkt, setIsLoadingTotpkt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk dialog state
  const [bulkFromDate, setBulkFromDate] = useState<Date | undefined>();
  const [bulkToDate, setBulkToDate] = useState<Date | undefined>();
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [selectedBulkItems, setSelectedBulkItems] = useState<Set<string>>(new Set());
  const [isLoadingBulkItems, setIsLoadingBulkItems] = useState(false);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const bulkSubmitLock = useRef(false);

  const bulkTotalDays = bulkFromDate && bulkToDate
    ? differenceInCalendarDays(bulkToDate, bulkFromDate) + 1
    : 0;

  // ===== DATA FETCHING =====

  const fetchRetailRequirements = async () => {
    setIsLoadingRetail(true);
    try {
      const response = await requirementListApi.getAll();
      if (response.status === "success" && Array.isArray(response.data)) {
        setRetailRequirements(response.data.map((r: any) => ({ ...r, purc_type: r.purc_type || "Retail" })));
      }
    } catch (error) {
      console.error("Failed to fetch retail requirements:", error);
    } finally {
      setIsLoadingRetail(false);
    }
  };

  const fetchBulkRequirements = async () => {
    setIsLoadingBulk(true);
    try {
      const response = await dayRequirementsApi.getBulkList();
      if (response.status === "success" && Array.isArray(response.data)) {
        setBulkRequirements(response.data.map((r: any) => ({ ...r, purc_type: r.purc_type || "Bulk" })));
      }
    } catch (error) {
      console.error("Failed to fetch bulk requirements:", error);
    } finally {
      setIsLoadingBulk(false);
    }
  };

  useEffect(() => {
    fetchRetailRequirements();
    fetchBulkRequirements();
  }, []);

  // Filtered data
  const filteredRetail = retailSearch.trim()
    ? retailRequirements.filter((req) => {
        const q = retailSearch.toLowerCase();
        return (
          formatDateForTable(req.day_req_date).toLowerCase().includes(q) ||
          (req.recipe_type && req.recipe_type.toLowerCase().includes(q)) ||
          (req.day_tot_req && String(req.day_tot_req).includes(q)) ||
          (req.created_by && req.created_by.toLowerCase().includes(q))
        );
      })
    : retailRequirements;

  const filteredBulk = bulkSearch.trim()
    ? bulkRequirements.filter((req) => {
        const q = bulkSearch.toLowerCase();
        return (
          formatDateForTable(req.day_req_date).toLowerCase().includes(q) ||
          (req.purc_type && req.purc_type.toLowerCase().includes(q)) ||
          (req.created_by && req.created_by.toLowerCase().includes(q))
        );
      })
    : bulkRequirements;

  const handleDownloadPdf = async (req: ExistingRequirement, index: number) => {
    setDownloadingIndex(index);
    try {
      const formData = new FormData();
      formData.append("day_req_date", req.day_req_date?.split("T")[0] || req.day_req_date);
      formData.append("purc_id", req.purc_id || "");
      formData.append("purc_type", req.purc_type || "Retail");
      const response = await fetch("https://ngrchatbot.whindia.in/fpda/pdf_down/", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.status === "success" && result.data) {
        generatePdfFromData(result.data, req.day_req_date, req.purc_type || "Retail");
        toast({ title: "Success", description: "PDF downloaded successfully" });
      } else {
        throw new Error(result.message || "No data returned");
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setDownloadingIndex(null);
    }
  };

  const handleDownloadBulkPdf = async (req: BulkExisting, index: number) => {
    setDownloadingBulkIndex(index);
    try {
      const formData = new FormData();
      formData.append("day_req_date", req.day_req_date?.split("T")[0] || req.day_req_date);
      formData.append("purc_id", req.purc_id || "");
      formData.append("purc_type", req.purc_type || "Bulk");
      const response = await fetch("https://ngrchatbot.whindia.in/fpda/pdf_down/", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.status === "success" && result.data) {
        generatePdfFromData(result.data, req.day_req_date, req.purc_type || "Bulk");
        toast({ title: "Success", description: "PDF downloaded successfully" });
      } else {
        throw new Error(result.message || "No data returned");
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setDownloadingBulkIndex(null);
    }
  };

  const generatePdfFromData = (data: any[], dateStr: string, purcType: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const rawDate = dateStr?.split("T")[0] || dateStr;
    const parts = rawDate.split("-");
    const formattedDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : rawDate;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Day Requirements Report", pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formattedDate}`, pageWidth - 14, 28, { align: "right" });
    doc.text(`Purchase Type: ${purcType}`, 14, 28);

    // Group items by category
    const grouped: Record<string, any[]> = {};
    (Array.isArray(data) ? data : []).forEach((item: any) => {
      const cat = item.cat_name || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    let startY = 40;
    const categoryNames = Object.keys(grouped).sort();

    categoryNames.forEach((cat) => {
      const catItems = grouped[cat].sort((a: any, b: any) => (a.item_name || "").localeCompare(b.item_name || ""));

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(cat, 14, startY);
      startY += 2;

      autoTable(doc, {
        startY,
        head: [["Item Name", "Unit", "Req Qty"]],
        body: catItems.map((item: any) => [
          item.item_name || "",
          item.unit_short || "",
          String(item.day_req_qty || item.req_qty || ""),
        ]),
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      startY = (doc as any).lastAutoTable.finalY + 10;
    });

    doc.save(`Day_Requirements_${rawDate}_${purcType}.pdf`);
  };

  // Check if date already has retail requirements
  const isDateAlreadyUsed = (date: Date): boolean => {
    const formatted = format(date, "yyyy-MM-dd");
    return retailRequirements.some(r => r.day_req_date?.split("T")[0] === formatted);
  };

  // Reset dialog state
  const resetDialog = () => {
    setSelectedDate(undefined);
    setSelectedRecipeCode("");
    setRecipeTypesData([]);
    setRecipeItems([]);
    setSelectedItems(new Set());
    setTotalDailyRequirement(0);
    setRecipeTotpkt(0);
    setTotalDailyRequirementKg(0);
    setTotalDailyRequirementRound(0);
    setBulkFromDate(undefined);
    setBulkToDate(undefined);
    setBulkItems([]);
    setSelectedBulkItems(new Set());
  };

  // ===== RETAIL FLOW LOGIC =====

  useEffect(() => {
    if (!dialogOpen || activeTab !== "retail") return;
    if (!selectedDate) {
      setRecipeTypesData([]);
      setTotalDailyRequirement(0);
      setRecipeTotpkt(0);
      setTotalDailyRequirementKg(0);
      setTotalDailyRequirementRound(0);
      setSelectedRecipeCode("");
      return;
    }

    if (isDateAlreadyUsed(selectedDate)) {
      toast({ title: "Duplicate Date", description: "Day requirements already exist for this date", variant: "destructive" });
      setSelectedDate(undefined);
      return;
    }

    const fetchDataByDate = async () => {
      setIsLoadingData(true);
      try {
        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        const response = await dayRequirementsApi.getByDate(formattedDate);
        if (response.status === "success" && response.data) {
          const data = response.data as DateResponseData;
          const recipes = data.recipes || [];
          const reqQtyArray = data.req_qty || [];
          const transformedData: RecipeTypeDisplay[] = recipes.map((recipe, index) => ({
            recipe_type: recipe.recipe_type.trim(),
            recipe_code: recipe.recipe_code,
            req_qty: Number(reqQtyArray[index]) || 0,
          }));
          setRecipeTypesData(transformedData);
          if (transformedData.length > 0) setSelectedRecipeCode(transformedData[0].recipe_code);
          setTotalDailyRequirement(reqQtyArray.reduce((sum: number, qty: number) => sum + (Number(qty) || 0), 0));
        } else {
          setRecipeTypesData([]);
          setTotalDailyRequirement(0);
        }
      } catch (error) {
        console.error("Failed to fetch data by date:", error);
        setRecipeTypesData([]);
        setTotalDailyRequirement(0);
        toast({ title: "Error", description: "Failed to load data for the selected date", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchDataByDate();
  }, [selectedDate, dialogOpen, activeTab]);

  const selectedRecipe = recipeTypesData.find(r => r.recipe_code === selectedRecipeCode);

  useEffect(() => {
    if (!dialogOpen || activeTab !== "retail") return;
    if (!selectedRecipeCode || !selectedRecipe) {
      setRecipeTotpkt(0);
      setTotalDailyRequirementKg(0);
      setTotalDailyRequirementRound(0);
      return;
    }
    const fetchRecipeTotpkt = async () => {
      setIsLoadingTotpkt(true);
      try {
        const response = await dayRequirementsApi.getRecipeTotpkt(selectedRecipe.recipe_type);
        if (response.status === "success" && response.data) {
          const totpkt = Number(response.data.recipe_totpkt) || 0;
          setRecipeTotpkt(totpkt);
          const kgValue = totpkt > 0 ? totalDailyRequirement / totpkt : 0;
          setTotalDailyRequirementKg(kgValue);
          setTotalDailyRequirementRound(Math.ceil(kgValue));
        }
      } catch (error) {
        console.error("Failed to fetch recipe totpkt:", error);
        setRecipeTotpkt(0);
        setTotalDailyRequirementKg(0);
        setTotalDailyRequirementRound(0);
      } finally {
        setIsLoadingTotpkt(false);
      }
    };
    fetchRecipeTotpkt();
  }, [selectedRecipeCode, selectedRecipe, totalDailyRequirement, dialogOpen, activeTab]);

  useEffect(() => {
    if (!dialogOpen || activeTab !== "retail") return;
    if (!selectedRecipeCode || !selectedRecipe || !selectedDate) {
      setRecipeItems([]);
      setSelectedItems(new Set());
      return;
    }
    const fetchRecipeItems = async () => {
      setIsLoadingItems(true);
      try {
        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        const response = await dayRequirementsApi.getRecipeItems(selectedRecipe.recipe_type, formattedDate);
        if (response.status === "success" && response.data) {
          setRecipeItems(response.data);
          setSelectedItems(new Set(response.data.map((item: RecipeItem) => item.item_name)));
        }
      } catch (error) {
        console.error("Failed to fetch recipe items:", error);
        setRecipeItems([]);
      } finally {
        setIsLoadingItems(false);
      }
    };
    fetchRecipeItems();
  }, [selectedRecipeCode, selectedRecipe, dialogOpen, activeTab]);

  const toggleItemSelection = (itemName: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemName)) newSelection.delete(itemName);
    else newSelection.add(itemName);
    setSelectedItems(newSelection);
  };

  const toggleAllItems = () => {
    if (selectedItems.size === recipeItems.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(recipeItems.map(item => item.item_name)));
  };

  const getMultipliedQty = (reqQty: number) => (Number(reqQty) || 0) * totalDailyRequirementRound;

  const selectedItemsTotal = recipeItems
    .filter(item => selectedItems.has(item.item_name))
    .reduce((sum, item) => sum + getMultipliedQty(item.req_qty), 0);

  const handleRetailSubmit = async () => {
    if (!selectedDate || !selectedRecipeCode || !selectedRecipe || selectedItems.size === 0) {
      toast({ title: "Validation Error", description: "Please select a date, recipe type, and at least one item", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const formattedDate = format(selectedDate, "yyyy-MM-dd'T'00:00:00");
      const recipeCode = selectedRecipe.recipe_code;
      const recipeType = selectedRecipe.recipe_type;
      const createdBy = user?.user_name || "";

      const headerResponse = await dayRequirementsApi.createHeader({
        day_req_date: formattedDate,
        recipe_type: recipeType,
        recipe_code: recipeCode,
        day_tot_req: String(totalDailyRequirement),
        purc_type: "Retail",
        created_by: createdBy,
      });

      const purcId = headerResponse.data?.purc_id ?? (headerResponse as any).purc_id;
      if (headerResponse.status !== "success" || !purcId) {
        throw new Error(headerResponse.message || "Failed to create requirement header");
      }

      const purcIdStr = String(purcId);
      const selectedItemsList = recipeItems.filter(item => selectedItems.has(item.item_name));

      for (const item of selectedItemsList) {
        await dayRequirementsApi.createTransaction({
          purc_id: purcIdStr,
          day_req_date: formattedDate,
          recipe_code: recipeCode,
          item_name: item.item_name,
          cat_name: item.cat_name,
          unit_short: item.unit_short,
          day_req_qty: String(getMultipliedQty(item.req_qty)),
          purc_type: "Retail",
          created_by: createdBy,
        });
      }

      toast({ title: "Success", description: "Day requirements saved successfully" });
      formInteracted.current = false;
      setDialogOpen(false);
      resetDialog();
      fetchRetailRequirements();
    } catch (error) {
      console.error("Failed to save day requirements:", error);
      toast({ title: "Error", description: "Failed to save day requirements", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== BULK FLOW LOGIC =====

  useEffect(() => {
    if (!dialogOpen || activeTab !== "bulk" || !bulkFromDate || !bulkToDate) {
      setBulkItems([]);
      setSelectedBulkItems(new Set());
      return;
    }
    let cancelled = false;
    const fetchBulkItems = async () => {
      setIsLoadingBulkItems(true);
      try {
        const response = await bulkItemApi.getAll(format(bulkFromDate, "yyyy-MM-dd"), format(bulkToDate, "yyyy-MM-dd"));
        if (!cancelled && response.status === "success" && response.data) {
          const items: BulkItem[] = Array.isArray(response.data) ? response.data : [];
          const existingItems = items.filter(item => item.message === "This item already exists");
          if (existingItems.length > 0 && existingItems.length === items.length) {
            toast({ title: "Duplicate Items", description: "All items already exist for the selected dates. No new items to add.", variant: "destructive" });
            setBulkItems([]);
          } else {
            const validItems = items.filter(item => item.message !== "This item already exists");
            setBulkItems(validItems.length > 0 ? validItems : items);
            if (existingItems.length > 0 && validItems.length > 0) {
              toast({ title: "Info", description: `${existingItems.length} item(s) already exist and have been excluded.` });
            }
          }
          setSelectedBulkItems(new Set());
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch bulk items:", error);
          toast({ title: "Error", description: "Failed to load bulk items", variant: "destructive" });
        }
      } finally {
        if (!cancelled) setIsLoadingBulkItems(false);
      }
    };
    fetchBulkItems();
    return () => { cancelled = true; };
  }, [bulkFromDate, bulkToDate, dialogOpen, activeTab]);

  const toggleBulkItemSelection = (itemName: string) => {
    const newSelection = new Set(selectedBulkItems);
    if (newSelection.has(itemName)) newSelection.delete(itemName);
    else newSelection.add(itemName);
    setSelectedBulkItems(newSelection);
  };

  const toggleAllBulkItems = () => {
    if (selectedBulkItems.size === bulkItems.length) setSelectedBulkItems(new Set());
    else setSelectedBulkItems(new Set(bulkItems.map(item => item.item_name)));
  };

  const handleBulkSubmit = async () => {
    if (bulkSubmitLock.current) return;
    if (!bulkFromDate || !bulkToDate || selectedBulkItems.size === 0) {
      toast({ title: "Validation Error", description: "Please select dates and at least one item", variant: "destructive" });
      return;
    }

    bulkSubmitLock.current = true;
    setIsSubmittingBulk(true);
    try {
      const dateRange = eachDayOfInterval({ start: bulkFromDate, end: bulkToDate });
      const datesArray = dateRange.map(d => format(d, "yyyy-MM-dd"));
      const createdBy = user?.user_name || "";

      const headerResponse = await bulkRequirementApi.createHeader({
        day_req_date: JSON.stringify(datesArray),
        purc_type: "Bulk",
        created_by: createdBy,
      });

      const purcId = headerResponse.data?.purc_id ?? (headerResponse as any).purc_id;
      if (headerResponse.status !== "success" || !purcId) {
        throw new Error(headerResponse.message || "Failed to create bulk header");
      }

      const purcIdStr = String(purcId);
      const selectedBulkItemsList = bulkItems.filter(item => selectedBulkItems.has(item.item_name));

      for (const item of selectedBulkItemsList) {
        for (const date of datesArray) {
          await bulkRequirementApi.createTransaction({
            purc_id: purcIdStr,
            day_req_date: date,
            recipe_code: String(item.item_code || ""),
            item_name: item.item_name,
            cat_name: item.cat_name,
            unit_short: item.unit_short,
            day_req_qty: String(item.req_qty),
            created_by: createdBy,
            purc_type: "Bulk",
          });
        }
      }

      toast({ title: "Success", description: "Bulk requirements saved successfully" });
      formInteracted.current = false;
      setDialogOpen(false);
      resetDialog();
      fetchBulkRequirements();
    } catch (error) {
      console.error("Failed to save bulk requirements:", error);
      toast({ title: "Error", description: "Failed to save bulk requirements", variant: "destructive" });
    } finally {
      setIsSubmittingBulk(false);
      bulkSubmitLock.current = false;
    }
  };

  // ===== RENDER =====

  const dialogTitle = activeTab === "retail" ? "Add Purchase Request - Retail" : "Add Purchase Request - Bulk";

  return (
    <div className="space-y-6" onInput={() => { formInteracted.current = true; }} onChange={() => { formInteracted.current = true; }}>
      <Card className="shadow-warm border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-warm flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Purchase Request</CardTitle>
              <CardDescription>Plan daily ingredient requirements based on recipes</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="retail">Retail</TabsTrigger>
                <TabsTrigger value="bulk">Bulk</TabsTrigger>
              </TabsList>

              <Dialog open={dialogOpen} onOpenChange={(open) => {
                if (!open && formInteracted.current) {
                  setShowCloseWarning(true);
                  return;
                }
                if (open) formInteracted.current = false;
                setDialogOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    {activeTab === "retail" ? "Add Purchase Request - Retail" : "Add Purchase Request - Bulk"}
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
                  onInteractOutside={(e) => e.preventDefault()}
                  onEscapeKeyDown={(e) => e.preventDefault()}
                >
                  <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                  </DialogHeader>

                  {/* RETAIL DIALOG */}
                  {activeTab === "retail" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Select Date</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-[200]" align="start">
                              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={(date) => isDateAlreadyUsed(date)} initialFocus className="p-3 pointer-events-auto" />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Recipe Type</label>
                          <Select value={selectedRecipeCode} onValueChange={setSelectedRecipeCode} disabled={!selectedDate || isLoadingData}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={isLoadingData ? "Loading..." : "Select recipe type"} />
                            </SelectTrigger>
                            <SelectContent className="z-[200] bg-popover">
                              {recipeTypesData.map((recipe) => (
                                <SelectItem key={recipe.recipe_code} value={recipe.recipe_code}>{recipe.recipe_type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Total Daily Req (pck)</label>
                          <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center">
                            {isLoadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-semibold text-lg">{totalDailyRequirement}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Recipe Types Table */}
                      {selectedDate && recipeTypesData.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-muted/50 px-4 py-2">
                            <h4 className="text-sm font-medium">Recipe Types for {format(selectedDate, "PPP")}</h4>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead>Recipe Type</TableHead>
                                <TableHead className="text-right">Req Qty</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {recipeTypesData.map((recipe, index) => (
                                <TableRow
                                  key={`${recipe.recipe_code}-${index}`}
                                  className={cn("cursor-pointer hover:bg-muted/50", selectedRecipeCode === recipe.recipe_code && "bg-primary/10")}
                                  onClick={() => setSelectedRecipeCode(recipe.recipe_code)}
                                >
                                  <TableCell className="font-medium">{toProperCase(recipe.recipe_type)}</TableCell>
                                  <TableCell className="text-right">{recipe.req_qty || 0}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Items Table */}
                      {recipeItems.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="w-12">
                                  <Checkbox checked={selectedItems.size === recipeItems.length && recipeItems.length > 0} onCheckedChange={toggleAllItems} />
                                </TableHead>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead className="text-right">Req Qty</TableHead>
                                <TableHead className="text-right">Total Qty</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {isLoadingItems ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                              ) : (
                                (() => {
                                  const grouped: Record<string, RecipeItem[]> = {};
                                  recipeItems.forEach((item) => {
                                    const cat = item.cat_name || "Other";
                                    if (!grouped[cat]) grouped[cat] = [];
                                    grouped[cat].push(item);
                                  });
                                  const sortedCategories = Object.keys(grouped).sort();
                                  return sortedCategories.map((cat) => {
                                    const catItems = grouped[cat].sort((a, b) => a.item_name.localeCompare(b.item_name));
                                    return (
                                      <React.Fragment key={cat}>
                                        <TableRow className="bg-muted/30">
                                          <TableCell colSpan={6} className="py-2 font-semibold text-sm text-primary">{toProperCase(cat)}</TableCell>
                                        </TableRow>
                                        {catItems.map((item) => (
                                          <TableRow key={item.item_name}>
                                            <TableCell>
                                              <Checkbox checked={selectedItems.has(item.item_name)} onCheckedChange={() => toggleItemSelection(item.item_name)} />
                                            </TableCell>
                                            <TableCell className="font-medium">{toProperCase(item.item_name)}</TableCell>
                                            <TableCell>{toProperCase(item.cat_name)}</TableCell>
                                            <TableCell>{toProperCase(item.unit_short)}</TableCell>
                                            <TableCell className="text-right">{item.req_qty}</TableCell>
                                            <TableCell className="text-right font-semibold">{selectedItems.has(item.item_name) ? getMultipliedQty(item.req_qty) : ""}</TableCell>
                                          </TableRow>
                                        ))}
                                      </React.Fragment>
                                    );
                                  });
                                })()
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Summary and Submit */}
                      {recipeItems.length > 0 && (
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              Selected Items: <span className="font-medium text-foreground">{selectedItems.size}</span> of {recipeItems.length}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Selected Quantity Total: <span className="font-semibold text-lg text-foreground">{selectedItemsTotal}</span>
                              {" / "}
                              <span className="font-semibold text-lg text-primary">{totalDailyRequirement}</span>
                            </p>
                          </div>
                          <Button onClick={handleRetailSubmit} disabled={isSubmitting || selectedItems.size === 0 || !selectedDate || !selectedRecipeCode} className="gap-2">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Requirements
                          </Button>
                        </div>
                      )}

                      {!isLoadingData && selectedDate && recipeTypesData.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">No recipe data found for the selected date</div>
                      )}
                      {!isLoadingItems && recipeItems.length === 0 && selectedRecipeCode && (
                        <div className="text-center py-8 text-muted-foreground">No items found for the selected recipe type</div>
                      )}
                    </div>
                  )}

                  {/* BULK DIALOG */}
                  {activeTab === "bulk" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">From Date</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !bulkFromDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {bulkFromDate ? format(bulkFromDate, "PPP") : "Select from date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-[200]" align="start">
                              <Calendar
                                mode="single"
                                selected={bulkFromDate}
                                onSelect={(d) => {
                                  setBulkFromDate(d);
                                  if (bulkToDate && d && d > bulkToDate) setBulkToDate(undefined);
                                }}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">To Date</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !bulkToDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {bulkToDate ? format(bulkToDate, "PPP") : "Select to date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-[200]" align="start">
                              <Calendar
                                mode="single"
                                selected={bulkToDate}
                                onSelect={setBulkToDate}
                                disabled={(date) => bulkFromDate ? date < bulkFromDate : false}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {bulkFromDate && bulkToDate && bulkTotalDays > 0 && (
                        <div className="rounded-lg border bg-muted/50 px-4 py-3">
                          <p className="text-sm font-medium">
                            From: <span className="text-primary">{format(bulkFromDate, "dd/MM/yyyy")}</span>
                            {" to: "}
                            <span className="text-primary">{format(bulkToDate, "dd/MM/yyyy")}</span>
                            {" | "}
                            Total Days: <span className="text-lg font-bold text-primary">{bulkTotalDays}</span>
                          </p>
                        </div>
                      )}

                      {/* Bulk Items Table with selection */}
                      {isLoadingBulkItems && (
                        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                      )}

                      {!isLoadingBulkItems && bulkItems.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="w-12">
                                  <Checkbox checked={selectedBulkItems.size === bulkItems.length && bulkItems.length > 0} onCheckedChange={toggleAllBulkItems} />
                                </TableHead>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead className="text-right">Req Qty</TableHead>
                                <TableHead className="text-right">Total Qty</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {bulkItems.map((item, index) => (
                                <TableRow key={`${item.item_code}-${index}`}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedBulkItems.has(item.item_name)}
                                      onCheckedChange={() => toggleBulkItemSelection(item.item_name)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">{toProperCase(item.item_name)}</TableCell>
                                  <TableCell>{toProperCase(item.cat_name)}</TableCell>
                                  <TableCell>{toProperCase(item.unit_short)}</TableCell>
                                  <TableCell className="text-right">{item.req_qty}</TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {selectedBulkItems.has(item.item_name) ? (Number(item.req_qty) || 0) * bulkTotalDays : ""}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {!isLoadingBulkItems && bulkFromDate && bulkToDate && bulkItems.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">No bulk items found</div>
                      )}

                      {/* Save Button */}
                      {bulkItems.length > 0 && (
                        <div className="flex items-center justify-between pt-4 border-t">
                          <p className="text-sm text-muted-foreground">
                            Selected Items: <span className="font-medium text-foreground">{selectedBulkItems.size}</span> of {bulkItems.length}
                          </p>
                          <Button onClick={handleBulkSubmit} disabled={isSubmittingBulk || !bulkFromDate || !bulkToDate || selectedBulkItems.size === 0} className="gap-2">
                            {isSubmittingBulk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Bulk Requirements
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            {/* RETAIL TAB CONTENT */}
            <TabsContent value="retail">
              <div className="mb-4">
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search retail requirements..."
                    value={retailSearch}
                    onChange={(e) => setRetailSearch(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Purchase Type</TableHead>
                      <TableHead>Purchase No</TableHead>
                      <TableHead>Recipe Type</TableHead>
                      <TableHead className="text-right">Total Daily Req</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingRetail ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : filteredRetail.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No retail requirements found</TableCell></TableRow>
                    ) : (
                      filteredRetail.map((req, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDateForTable(req.day_req_date)}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                              {req.purc_type || "Retail"}
                            </span>
                          </TableCell>
                          <TableCell>{req.purc_id || "-"}</TableCell>
                          <TableCell className="font-medium">{toProperCase(req.recipe_type || "-")}</TableCell>
                          <TableCell className="text-right">{req.day_tot_req || "-"}</TableCell>
                          <TableCell>{toProperCase(req.created_by)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadPdf(req, index)} disabled={downloadingIndex === index}>
                              {downloadingIndex === index ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* BULK TAB CONTENT */}
            <TabsContent value="bulk">
              <div className="mb-4">
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search bulk requirements..."
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Purchase Type</TableHead>
                      <TableHead>Purchase No</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingBulk ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : filteredBulk.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No bulk requirements found</TableCell></TableRow>
                    ) : (
                      filteredBulk.map((req, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDateForTable(req.day_req_date)}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-accent text-accent-foreground">
                              {req.purc_type || "Bulk"}
                            </span>
                          </TableCell>
                          <TableCell>{req.purc_id || "-"}</TableCell>
                          <TableCell>{toProperCase(req.created_by)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadBulkPdf(req, index)} disabled={downloadingBulkIndex === index}>
                              {downloadingBulkIndex === index ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved changes. Do you want to close the form without saving?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={() => { formInteracted.current = false; setShowCloseWarning(false); setDialogOpen(false); resetDialog(); }}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DayRequirementsPage;
