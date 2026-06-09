import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { isNative, getPlatform } from '@/lib/platform';

// RevenueCat publishable API keys — safe to store in codebase
const RC_APPLE_KEY = 'appl_YOUR_REVENUECAT_APPLE_KEY';
const RC_GOOGLE_KEY = 'goog_YOUR_REVENUECAT_GOOGLE_KEY';

export async function initPurchases(userId?: string) {
  if (!isNative()) return;

  const platform = getPlatform();
  const apiKey = platform === 'ios' ? RC_APPLE_KEY : RC_GOOGLE_KEY;

  await Purchases.configure({
    apiKey,
    appUserID: userId || undefined,
  });

  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
}

export async function getOfferings() {
  if (!isNative()) return null;
  const result = await Purchases.getOfferings();
  return result;
}

export async function purchasePackage(pkg: any) {
  if (!isNative()) throw new Error('Native purchases only');
  const result = await Purchases.purchasePackage({ aPackage: pkg });
  return result;
}

export async function restorePurchases() {
  if (!isNative()) throw new Error('Native purchases only');
  const { customerInfo } = await Purchases.restorePurchases();
  return customerInfo;
}

export async function checkEntitlements() {
  if (!isNative()) return { isActive: false };
  const { customerInfo } = await Purchases.getCustomerInfo();
  const entitlement = customerInfo.entitlements.active['pro_access'];
  return {
    isActive: !!entitlement,
    plan: entitlement?.productIdentifier || null,
    expiresDate: entitlement?.expirationDate || null,
  };
}

export async function setRevenueCatUserId(userId: string) {
  if (!isNative()) return;
  await Purchases.logIn({ appUserID: userId });
}
