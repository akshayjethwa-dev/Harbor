/**
 * GarbaCrew Cloud Functions — Entry Point
 */

import { setGlobalOptions } from "firebase-functions";

setGlobalOptions({
  maxInstances: 10,
  region: "asia-south1",
});

// ─── Epic 2: Dual Score & Trust System ───
export { onPlanStatusChange } from "./scores";
export { onRatingCreated } from "./ratings";
export { stakeTrustBalance, releaseTrustBalance } from "./trust";

// ─── Epic 3: Plan System (Sprint 3 + 4) ───
export { onPlanCreated } from "./plans";
export {
  joinPlan,
  leavePlan,
  approveJoinRequest,
  declineJoinRequest,
  autoDeclineStaleRequests,
} from "./planJoin";

// ─── Epic 4: Squad System ───
export { archiveInactiveSquads, onSquadUpdated } from "./squads";

// ─── Epic 5: Invitation System ───
export { expireOldInvitations } from "./invitations";

// ─── Epic 6: Partner Discovery ───
export { expirePartnerMatches } from "./partners";

// ─── Epic 7: Trust & Safety ───
export { onSOSCreated, expireSOSEvents } from "./sos";
export { onBlockCreated } from "./blocks";
export { onReportCreated } from "./reports";
export { onStrikeCreated, expireStrikes } from "./strikes";
export { onDisputeCreated } from "./disputes";

// ─── Epic 8: Monetization ───
export {
  onCreatePayoutForCompletedPlan,
  processPendingPayouts,
  createSubscriptionCheckout,
  cancelSubscription,
  processExpiredSubscriptions,
  createBoostCheckout,
  confirmBoostPayment,
} from "./monetization";
export { onVendorApplication } from "./vendors";
export { chargePartnershipRetainers } from "./partnerships";

// ─── Epic 9: Admin Panel ───
export {
  adminWhoami,
  adminVerify,
  adminDashboard,
  adminList,
  adminUpsert,
  adminDelete,
  adminResolveReport,
  adminResolveDispute,
  adminUserAction,
} from "./admin";

// ─── Epic 10: Notifications + Account ───
export {
  onChatMessageCreated,
  onJoinRequestCreated,
  onSOSNotification,
  onInvitationCreated,
  sendPlanReminders,
} from "./notifications";
export { deleteMyAccount } from "./accountDeletion";

// ─── Feature 8: Plan Check-in ───
export { checkInToPlan, markNoShows } from "./checkin";

// ─── Feature 10: Referral Bonus ───
export {
  getOrCreateReferralCode,
  redeemReferralCode,
} from "./referrals";

// ─── Feature 15: Rate Limits ───
export {
  getPlanCreationQuota,
  onPlanCreatedUpdateQuota,
} from "./rateLimits";

// ─── One-time backfill (comment out after running) ───
export { backfillSearchFields } from "./backfill";