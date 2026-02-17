import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { authApi, moduleApi, userManagementApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  UserPlus, Eye, EyeOff, ShieldCheck, Pencil, Trash2, ArrowLeft, Save, Loader2,
} from "lucide-react";

// ── Registration schema ──
const registerSchema = z
  .object({
    user_name: z.string().min(1, "Username is required").max(50, "Username too long"),
    user_pwd: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[0-9]/, "Password must contain at least 1 number")
      .regex(/[^a-zA-Z0-9]/, "Password must contain at least 1 special character")
      .max(100, "Password too long"),
    confirm_pwd: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.user_pwd === d.confirm_pwd, {
    message: "Passwords don't match",
    path: ["confirm_pwd"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

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

// ── Main Component ──
const UserRightsPage: React.FC = () => {
  const { toast } = useToast();

  // view: "list" | "register" | "edit"
  const [view, setView] = useState<"list" | "register" | "edit">("list");

  // ── User list state ──
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ── Delete state ──
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Edit / permissions state ──
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set());
  const [savingPerms, setSavingPerms] = useState(false);

  // ── Registration state ──
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { user_name: "", user_pwd: "", confirm_pwd: "" },
  });

  const session = JSON.parse(localStorage.getItem("user_session") || "{}");

  // ── Fetch users ──
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

  // ── Delete user ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await userManagementApi.delete({ user_code: deleteTarget.user_code });
      if (res.status === "success" || res.status === "ok") {
        toast({ title: "Deleted", description: `User "${deleteTarget.user_name}" removed.` });
        setUsers((prev) => prev.filter((u) => u.user_code !== deleteTarget.user_code));
      } else {
        toast({ title: "Error", description: res.message || "Delete failed.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Unable to delete user.", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── Open edit ──
  const openEdit = async (user: UserRecord) => {
    setEditUser(user);
    setView("edit");
    try {
      const res = await moduleApi.getAll();
      const list: ModuleRecord[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setModules(list);
      setSelectedIdxs(new Set());
    } catch {
      toast({ title: "Error", description: "Failed to load modules.", variant: "destructive" });
    }
  };

  // ── Toggle checkbox ──
  const toggleIdx = (idx: number) => {
    setSelectedIdxs((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  // ── Save permissions ──
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
          created_by: session.user_name || "",
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

  // ── Register ──
  const handleRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.register({
        user_name: data.user_name,
        user_code: "",
        user_pwd: data.user_pwd,
        role_selection: "",
      });
      if (response.status === "success" || response.status === "ok") {
        toast({ title: "Success", description: "User registered successfully." });
        form.reset();
        setView("list");
        fetchUsers();
      } else if (
        response.message?.toLowerCase().includes("already exists") ||
        response.message?.toLowerCase().includes("duplicate")
      ) {
        form.setError("user_name", { message: "User already exists" });
      } else {
        toast({ title: "Registration failed", description: response.message || "Unable to register.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Unable to connect to server.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>All Users</CardTitle>
            <Button onClick={() => setView("register")} size="sm">
              <UserPlus className="w-4 h-4 mr-1" /> Register New User
            </Button>
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
                  {users.map((user, i) => (
                    <TableRow key={user.user_code || i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{user.user_name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="Edit permissions">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(user)} title="Delete user">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ───── REGISTER VIEW ───── */}
      {view === "register" && (
        <>
          <Button variant="ghost" size="sm" onClick={() => setView("list")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Users
          </Button>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Register New User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ur-username">Username</Label>
                  <Input id="ur-username" placeholder="Enter username" {...form.register("user_name")} className="h-11" />
                  {form.formState.errors.user_name && (
                    <p className="text-sm text-destructive">{form.formState.errors.user_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ur-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="ur-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 chars, 1 number, 1 special char"
                      {...form.register("user_pwd")}
                      className="h-11 pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.formState.errors.user_pwd && (
                    <p className="text-sm text-destructive">{form.formState.errors.user_pwd.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ur-confirm">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="ur-confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter password"
                      {...form.register("confirm_pwd")}
                      className="h-11 pr-10"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.formState.errors.confirm_pwd && (
                    <p className="text-sm text-destructive">{form.formState.errors.confirm_pwd.message}</p>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Password requirements:</p>
                  <ul className="list-disc pl-4">
                    <li>Minimum 8 characters</li>
                    <li>At least 1 number</li>
                    <li>At least 1 special character</li>
                  </ul>
                </div>

                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? "Registering..." : "Register User"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
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
              {modules.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
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
                <Button onClick={savePermissions} disabled={savingPerms}>
                  {savingPerms ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  {savingPerms ? "Saving..." : "Save Permissions"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ───── DELETE CONFIRMATION ───── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.user_name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserRightsPage;
