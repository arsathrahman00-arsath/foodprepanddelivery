import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChefHat, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";

const loginSchema = z.object({
  user_name: z.string().min(1, "Username is required").max(50, "Username too long"),
  user_pwd: z.string().min(1, "Password is required").max(100, "Password too long"),
});

const registerSchema = z.object({
  user_name: z.string().min(1, "Username is required").max(50, "Username too long"),
  user_code: z.string().min(1, "User code is required").max(20, "User code too long"),
  user_pwd: z.string().min(4, "Password must be at least 4 characters").max(100, "Password too long"),
  confirm_pwd: z.string().min(1, "Please confirm your password"),
  role_selection: z.string().min(1, "Please select a role"),
}).refine((data) => data.user_pwd === data.confirm_pwd, {
  message: "Passwords don't match",
  path: ["confirm_pwd"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { user_name: "", user_pwd: "" },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { user_name: "", user_code: "", user_pwd: "", confirm_pwd: "", role_selection: "" },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.login({
        user_name: data.user_name,
        user_pwd: data.user_pwd,
      });
      
      if (response.status === "success" || response.status === "ok") {
        const userData = response.data || response;
        login({
          user_name: userData.user_name || data.user_name,
          user_code: userData.user_code || "",
          role_selection: userData.role_selection || "user",
        });
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
        navigate("/dashboard");
      } else {
        toast({
          title: "Login failed",
          description: response.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to connect to server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.register({
        user_name: data.user_name,
        user_code: data.user_code,
        user_pwd: data.user_pwd,
        role_selection: data.role_selection,
      });
      
      if (response.status === "success" || response.status === "ok") {
        toast({
          title: "Registration successful!",
          description: "You can now log in with your credentials.",
        });
        loginForm.reset();
      } else {
        toast({
          title: "Registration failed",
          description: response.message || "Unable to register. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to connect to server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-warm shadow-lg mb-4">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground">FPDA</h1>
          <p className="text-primary-foreground/70 mt-1">Food Preparation & Delivery App</p>
        </div>

        <Card className="glass-card border-0 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>Sign in to manage your food operations</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  Login
                </TabsTrigger>
                <TabsTrigger value="register" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Register
                </TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      placeholder="Enter your username"
                      {...loginForm.register("user_name")}
                      className="h-11"
                    />
                    {loginForm.formState.errors.user_name && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.user_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        {...loginForm.register("user_pwd")}
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
                    {loginForm.formState.errors.user_pwd && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.user_pwd.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full h-11 bg-gradient-warm hover:opacity-90" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register">
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-username">Username</Label>
                      <Input
                        id="reg-username"
                        placeholder="Username"
                        {...registerForm.register("user_name")}
                        className="h-11"
                      />
                      {registerForm.formState.errors.user_name && (
                        <p className="text-sm text-destructive">{registerForm.formState.errors.user_name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-usercode">User Code</Label>
                      <Input
                        id="reg-usercode"
                        placeholder="User code"
                        {...registerForm.register("user_code")}
                        className="h-11"
                      />
                      {registerForm.formState.errors.user_code && (
                        <p className="text-sm text-destructive">{registerForm.formState.errors.user_code.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-role">Role</Label>
                    <Select onValueChange={(value) => registerForm.setValue("role_selection", value)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="chef">Chef</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    {registerForm.formState.errors.role_selection && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.role_selection.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Create a password"
                      {...registerForm.register("user_pwd")}
                      className="h-11"
                    />
                    {registerForm.formState.errors.user_pwd && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.user_pwd.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm">Confirm Password</Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="Confirm your password"
                      {...registerForm.register("confirm_pwd")}
                      className="h-11"
                    />
                    {registerForm.formState.errors.confirm_pwd && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.confirm_pwd.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full h-11 bg-gradient-warm hover:opacity-90" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
