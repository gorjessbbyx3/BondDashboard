import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BondFormData {
  clientId: number;
  bondAmount: string;
  bondType: string;
  premiumRate: string;
  downPayment?: string;
  courtDate?: string;
  courtLocation?: string;
  caseNumber?: string;
  charges?: string;
  collateral?: string;
  cosigner?: string;
  cosignerPhone?: string;
  riskAssessment: string;
  notes?: string;
}

interface BondFormProps {
  onSubmit: (data: BondFormData) => void;
  isLoading: boolean;
  clientId: number;
}

export default function BondForm({ onSubmit, isLoading, clientId }: BondFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<BondFormData>({
    clientId,
    bondAmount: "",
    bondType: "surety",
    premiumRate: "10",
    downPayment: "",
    courtDate: "",
    courtLocation: "",
    caseNumber: "",
    charges: "",
    collateral: "",
    cosigner: "",
    cosignerPhone: "",
    riskAssessment: "medium",
    notes: "",
  });

  const handleInputChange = (field: keyof BondFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bondAmount || parseFloat(formData.bondAmount) <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid bond amount", variant: "destructive" });
      return;
    }

    onSubmit(formData);
  };

  const calculatePremium = () => {
    const amount = parseFloat(formData.bondAmount || "0");
    const rate = parseFloat(formData.premiumRate || "10");
    return (amount * rate / 100).toFixed(2);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bond Amount */}
        <div className="space-y-2">
          <Label htmlFor="bondAmount">Bond Amount *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="bondAmount"
              type="number"
              value={formData.bondAmount}
              onChange={(e) => handleInputChange("bondAmount", e.target.value)}
              placeholder="50000"
              className="pl-9"
              required
            />
          </div>
        </div>

        {/* Bond Type */}
        <div className="space-y-2">
          <Label htmlFor="bondType">Bond Type</Label>
          <Select value={formData.bondType} onValueChange={(value) => handleInputChange("bondType", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select bond type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="surety">Surety Bond</SelectItem>
              <SelectItem value="cash">Cash Bond</SelectItem>
              <SelectItem value="property">Property Bond</SelectItem>
              <SelectItem value="personal">Personal Recognizance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Premium Rate */}
        <div className="space-y-2">
          <Label htmlFor="premiumRate">Premium Rate (%)</Label>
          <Input
            id="premiumRate"
            type="number"
            value={formData.premiumRate}
            onChange={(e) => handleInputChange("premiumRate", e.target.value)}
            placeholder="10"
            min="0"
            max="100"
            step="0.1"
          />
        </div>

        {/* Down Payment */}
        <div className="space-y-2">
          <Label htmlFor="downPayment">Down Payment</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="downPayment"
              type="number"
              value={formData.downPayment}
              onChange={(e) => handleInputChange("downPayment", e.target.value)}
              placeholder="5000"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Premium Calculation Display */}
      {formData.bondAmount && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Calculated Premium:</span>
              <span className="text-lg font-bold text-blue-700">${calculatePremium()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Court Date */}
        <div className="space-y-2">
          <Label htmlFor="courtDate">Court Date</Label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="courtDate"
              type="date"
              value={formData.courtDate}
              onChange={(e) => handleInputChange("courtDate", e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Court Location */}
        <div className="space-y-2">
          <Label htmlFor="courtLocation">Court Location</Label>
          <Input
            id="courtLocation"
            value={formData.courtLocation}
            onChange={(e) => handleInputChange("courtLocation", e.target.value)}
            placeholder="Honolulu District Court"
          />
        </div>

        {/* Case Number */}
        <div className="space-y-2">
          <Label htmlFor="caseNumber">Case Number</Label>
          <Input
            id="caseNumber"
            value={formData.caseNumber}
            onChange={(e) => handleInputChange("caseNumber", e.target.value)}
            placeholder="CR-2024-001234"
          />
        </div>

        {/* Risk Assessment */}
        <div className="space-y-2">
          <Label htmlFor="riskAssessment">Risk Assessment</Label>
          <Select value={formData.riskAssessment} onValueChange={(value) => handleInputChange("riskAssessment", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select risk level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
              <SelectItem value="critical">Critical Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Charges */}
      <div className="space-y-2">
        <Label htmlFor="charges">Charges</Label>
        <Textarea
          id="charges"
          value={formData.charges}
          onChange={(e) => handleInputChange("charges", e.target.value)}
          placeholder="Enter charges and details..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Collateral */}
        <div className="space-y-2">
          <Label htmlFor="collateral">Collateral</Label>
          <Textarea
            id="collateral"
            value={formData.collateral}
            onChange={(e) => handleInputChange("collateral", e.target.value)}
            placeholder="Describe collateral..."
            rows={2}
          />
        </div>

        {/* Cosigner Information */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cosigner">Cosigner Name</Label>
            <Input
              id="cosigner"
              value={formData.cosigner}
              onChange={(e) => handleInputChange("cosigner", e.target.value)}
              placeholder="Full name of cosigner"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cosignerPhone">Cosigner Phone</Label>
            <Input
              id="cosignerPhone"
              value={formData.cosignerPhone}
              onChange={(e) => handleInputChange("cosignerPhone", e.target.value)}
              placeholder="(808) 555-0123"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange("notes", e.target.value)}
          placeholder="Additional information and notes..."
          rows={3}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="submit"
          disabled={isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? "Creating Bond..." : "Submit Bond"}
        </Button>
      </div>
    </form>
  );
}