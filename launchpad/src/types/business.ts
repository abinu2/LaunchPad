export interface BusinessProfile {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;

  businessName: string;
  businessType: string;
  naicsCode: string;
  entityType: "sole_prop" | "llc" | "s_corp" | "c_corp" | "partnership";
  entityState: string;
  ein: string | null;
  formationDate: string | null;

  businessAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    county: string;
  };
  operatingJurisdictions: string[];

  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  hasOtherJob: boolean;
  estimatedW2Income: number | null;
  isFirstTimeBusiness: boolean;

  serviceTypes: ServiceType[];
  targetMarket: "residential" | "commercial" | "both";
  usesPersonalVehicle: boolean;
  hasEmployees: boolean;
  employeeCount: number;
  hasContractors: boolean;
  contractorCount: number;

  financials: {
    monthlyRevenueAvg: number;
    monthlyExpenseAvg: number;
    profitMargin: number;
    totalRevenueYTD: number;
    totalExpensesYTD: number;
    currentCashBalance: number | null;
    lastUpdated: string | null;
  };

  onboardingStage: "idea" | "formation" | "protection" | "operating" | "growing";
  completedSteps: string[];
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  estimatedDuration: number;
  supplyCost: number;
  vehicleTypes?: VehiclePricing[];
}

export interface VehiclePricing {
  vehicleType: string;
  priceMultiplier: number;
}
