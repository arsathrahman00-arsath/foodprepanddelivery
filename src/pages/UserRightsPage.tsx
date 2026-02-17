import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { moduleApi, userManagementApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ShieldCheck, Pencil, ArrowLeft, Save, Loader2, Trash2,
} from "lucide-react";

interface UserRecord {
  user_name: string;
  user_code: string;
  [key: string]: any;
}

interface ModuleRecord {
  module_id?: string;
  sub_mod_id?: string;
  mod_name: string;
  sub_mod_name: string;
}

const UserRightsPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [view, setView] = useState<"list" | "edit">("list");

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set());
  const [savingPerms, setSavingPerms] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await userManagementApi.getAll();
      setUsers(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
    } catch {
      toast({ title: "Error", description: "Failed to load users.", variant: "destructive" });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (targetUser: UserRecord) => {
    setDeletingUser(targetUser.user_code);
    try {
      await userManagementApi.delete({ user_code: targetUser.user_code });
      toast({ title: "Deleted", description: `User "${targetUser.user_name}" deleted successfully.` });
      fetchUsers();
    } catch {
      toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" });
    } finally {
      setDeletingUser(null);
    }
  };

  const openEdit = async (targetUser: UserRecord) => {
    setEditUser(targetUser);
    setView("edit");
    setLoadingPerms(true);
    try {
      const [modulesRes, permsRes] = await Promise.all([
        moduleApi.getAll(),
        userManagementApi.getPermissions({ user_code: targetUser.user_code }),
      ]);

      const list: ModuleRecord[] = Array.isArray(modulesRes?.data)
        ? modulesRes.data
        : Array.isArray(modulesRes) ? modulesRes : [];
      setModules(list);

      const perms: any[] = Array.isArray(permsRes?.data)
        ? permsRes.data
        : Array.isArray(permsRes) ? permsRes : [];

      const preSelected = new Set<number>();
      list.forEach((mod, idx) => {
        const isAssigned = perms.some(
          (p) =>
            (p.module_id === mod.module_id || p.module_id === mod.mod_name ||
             String(p.mod_name) === String(mod.module_id) || p.mod_name === mod.mod_name) &&
            (p.sub_mod_id === mod.sub_mod_id || p.sub_mod_id === mod.sub_mod_name ||
             String(p.sub_mod_name) === String(mod.sub_mod_id) || p.sub_mod_name === mod.sub_mod_name)
        );
        if (isAssigned) preSelected.add(idx);
      });
      setSelectedIdxs(preSelected);
    } catch {
      toast({ title: "Error", description: "Failed to load modules.", variant: "destructive" });
    } finally {
      setLoadingPerms(false);
    }
  };

  const toggleIdx = (idx: number) => {
    setSelectedIdxs((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const savePermissions = async () => {
    if (!editUser) return;
    if (selectedIdxs.size === 0) {
      toast({ title: "No selection", description: "Please select at least one module.", variant: "destructive" });
      return;
    }
    setSavingPerms(true);
    try {
      const selected = Array.from(selectedIdxs).map((i) => modules[i]);
      for (const mod of selected) {
        await userManagementApi.mapModules({
          user_code: editUser.user_code,
          user_name: editUser.user_name,
          module_id: mod.module_id || "",
          sub_mod_id: mod.sub_mod_id || "",
          mod_name: mod.mod_name,
          sub_mod_name: mod.sub_mod_name,
          created_by: user?.user_name || "",
        });
      }
      toast({ title: "Saved", description: "Permissions updated successfully." });
      setView("list");
    } catch {
      toast({ title: "Error", description: "Failed to save permissions.", variant: "destructive" });
    } finally {
      setSavingPerms(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Rights</h1>
          <p className="text-muted-foreground">Manage users and module permissions</p>
        </div>
      </div>

      {/* ───── LIST VIEW ───── */}
      {view === "list" && (
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>User Name</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u, i) => (
                    <TableRow key={u.user_code || i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{u.user_name}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Edit permissions">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Delete user" disabled={deletingUser === u.user_code}>
                              {deletingUser === u.user_code ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-destructive" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <strong>{u.user_name}</strong>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(u)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ───── EDIT PERMISSIONS VIEW ───── */}
      {view === "edit" && editUser && (
        <>
          <Button variant="ghost" size="sm" onClick={() => setView("list")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Users
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>
                Module Permissions — <span className="text-primary">{editUser.user_name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingPerms ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : modules.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No modules found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Module Name</TableHead>
                      <TableHead>Sub Module Name</TableHead>
                      <TableHead className="w-24 text-center">Selection</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map((mod, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="capitalize">{mod.mod_name?.replace(/_/g, " ")}</TableCell>
                        <TableCell className="capitalize">{mod.sub_mod_name?.replace(/_/g, " ") || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedIdxs.has(idx)}
                            onCheckedChange={() => toggleIdx(idx)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="flex justify-end">
                <Button onClick={savePermissions} disabled={savingPerms || loadingPerms}>
                  {savingPerms ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  {savingPerms ? "Saving..." : "Save Permissions"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default UserRightsPage;
