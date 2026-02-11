import React, { useState, useEffect, useRef } from "react";
import { Plus, RefreshCw, AlertCircle } from "lucide-react";
import { toProperCase } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export interface ColumnConfig {
  key: string;
  label: string;
}

interface MasterDataTableProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  columns: ColumnConfig[];
  fetchData: () => Promise<any>;
  formComponent: React.ReactNode;
  onFormSuccess: () => void;
}

const MasterDataTable: React.FC<MasterDataTableProps> = ({
  title,
  description,
  icon,
  columns,
  fetchData,
  formComponent,
  onFormSuccess,
}) => {
  const { toast } = useToast();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const formInteracted = useRef(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchData();
      if (response.status === "success" || response.status === "ok") {
        setData(response.data || []);
      } else {
        setError(response.message || "Failed to load data");
      }
    } catch (err) {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFormSuccess = () => {
    formInteracted.current = false;
    setIsModalOpen(false);
    onFormSuccess();
    loadData();
    toast({
      title: "Success",
      description: "Record added successfully",
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Trying to close — check if form was interacted with
      if (formInteracted.current) {
        setShowCloseWarning(true);
        return;
      }
    } else {
      formInteracted.current = false;
    }
    setIsModalOpen(open);
  };

  const handleConfirmClose = () => {
    formInteracted.current = false;
    setShowCloseWarning(false);
    setIsModalOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-warm hover:opacity-90 gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base font-medium">
            {title} Records ({data.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={loadData}>
                Try Again
              </Button>
            </div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No records found</p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-warm hover:opacity-90 gap-2"
              >
                <Plus className="w-4 h-4" />
                Add First Record
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">#</TableHead>
                    {columns.map((col) => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      {columns.map((col) => (
                        <TableCell key={col.key}>{row[col.key] ? toProperCase(String(row[col.key])) : "-"}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon}
              Add New {title}
            </DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new record
            </DialogDescription>
          </DialogHeader>
          <div onInput={() => { formInteracted.current = true; }} onChange={() => { formInteracted.current = true; }}>
            {React.cloneElement(formComponent as React.ReactElement, {
              onSuccess: handleFormSuccess,
              isModal: true,
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you want to close the form without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MasterDataTable;
