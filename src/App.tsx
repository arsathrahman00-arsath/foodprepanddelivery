import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import AuthPage from "@/pages/AuthPage";
import DashboardHome from "@/pages/DashboardHome";
import LocationForm from "@/pages/LocationForm";
import ItemCategoryForm from "@/pages/ItemCategoryForm";
import UnitForm from "@/pages/UnitForm";
import ItemForm from "@/pages/ItemForm";
import SupplierForm from "@/pages/SupplierForm";
import RecipeTypeForm from "@/pages/RecipeTypeForm";
import RecipeForm from "@/pages/RecipeForm";
import SchedulePage from "@/pages/SchedulePage";
import RequirementPage from "@/pages/RequirementPage";
import DayRequirementsPage from "@/pages/DayRequirementsPage";
import MaterialReceiptPage from "@/pages/MaterialReceiptPage";
import PackingPage from "@/pages/PackingPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Protected Dashboard Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardHome />} />
                <Route path="/dashboard/location" element={<LocationForm />} />
                <Route path="/dashboard/item-category" element={<ItemCategoryForm />} />
                <Route path="/dashboard/unit" element={<UnitForm />} />
                <Route path="/dashboard/item" element={<ItemForm />} />
                <Route path="/dashboard/supplier" element={<SupplierForm />} />
                <Route path="/dashboard/recipe-type" element={<RecipeTypeForm />} />
                <Route path="/dashboard/recipe" element={<RecipeForm />} />
                <Route path="/dashboard/schedule" element={<SchedulePage />} />
                <Route path="/dashboard/requirement" element={<RequirementPage />} />
                <Route path="/dashboard/day-requirements" element={<DayRequirementsPage />} />
                <Route path="/dashboard/material-receipt" element={<MaterialReceiptPage />} />
                <Route path="/dashboard/packing" element={<PackingPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
