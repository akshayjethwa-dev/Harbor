import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

export const deleteMyAccount = onCall(
  { invoker: "public", region: "asia-south1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;

    logger.info(`Account deletion requested for ${uid}`);

    // 1. Anonymize user doc (keep the UID for referential integrity but scrub PII)
    const userRef = db.collection("users").doc(uid);
    await userRef.set(
      {
        phone: null,
        email: null,
        displayName: null,
        photoUrl: null,
        name: "Deleted user",
        bio: "",
        nameLower: "deleted user",
        isDeleted: true,
        deletedAt: FieldValue.serverTimestamp(),
        profileComplete: false,
        lookingForPartner: false,
      },
      { merge: true }
    );

    // 2. Remove from chats they participate in
    const chatsSnap = await db
      .collection("chats")
      .where("participants", "array-contains", uid)
      .get();
    for (const chatDoc of chatsSnap.docs) {
      await chatDoc.ref.update({
        participants: FieldValue.arrayRemove(uid),
      });
    }

    // 3. Remove from squads they're a member of (not admin — squad stays)
    const squadsSnap = await db
      .collection("squads")
      .where("memberUids", "array-contains", uid)
      .get();
    for (const squadDoc of squadsSnap.docs) {
      const squad = squadDoc.data();
      const updates: any = {
        memberUids: FieldValue.arrayRemove(uid),
        memberDetails: (squad.memberDetails ?? []).filter(
          (m: any) => m.uid !== uid
        ),
        coAdminUids: (squad.coAdminUids ?? []).filter((u: string) => u !== uid),
      };
      // If they were the admin and no co-admins exist, archive
      if (squad.adminUid === uid && (squad.coAdminUids ?? []).length === 0) {
        updates.isArchived = true;
        updates.isActive = false;
        updates.archivedReason = "Admin deleted account";
      }
      await squadDoc.ref.update(updates);
    }

    // 4. Delete device token
    await db.collection("deviceTokens").doc(uid).delete().catch(() => {});

    // 5. Delete emergency contacts
    const contactsSnap = await db
      .collection("users")
      .doc(uid)
      .collection("emergencyContacts")
      .get();
    for (const c of contactsSnap.docs) {
      await c.ref.delete();
    }

    // 6. Delete Firebase Auth account
    try {
      await getAuth().deleteUser(uid);
    } catch (err: any) {
      logger.warn(`Could not delete auth user ${uid}: ${err.message}`);
    }

    logger.info(`Account deletion complete for ${uid}`);
    return { ok: true };
  }
);