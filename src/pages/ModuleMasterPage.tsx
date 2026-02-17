import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { moduleApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Settings2, Loader2 } from "lucide-react";

interface ModuleRow {
  mod_name: string;
  sub_mod_name: string;
}

const ModuleMasterPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modName, setModName] = useState("");
  const [subModName, setSubModName] = useState("");

  const fetchModules = async () => {
    setIsLoading(true);
    try {
      const response = await moduleApi.getAll();
      if (response.data) {
        setModules(response.data);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load modules.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchModules(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modName.trim() || !subModName.trim()) {
      toast({ title: "Validation", description: "Both fields are required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const response = await moduleApi.create({
        mod_name: modName.trim(),
        sub_mod_name: subModName.trim(),
        created_by: user?.user_name || "",
      });
      if (response.status === "success" || response.status === "ok") {
        toast({ title: "Success", description: "Module added successfully." });
        setModName("");
        setSubModName("");
        setIsDialogOpen(false);
        fetchModules();
      } else {
        toast({ title: "Error", description: response.message || "Failed to add module.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save module.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAlphaOnly = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const val = e.target.value.replace(/[^a-zA-Z_ ]/g, "");
    setter(val);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Settings2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Module Master</h1>
            <p className="text-muted-foreground">Manage application modules and sub-modules</p>
          </div>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Module
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Modules</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : modules.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No modules found.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Module Name</TableHead>
                    <TableHead>Sub Module Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((mod, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="capitalize">{mod.mod_name?.replace(/_/g, " ")}</TableCell>
                      <TableCell className="capitalize">{mod.sub_mod_name?.replace(/_/g, " ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Add Module</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Module Name</Label>
              <Input
                value={modName}
                onChange={(e) => handleAlphaOnly(e, setModName)}
                placeholder="Enter module name"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label>Sub Module Name</Label>
              <Input
                value={subModName}
                onChange={(e) => handleAlphaOnly(e, setSubModName)}
                placeholder="Enter sub module name"
                maxLength={50}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Module"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModuleMasterPage;
