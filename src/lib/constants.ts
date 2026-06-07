export type SubscriptionPlan = "none" | "pro" | "premium";

export type UserRole = "user" | "admin";

export type UserStatus = "pending" | "active" | "suspended";

export const PLAN_LIMITS = {
  none: {
    vehicles: 3,
    dailyQueries: 0,
    customers: 50,
    rentalsPerMonth: 20,
    calendar: false,
    accounting: false,
  },
  pro: {
    vehicles: 5,
    dailyQueries: 10,
    customers: 500,
    rentalsPerMonth: 200,
    calendar: false,
    accounting: false,
  },
  premium: {
    vehicles: Infinity,
    dailyQueries: Infinity,
    customers: Infinity,
    rentalsPerMonth: Infinity,
    calendar: true,
    accounting: true,
  },
} as const;

export const EXPENSE_CATEGORIES = [
  "Yakıt",
  "Bakım & Onarım",
  "Sigorta",
  "Kasko",
  "MTV & Vergi",
  "Kira / Depo",
  "Personel",
  "Pazarlama",
  "Ofis Giderleri",
  "Diğer",
] as const;

export const INCOME_CATEGORIES = [
  "Kiralama Geliri",
  "Ek Hizmet",
  "Ceza / Hasar",
  "Depozito İadesi Farkı",
  "Diğer",
] as const;

export const SUBSCRIPTION_PRICES = {
  pro: {
    monthly: 999,
    yearly: 9_990,
  },
  premium: {
    monthly: 1_999,
    yearly: 19_990,
  },
} as const;
