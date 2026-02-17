import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Eye, EyeOff, ShieldCheck } from "lucide-react";

const registerSchema = z.object({
  user_name: z.string().min(1, "Username is required").max(50, "Username too long"),
  user_pwd: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Password must contain at least 1 number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least 1 special character")
    .max(100, "Password too long"),
  confirm_pwd: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.user_pwd === data.confirm_pwd, {
  message: "Passwords don't match",
  path: ["confirm_pwd"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const UserRightsPage: React.FC = () => {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { user_name: "", user_pwd: "", confirm_pwd: "" },
  });

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
      } else if (
        response.message?.toLowerCase().includes("already exists") ||
        response.message?.toLowerCase().includes("duplicate")
      ) {
        form.setError("user_name", { message: "User already exists" });
      } else {
        toast({
          title: "Registration failed",
          description: response.message || "Unable to register.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Unable to connect to server.", variant: "destructive" });
    } finally {
      setIsLoading(false);
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
          <p className="text-muted-foreground">Register new users</p>
        </div>
      </div>

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
              <Input
                id="ur-username"
                placeholder="Enter username"
                {...form.register("user_name")}
                className="h-11"
              />
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
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
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
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
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
    </div>
  );
};

export default UserRightsPage;
