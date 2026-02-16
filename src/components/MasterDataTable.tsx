import React, { useState, useEffect, useRef } from "react";
import { Plus, RefreshCw, AlertCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toProperCase, formatDateForTable } from "@/lib/utils";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export interface ColumnConfig {
  key: string;
  label: string;
}

export interface EditDeleteConfig {
  /** The key in the row data that holds the primary identifier (e.g. "masjid_code") */
  idKey: string;
  /** Fields sent in the edit payload (excluding the id which is auto-included) */
  editFields: string[];
  /** API function for update */
  updateApi?: (data: Record<string, string>) => Promise<any>;
  /** API function for delete */
  deleteApi?: (data: Record<string, string>) => Promise<any>;
}

interface MasterDataTableProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  columns: ColumnConfig[];
  fetchData: () => Promise<any>;
  formComponent: React.ReactNode;
  editFormComponent?: React.ReactNode;
  onFormSuccess: () => void;
  editDeleteConfig?: EditDeleteConfig;
}

const MasterDataTable: React.FC<MasterDataTableProps> = ({
  title,
  description,
  icon,
  columns,
  fetchData,
  formComponent,
  editFormComponent,
  onFormSuccess,
  editDeleteConfig,
}) => {
  const { toast } = useToast();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const formInteracted = useRef(false);

  // Edit state
  const [editRow, setEditRow] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const editFormInteracted = useRef(false);
  const [showEditCloseWarning, setShowEditCloseWarning] = useState(false);

  // Delete state
  const [deleteRow, setDeleteRow] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchData();
      if (response.status === "success" || response.status === "ok") {
        const rawData = response.data || [];
        const dateKeys = columns.filter(c => c.key.includes("date") || c.key === "schd_date" || c.key === "req_date").map(c => c.key);
        if (dateKeys.length > 0) {
          rawData.sort((a: any, b: any) => {
            const dateA = new Date(a[dateKeys[0]] || "").getTime();
            const dateB = new Date(b[dateKeys[0]] || "").getTime();
            return dateA - dateB;
          });
        }
        setData(rawData);
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
    toast({ title: "Success", description: "Record added successfully" });
  };

  const handleEditSuccess = () => {
    editFormInteracted.current = false;
    setIsEditModalOpen(false);
    setEditRow(null);
    loadData();
    toast({ title: "Success", description: "Record updated successfully" });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (formInteracted.current) {
        setShowCloseWarning(true);
        return;
      }
    } else {
      formInteracted.current = false;
    }
    setIsModalOpen(open);
  };

  const handleEditOpenChange = (open: boolean) => {
    if (!open) {
      if (editFormInteracted.current) {
        setShowEditCloseWarning(true);
        return;
      }
      setEditRow(null);
    } else {
      editFormInteracted.current = false;
    }
    setIsEditModalOpen(open);
  };

  const handleConfirmClose = () => {
    formInteracted.current = false;
    setShowCloseWarning(false);
    setIsModalOpen(false);
  };

  const handleEditConfirmClose = () => {
    editFormInteracted.current = false;
    setShowEditCloseWarning(false);
    setIsEditModalOpen(false);
    setEditRow(null);
  };

  const handleDelete = async () => {
    if (!deleteRow || !editDeleteConfig?.deleteApi) return;
    setIsDeleting(true);
    try {
      const payload: Record<string, string> = {
        [editDeleteConfig.idKey]: String(deleteRow[editDeleteConfig.idKey] || ""),
      };
      const response = await editDeleteConfig.deleteApi(payload);
      if (response.status === "success" || response.status === "ok") {
        toast({ title: "Deleted", description: "Record deleted successfully" });
        loadData();
      } else {
        toast({ title: "Error", description: response.message || "Failed to delete", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Unable to connect to server", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteRow(null);
    }
  };

  const handleEditClick = (row: any) => {
    setEditRow(row);
    setIsEditModalOpen(true);
  };

  const hasActions = !!editDeleteConfig && (!!editDeleteConfig.updateApi || !!editDeleteConfig.deleteApi);

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
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-gradient-warm hover:opacity-90 gap-2">
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
              <Button variant="outline" onClick={loadData}>Try Again</Button>
            </div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No records found</p>
              <Button onClick={() => setIsModalOpen(true)} className="bg-gradient-warm hover:opacity-90 gap-2">
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
                    {hasActions && <TableHead className="w-16">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                      {columns.map((col) => (
                        <TableCell key={col.key}>
                          {row[col.key]
                            ? (col.key.includes("date") || col.key.includes("schd_date") || col.key.includes("req_date"))
                              ? formatDateForTable(String(row[col.key]))
                              : toProperCase(String(row[col.key]))
                            : "-"}
                        </TableCell>
                      ))}
                      {hasActions && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-background border">
                              {editDeleteConfig?.updateApi && (
                                <DropdownMenuItem onClick={() => handleEditClick(row)} className="gap-2">
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {editDeleteConfig?.deleteApi && (
                                <DropdownMenuItem onClick={() => setDeleteRow(row)} className="gap-2 text-destructive focus:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Dialog */}
      <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{icon} Add New {title}</DialogTitle>
            <DialogDescription>Fill in the details below to create a new record</DialogDescription>
          </DialogHeader>
          <div onInput={() => { formInteracted.current = true; }} onChange={() => { formInteracted.current = true; }}>
            {React.cloneElement(formComponent as React.ReactElement, {
              onSuccess: handleFormSuccess,
              isModal: true,
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{icon} Edit {title}</DialogTitle>
            <DialogDescription>Update the details below</DialogDescription>
          </DialogHeader>
          <div onInput={() => { editFormInteracted.current = true; }} onChange={() => { editFormInteracted.current = true; }}>
            {editRow && editFormComponent && React.cloneElement(editFormComponent as React.ReactElement, {
              onSuccess: handleEditSuccess,
              isModal: true,
              editData: editRow,
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Close warning for Add */}
      <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved changes. Do you want to close the form without saving?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close warning for Edit */}
      <AlertDialog open={showEditCloseWarning} onOpenChange={setShowEditCloseWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved changes. Do you want to close the form without saving?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditConfirmClose}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRow} onOpenChange={(open) => { if (!open) setDeleteRow(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this record? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MasterDataTable;
