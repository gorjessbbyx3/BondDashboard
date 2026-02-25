import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Save, Edit, Trash2, MapPin, Scale, FileText, DollarSign, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { StateConfiguration, InsertStateConfiguration, StatePricing, InsertStatePricing } from "@shared/schema";

// Comprehensive US states list
const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" }
];

interface StateConfigurationManagerProps {
  companyId: number;
}

export function StateConfigurationManager({ companyId }: StateConfigurationManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedState, setSelectedState] = useState<string>("");
  const [editingConfig, setEditingConfig] = useState<StateConfiguration | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch state configurations
  const { data: stateConfigs = [] } = useQuery<StateConfiguration[]>({
    queryKey: ["/api/admin/state-configurations"],
  });

  // Fetch pricing configurations
  const { data: statePricing = [] } = useQuery<StatePricing[]>({
    queryKey: ["/api/admin/state-pricing", companyId],
  });

  // State configuration form
  const [stateConfigForm, setStateConfigForm] = useState<Partial<InsertStateConfiguration>>({
    state: "",
    stateName: "",
    bondRegulations: {
      maxBondAmount: 100000,
      minBondAmount: 500,
      requiresLicense: true,
      licenseTypes: ["bail_bondsman", "surety"],
      requiredDocuments: ["application", "financial_statement", "background_check"],
      renewalPeriod: "annual"
    },
    courtSystems: {
      jurisdictions: [],
      courtTypes: ["municipal", "county", "district", "circuit", "supreme"],
      filingRequirements: []
    },
    licenseRequirements: {
      required: true,
      types: ["individual", "corporate"],
      fees: { application: 500, renewal: 300 },
      requirements: ["fingerprinting", "background_check", "education"]
    },
    complianceRequirements: {
      reporting: "monthly",
      auditFrequency: "annual",
      recordRetention: 5,
      requiredInsurance: 1000000
    },
    feeStructures: {
      premiumRates: { minimum: 0.10, maximum: 0.15 },
      additionalFees: { filing: 50, processing: 25 }
    },
    checkInRequirements: {
      frequency: "weekly",
      methods: ["in_person", "phone", "digital"],
      timeframes: { standard: 7, high_risk: 3 }
    },
    isActive: true
  });

  // Pricing configuration form
  const [pricingForm, setPricingForm] = useState<Partial<InsertStatePricing>>({
    state: "",
    bondType: "surety",
    minBondAmount: "500",
    maxBondAmount: "100000",
    premiumRate: "0.10",
    minimumPremium: "100",
    additionalFees: {
      filing: 50,
      processing: 25,
      court: 75
    },
    paymentPlans: {
      available: true,
      minDownPayment: 0.25,
      maxInstallments: 12
    },
    isActive: true
  });

  // Mutations
  const createStateConfigMutation = useMutation({
    mutationFn: (data: InsertStateConfiguration) =>
      apiRequest("POST", "/api/admin/state-configurations", data),
    onSuccess: () => {
      toast({ title: "State Configuration Created", description: "State configuration has been successfully created." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/state-configurations"] });
      resetForm();
    },
  });

  const updateStateConfigMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertStateConfiguration> }) =>
      apiRequest("PUT", `/api/admin/state-configurations/${id}`, data),
    onSuccess: () => {
      toast({ title: "State Configuration Updated", description: "State configuration has been successfully updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/state-configurations"] });
      setEditingConfig(null);
    },
  });

  const createPricingMutation = useMutation({
    mutationFn: (data: InsertStatePricing) =>
      apiRequest("POST", "/api/admin/state-pricing", data),
    onSuccess: () => {
      toast({ title: "Pricing Configuration Created", description: "Pricing configuration has been successfully created." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/state-pricing", companyId] });
      resetPricingForm();
    },
  });

  const resetForm = () => {
    setStateConfigForm({
      state: "",
      stateName: "",
      bondRegulations: {
        maxBondAmount: 100000,
        minBondAmount: 500,
        requiresLicense: true,
        licenseTypes: ["bail_bondsman", "surety"],
        requiredDocuments: ["application", "financial_statement", "background_check"],
        renewalPeriod: "annual"
      },
      courtSystems: {
        jurisdictions: [],
        courtTypes: ["municipal", "county", "district", "circuit", "supreme"],
        filingRequirements: []
      },
      licenseRequirements: {
        required: true,
        types: ["individual", "corporate"],
        fees: { application: 500, renewal: 300 },
        requirements: ["fingerprinting", "background_check", "education"]
      },
      complianceRequirements: {
        reporting: "monthly",
        auditFrequency: "annual",
        recordRetention: 5,
        requiredInsurance: 1000000
      },
      feeStructures: {
        premiumRates: { minimum: 0.10, maximum: 0.15 },
        additionalFees: { filing: 50, processing: 25 }
      },
      checkInRequirements: {
        frequency: "weekly",
        methods: ["in_person", "phone", "digital"],
        timeframes: { standard: 7, high_risk: 3 }
      },
      isActive: true
    });
  };

  const resetPricingForm = () => {
    setPricingForm({
      state: "",
      bondType: "surety",
      minBondAmount: "500",
      maxBondAmount: "100000",
      premiumRate: "0.10",
      minimumPremium: "100",
      additionalFees: {
        filing: 50,
        processing: 25,
        court: 75
      },
      paymentPlans: {
        available: true,
        minDownPayment: 0.25,
        maxInstallments: 12
      },
      isActive: true
    });
  };

  const handleCreateStateConfig = () => {
    if (!stateConfigForm.state || !stateConfigForm.stateName) {
      toast({
        title: "Missing Information",
        description: "Please select a state and provide the state name.",
        variant: "destructive",
      });
      return;
    }
    createStateConfigMutation.mutate(stateConfigForm as InsertStateConfiguration);
  };

  const handleUpdateStateConfig = () => {
    if (!editingConfig) return;
    updateStateConfigMutation.mutate({
      id: editingConfig.id,
      data: {
        state: stateConfigForm.state,
        stateName: stateConfigForm.stateName,
        bondRegulations: stateConfigForm.bondRegulations,
        courtSystems: stateConfigForm.courtSystems,
        licenseRequirements: stateConfigForm.licenseRequirements,
        complianceRequirements: stateConfigForm.complianceRequirements,
        feeStructures: stateConfigForm.feeStructures,
        checkInRequirements: stateConfigForm.checkInRequirements,
        isActive: stateConfigForm.isActive
      }
    });
  };

  const handleCreatePricing = () => {
    if (!pricingForm.state || !pricingForm.bondType) {
      toast({
        title: "Missing Information",
        description: "Please select a state and bond type.",
        variant: "destructive",
      });
      return;
    }
    createPricingMutation.mutate({
      ...pricingForm,
      companyId
    } as InsertStatePricing);
  };

  const getConfiguredStates = () => {
    return stateConfigs.map(config => config.state);
  };

  const getUnconfiguredStates = () => {
    const configuredStates = getConfiguredStates();
    return US_STATES.filter(state => !configuredStates.includes(state.code));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">State Configuration Manager</h2>
          <p className="text-gray-600">Configure state-specific regulations, pricing, and compliance requirements</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {stateConfigs.length} States Configured
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="regulations" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Regulations
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Configured States */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Configured States ({stateConfigs.length})
                </CardTitle>
                <CardDescription>States with complete configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {stateConfigs.map((config) => (
                    <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">{config.stateName}</span>
                        <Badge variant="outline" className="ml-2">{config.state}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingConfig(config);
                            setStateConfigForm(config);
                            setActiveTab("regulations");
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={config.isActive}
                          onCheckedChange={(checked) => {
                            updateStateConfigMutation.mutate({
                              id: config.id,
                              data: { isActive: checked }
                            });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Unconfigured States */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-orange-600" />
                  Available States ({getUnconfiguredStates().length})
                </CardTitle>
                <CardDescription>States available for configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {getUnconfiguredStates().map((state) => (
                    <div key={state.code} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{state.name}</span>
                      <Badge variant="secondary">{state.code}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="regulations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                {editingConfig ? `Edit ${editingConfig.stateName} Configuration` : "Create State Configuration"}
              </CardTitle>
              <CardDescription>
                Configure state-specific regulations and requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Select
                    value={stateConfigForm.state}
                    onValueChange={(value) => {
                      const selectedState = US_STATES.find(s => s.code === value);
                      setStateConfigForm({
                        ...stateConfigForm,
                        state: value,
                        stateName: selectedState?.name || ""
                      });
                    }}
                    disabled={!!editingConfig}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a state" />
                    </SelectTrigger>
                    <SelectContent>
                      {(editingConfig ? US_STATES : getUnconfiguredStates()).map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name} ({state.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="stateName">State Name *</Label>
                  <Input
                    id="stateName"
                    value={stateConfigForm.stateName}
                    onChange={(e) => setStateConfigForm({ ...stateConfigForm, stateName: e.target.value })}
                    readOnly
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxBondAmount">Maximum Bond Amount</Label>
                  <Input
                    id="maxBondAmount"
                    type="number"
                    value={stateConfigForm.bondRegulations?.maxBondAmount || ""}
                    onChange={(e) => setStateConfigForm({
                      ...stateConfigForm,
                      bondRegulations: {
                        ...stateConfigForm.bondRegulations,
                        maxBondAmount: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>

                <div>
                  <Label htmlFor="minBondAmount">Minimum Bond Amount</Label>
                  <Input
                    id="minBondAmount"
                    type="number"
                    value={stateConfigForm.bondRegulations?.minBondAmount || ""}
                    onChange={(e) => setStateConfigForm({
                      ...stateConfigForm,
                      bondRegulations: {
                        ...stateConfigForm.bondRegulations,
                        minBondAmount: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="requiresLicense"
                  checked={stateConfigForm.bondRegulations?.requiresLicense || false}
                  onCheckedChange={(checked) => setStateConfigForm({
                    ...stateConfigForm,
                    bondRegulations: {
                      ...stateConfigForm.bondRegulations,
                      requiresLicense: checked
                    }
                  })}
                />
                <Label htmlFor="requiresLicense">Requires License</Label>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={editingConfig ? handleUpdateStateConfig : handleCreateStateConfig}
                  disabled={createStateConfigMutation.isPending || updateStateConfigMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingConfig ? "Update Configuration" : "Create Configuration"}
                </Button>
                {editingConfig && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingConfig(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                State Pricing Configuration
              </CardTitle>
              <CardDescription>
                Configure state-specific pricing and fee structures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="pricingState">State *</Label>
                  <Select
                    value={pricingForm.state}
                    onValueChange={(value) => setPricingForm({ ...pricingForm, state: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a state" />
                    </SelectTrigger>
                    <SelectContent>
                      {stateConfigs.map((config) => (
                        <SelectItem key={config.state} value={config.state}>
                          {config.stateName} ({config.state})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bondType">Bond Type *</Label>
                  <Select
                    value={pricingForm.bondType}
                    onValueChange={(value) => setPricingForm({ ...pricingForm, bondType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bond type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="surety">Surety Bond</SelectItem>
                      <SelectItem value="cash">Cash Bond</SelectItem>
                      <SelectItem value="property">Property Bond</SelectItem>
                      <SelectItem value="federal">Federal Bond</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="premiumRate">Premium Rate (%)</Label>
                  <Input
                    id="premiumRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={pricingForm.premiumRate}
                    onChange={(e) => setPricingForm({ ...pricingForm, premiumRate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="minBondAmount">Min Bond Amount</Label>
                  <Input
                    id="minBondAmount"
                    type="number"
                    value={pricingForm.minBondAmount}
                    onChange={(e) => setPricingForm({ ...pricingForm, minBondAmount: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="maxBondAmount">Max Bond Amount</Label>
                  <Input
                    id="maxBondAmount"
                    type="number"
                    value={pricingForm.maxBondAmount}
                    onChange={(e) => setPricingForm({ ...pricingForm, maxBondAmount: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="minimumPremium">Minimum Premium</Label>
                  <Input
                    id="minimumPremium"
                    type="number"
                    value={pricingForm.minimumPremium}
                    onChange={(e) => setPricingForm({ ...pricingForm, minimumPremium: e.target.value })}
                  />
                </div>
              </div>

              <Button
                onClick={handleCreatePricing}
                disabled={createPricingMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Create Pricing Configuration
              </Button>
            </CardContent>
          </Card>

          {/* Existing Pricing Configurations */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Pricing Configurations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statePricing.map((pricing) => (
                  <div key={pricing.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{pricing.state}</Badge>
                      <span className="font-medium">{pricing.bondType}</span>
                      <span className="text-sm text-gray-600">
                        {(parseFloat(pricing.premiumRate) * 100).toFixed(2)}% premium
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Switch checked={pricing.isActive} />
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Templates
              </CardTitle>
              <CardDescription>
                Manage state-specific document templates and forms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">No document templates configured</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}