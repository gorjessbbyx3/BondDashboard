import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, AlertTriangle, CheckCircle, Camera, Fingerprint, User, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const checkInSchema = z.object({
  notes: z.string().optional(),
  location: z.string().min(1, "GPS location is mandatory for check-in"),
  biometricData: z.string().optional(),
  biometricType: z.enum(["facial", "fingerprint"]).optional(),
});

type CheckInFormData = z.infer<typeof checkInSchema>;

interface CheckInFormProps {
  clientId: number;
}

export function CheckInForm({ clientId }: CheckInFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState<string>("");
  const [locationError, setLocationError] = useState<string>("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [biometricData, setBiometricData] = useState<string>("");
  const [biometricType, setBiometricType] = useState<"facial" | "fingerprint" | null>(null);
  const [isFirstCheckIn, setIsFirstCheckIn] = useState<boolean>(false);
  const [biometricError, setBiometricError] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isFingerprinting, setIsFingerprinting] = useState(false);

  const form = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      notes: "",
      location: "",
      biometricData: "",
      biometricType: undefined,
    },
  });

  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("GPS location is mandatory for check-in. This device does not support GPS.");
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setLocation(locationString);
        form.setValue("location", locationString);
        setIsLoadingLocation(false);
        
      },
      (error) => {
        let errorMessage = "GPS location is mandatory for check-in. ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Location access denied. You must enable GPS permissions to check in.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "GPS signal unavailable. Move to an area with GPS reception and try again.";
            break;
          case error.TIMEOUT:
            errorMessage += "GPS request timed out. Try again with better GPS reception.";
            break;
          default:
            errorMessage += "GPS error occurred. Location services must be enabled.";
        }
        setLocationError(errorMessage);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  };

  // Check if this is the first check-in requiring biometric verification
  useEffect(() => {
    const checkFirstCheckIn = async () => {
      try {
        const response = await apiRequest(`/api/clients/${clientId}/check-ins`);
        const hasExistingCheckIns = response && Array.isArray(response) && response.length > 0;
        setIsFirstCheckIn(!hasExistingCheckIns);
      } catch (error) {
        // On error, assume first check-in for security
        setIsFirstCheckIn(true);
      }
    };
    
    checkFirstCheckIn();
    getCurrentLocation();
  }, [clientId]);

  const startFacialRecognition = async () => {
    setBiometricError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setBiometricType("facial");
      }
    } catch (error: any) {
      console.error('Camera access error:', error);
      if (error.name === 'NotAllowedError') {
        setBiometricError("Camera access denied. Facial verification is required for initial check-in.");
      } else if (error.name === 'NotFoundError') {
        setBiometricError("No camera detected. Use fingerprint verification instead.");
      } else {
        setBiometricError("Camera unavailable. Try fingerprint verification.");
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setBiometricData(imageData);
        form.setValue("biometricData", imageData);
        form.setValue("biometricType", "facial");
        
        // Stop camera
        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setIsCameraActive(false);
        
        toast({
          title: "Facial Verification Complete",
          description: "Identity verification captured successfully.",
        });
      }
    }
  };

  const startFingerprintScan = async () => {
    setBiometricError("");
    setIsFingerprinting(true);
    
    try {
      if (!window.PublicKeyCredential || !navigator.credentials) {
        throw new Error("NotSupportedError");
      }

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: {
            name: "SecureBond Check-in System",
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(`client-${clientId}-${Date.now()}`),
            name: `client-${clientId}`,
            displayName: `SecureBond Client ${clientId}`,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: "direct"
        }
      }) as PublicKeyCredential;

      if (credential && credential.rawId) {
        const fingerprintData = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        setBiometricData(fingerprintData);
        setBiometricType("fingerprint");
        form.setValue("biometricData", fingerprintData);
        form.setValue("biometricType", "fingerprint");
        
        toast({
          title: "Fingerprint Verification Complete",
          description: "Biometric identity verification successful.",
        });
      }
    } catch (error: any) {
      console.error('Fingerprint error:', error);
      if (error.name === 'NotSupportedError') {
        setBiometricError("Fingerprint authentication not supported. Use facial verification.");
      } else if (error.name === 'NotAllowedError') {
        setBiometricError("Fingerprint access denied. Biometric verification is required.");
      } else {
        setBiometricError("Fingerprint scan failed. Try facial verification instead.");
      }
    } finally {
      setIsFingerprinting(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setIsCameraActive(false);
    }
  };

  const checkInMutation = useMutation({
    mutationFn: async (data: CheckInFormData) => {
      // Critical validation - no check-in without GPS
      if (!data.location) {
        throw new Error("GPS location is mandatory for check-in verification");
      }
      
      // Critical validation - first check-in requires biometric
      if (isFirstCheckIn && !data.biometricData) {
        throw new Error("Biometric verification is mandatory for initial check-in");
      }

      return apiRequest("/api/check-ins", "POST", {
        clientId,
        location: data.location,
        notes: data.notes || "",
        checkInTime: new Date().toISOString(),
        biometricData: data.biometricData || null,
        biometricType: data.biometricType || null,
        isFirstCheckIn,
        gpsAccuracy: "high-precision",
      });
    },
    onSuccess: () => {
      toast({
        title: "Check-in Verified",
        description: "Location and identity verification completed successfully.",
      });
      form.reset();
      setLocation("");
      setBiometricData("");
      setBiometricType(null);
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/checkins"] });
    },
    onError: (error: any) => {
      console.error("Check-in verification failed:", error);
      toast({
        title: "Check-in Failed",
        description: error.message || "Verification failed. All requirements must be met.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CheckInFormData) => {
    // Final validation before submission
    if (!location) {
      toast({
        title: "GPS Location Required",
        description: "GPS location verification is mandatory. Enable location services.",
        variant: "destructive",
      });
      return;
    }

    if (isFirstCheckIn && !biometricData) {
      toast({
        title: "Biometric Verification Required", 
        description: "Identity verification is mandatory for initial check-in.",
        variant: "destructive",
      });
      return;
    }

    checkInMutation.mutate(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Secure Check-In Verification
          {isFirstCheckIn && (
            <Badge variant="outline" className="ml-2">
              <User className="h-3 w-3 mr-1" />
              Identity Verification Required
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* GPS Location Verification */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">GPS Location Verification</span>
                  <Badge variant="destructive" className="text-xs">MANDATORY</Badge>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={getCurrentLocation}
                  disabled={isLoadingLocation}
                >
                  {isLoadingLocation ? "Acquiring GPS..." : "Refresh GPS"}
                </Button>
              </div>

              {location ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    GPS location verified: {location}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant={locationError ? "destructive" : "default"}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {locationError || "GPS location acquisition required - enable location services"}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Biometric Verification for First Check-in */}
            {isFirstCheckIn && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Identity Verification</span>
                  <Badge variant="destructive" className="text-xs">MANDATORY</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Facial Recognition */}
                  <Card className="p-4 border-2">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        <span className="font-medium">Facial Recognition</span>
                      </div>
                      
                      {!isCameraActive && biometricType !== "facial" && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={startFacialRecognition}
                          className="w-full"
                        >
                          Start Camera Verification
                        </Button>
                      )}
                      
                      {isCameraActive && (
                        <div className="space-y-2">
                          <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full rounded border bg-black"
                            style={{ maxHeight: "200px" }}
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              onClick={capturePhoto}
                              className="flex-1"
                            >
                              Capture Identity Photo
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={stopCamera}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {biometricType === "facial" && biometricData && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Facial verification completed
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </Card>

                  {/* Fingerprint Verification */}
                  <Card className="p-4 border-2">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Fingerprint className="h-4 w-4" />
                        <span className="font-medium">Fingerprint Scan</span>
                      </div>
                      
                      {biometricType !== "fingerprint" && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={startFingerprintScan}
                          disabled={isFingerprinting}
                          className="w-full"
                        >
                          {isFingerprinting ? "Scanning Fingerprint..." : "Start Fingerprint Scan"}
                        </Button>
                      )}
                      
                      {biometricType === "fingerprint" && biometricData && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Fingerprint verification completed
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </Card>
                </div>
                
                {biometricError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{biometricError}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Optional Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about this check-in..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={
                checkInMutation.isPending || 
                !location || 
                (isFirstCheckIn && !biometricData)
              }
            >
              {checkInMutation.isPending ? "Verifying Check-in..." : "Submit Verified Check-In"}
            </Button>
          </form>
        </Form>

        {/* Hidden canvas for photo processing */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}

export default CheckInForm;