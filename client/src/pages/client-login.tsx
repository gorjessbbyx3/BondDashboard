import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { EnhancedInput } from "@/components/ui/enhanced-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Lock, Phone, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useErrorContext, mapApiErrorToContext } from "@/hooks/useErrorContext";
import Footer from "@/components/layout/footer";

export default function ClientLogin() {
  const [, setLocation] = useLocation();
  const [clientId, setClientId] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loginMethod, setLoginMethod] = useState<"id" | "phone">("id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { addError, removeError, clearErrors } = useErrorContext();

  const loginMutation = useMutation({
    mutationFn: async ({ clientId, password, phoneNumber }: { clientId?: string; password?: string; phoneNumber?: string }) => {
      if (loginMethod === "id") {
        return await apiRequest("POST", "/api/auth/client-login", { clientId, password });
      } else {
        return await apiRequest("POST", "/api/auth/client-login-phone", { phoneNumber, password });
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      setLocation("/client-dashboard");
      toast({
        title: "Login Successful",
        description: `Welcome back, ${(data as any).fullName || 'Client'}!`,
      });
    },
    onError: (error) => {
      clearErrors();
      
      addError("general", {
        message: "Please check your credentials and try again",
        severity: "error" as const,
        timestamp: new Date()
      });
      
      toast({
        title: "Login Failed",
        description: "Please check your credentials and try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loginMethod === "id") {
      if (!clientId || !password) {
        toast({
          title: "Missing Information",
          description: "Please enter both Client ID and password.",
          variant: "destructive",
        });
        return;
      }
      loginMutation.mutate({ clientId, password });
    } else {
      if (!phoneNumber || !password) {
        toast({
          title: "Missing Information",
          description: "Please enter both phone number and password.",
          variant: "destructive",
        });
        return;
      }
      loginMutation.mutate({ phoneNumber, password });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section with Logo Background */}
      <div className="relative min-h-screen flex items-center justify-center">
        {/* Logo Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <div className="w-96 h-96 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center">
            <div className="text-white text-8xl font-bold">SB</div>
          </div>
        </div>
        
        {/* Overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 via-white/80 to-blue-100/90 dark:from-gray-900/90 dark:via-gray-800/80 dark:to-gray-900/90"></div>
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-md px-4">
          {/* Title Overlay */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Client Sign-In
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Access your account information
            </p>
          </div>

          {/* Login Form */}
          <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-2xl border-0">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Client Login
              </CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Login Method Selection */}
                <div className="space-y-2">
                  <Label htmlFor="login-method">Login Method</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={loginMethod === "id" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setLoginMethod("id")}
                      className="flex-1"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Client ID
                    </Button>
                    <Button
                      type="button"
                      variant={loginMethod === "phone" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setLoginMethod("phone")}
                      className="flex-1"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Phone Number
                    </Button>
                  </div>
                </div>

                {/* Client ID or Phone Number */}
                {loginMethod === "id" ? (
                  <EnhancedInput
                    label="Client ID"
                    type="text"
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      removeError("clientId");
                    }}
                    placeholder="SB123456789A"
                    errorKey="clientId"
                    helperText="Your unique client identifier (e.g., SB123456789A)"
                    required
                  />
                ) : (
                  <EnhancedInput
                    label="Phone Number"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      removeError("phoneNumber");
                    }}
                    placeholder="(808) 555-0123"
                    errorKey="phoneNumber"
                    helperText="Your registered phone number"
                    required
                  />
                )}

                {/* Password */}
                <EnhancedInput
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    removeError("password");
                  }}
                  placeholder="Enter your password"
                  errorKey="password"
                  helperText="Password provided with your bond contract"
                  required
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <User className="mr-2 w-4 h-4" />
                      Sign In to Client Portal
                    </>
                  )}
                </Button>

                {/* Help Section */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Need Help?</h4>
                  <div className="space-y-2 text-sm text-blue-700">
                    <p>• Your Client ID starts with "SB" followed by numbers and letters</p>
                    <p>• Your password was provided when you signed your bond contract</p>
                    <p>• Contact us at (808) 555-BAIL if you need assistance</p>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Staff Access Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Are you a staff member?
            </p>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/staff-login")}
              className="w-full backdrop-blur-sm bg-white/80 dark:bg-gray-800/80"
            >
              Access Staff Portal
            </Button>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}