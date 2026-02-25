import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { apiRequest } from "@/lib/queryClient";

interface PrivacyAcknowledgment {
  id: number;
  userId: string;
  acknowledgedAt: Date;
  dataTypes: string[];
  ipAddress: string;
  userAgent: string;
  version: string;
}

export function usePrivacyAcknowledgment() {
  const { user } = useAuth();
  const [hasAcknowledged, setHasAcknowledged] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const CURRENT_PRIVACY_VERSION = "1.0";

  useEffect(() => {
    if (user) {
      checkAcknowledgmentStatus();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const checkAcknowledgmentStatus = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/privacy/acknowledgment/${user.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.acknowledged && data.version === CURRENT_PRIVACY_VERSION) {
          setHasAcknowledged(true);
        } else {
          setHasAcknowledged(false);
        }
      } else if (response.status === 404) {
        setHasAcknowledged(false);
      } else {
        setError("Failed to check privacy acknowledgment status");
      }
    } catch (err: any) {
      setError("Failed to check privacy acknowledgment status");
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgePrivacy = async (dataTypes: string[]) => {
    if (!user) {
      throw new Error("User must be authenticated to acknowledge privacy policy");
    }

    try {
      setIsLoading(true);
      setError(null);

      const acknowledgmentData = {
        userId: user.id,
        dataTypes,
        version: CURRENT_PRIVACY_VERSION,
        ipAddress: await getClientIP(),
        userAgent: navigator.userAgent,
        acknowledgedAt: new Date().toISOString()
      };

      const response = await fetch("/api/privacy/acknowledgment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(acknowledgmentData)
      });

      if (!response.ok) {
        throw new Error("Failed to record privacy acknowledgment");
      }

      setHasAcknowledged(true);
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to record privacy acknowledgment");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getClientIP = async (): Promise<string> => {
    try {
      return window.location.hostname || 'unknown';
    } catch {
      return "unknown";
    }
  };

  return {
    hasAcknowledged,
    isLoading,
    error,
    acknowledgePrivacy,
    currentVersion: CURRENT_PRIVACY_VERSION,
    checkAcknowledgmentStatus
  };
}