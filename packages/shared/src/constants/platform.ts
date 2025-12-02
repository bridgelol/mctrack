export const Platform = {
  JAVA: 'java',
  BEDROCK: 'bedrock',
} as const;

export type Platform = (typeof Platform)[keyof typeof Platform];

export const BedrockDevice = {
  ANDROID: 'Android',
  IOS: 'iOS',
  WINDOWS: 'Windows',
  PLAYSTATION: 'PlayStation',
  XBOX: 'Xbox',
  SWITCH: 'Switch',
} as const;

export type BedrockDevice = (typeof BedrockDevice)[keyof typeof BedrockDevice];

export const SubscriptionStatus = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  PAST_DUE: 'past_due',
} as const;

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const BudgetType = {
  DAILY: 'daily',
  TOTAL: 'total',
} as const;

export type BudgetType = (typeof BudgetType)[keyof typeof BudgetType];

export const UserRole = {
  MEMBER: 'member',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
