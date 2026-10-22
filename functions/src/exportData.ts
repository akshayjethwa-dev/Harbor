// functions/src/exportData.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();
const bucket = admin.storage().bucket();

export const exportUserData = onCall(async (request) => {
  // 1. Verify Auth
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const uid = request.auth.uid;
  logger.info(`Starting data export for user: ${uid}`);

  // 2. Check if user exists (Edge Case: Export after deletion)
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User data not found or account deleted.");
  }

  try {
    // 3. Fetch Core Profile
    const userData = userSnap.data();

    // 4. Fetch Plans (where user is host OR participant)
    const hostedPlansSnap = await db.collection("plans").where("hostUid", "==", uid).get();
    const joinedPlansSnap = await db.collection("plans").where("participants", "array-contains", uid).get();
    
    const planIds = new Set<string>();
    const plansData: any[] = [];

    hostedPlansSnap.forEach((doc) => {
      planIds.add(doc.id);
      plansData.push({ id: doc.id, ...doc.data() });
    });
    joinedPlansSnap.forEach((doc) => {
      if (!planIds.has(doc.id)) {
        planIds.add(doc.id);
        plansData.push({ id: doc.id, ...doc.data() });
      }
    });

    // 5. Fetch Squads
    const squadsSnap = await db.collection("squads").where("memberUids", "array-contains", uid).get();
    const squadsData = squadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 6. Fetch Expenses & Chats for these Plans/Squads
    const expensesData: any[] = [];
    const chatsData: any[] = [];

    // Fetch plan-specific data
    for (const planId of Array.from(planIds)) {
      const expensesSnap = await db.collection("plans").doc(planId).collection("expenses").get();
      expensesSnap.forEach(d => expensesData.push({ planId, ...d.data() }));

      const messagesSnap = await db.collection("chats").doc(`plan_${planId}`).collection("messages").get();
      messagesSnap.forEach(d => chatsData.push({ chatType: "plan", planId, ...d.data() }));
    }

    // Fetch squad-specific data (chats)
    for (const squad of squadsData) {
      const messagesSnap = await db.collection("chats").doc(`squad_${squad.id}`).collection("messages").get();
      messagesSnap.forEach(d => chatsData.push({ chatType: "squad", squadId: squad.id, ...d.data() }));
    }

    // 7. Assemble the final payload
    const exportPayload = {
      exportDate: new Date().toISOString(),
      profile: userData,
      plans: plansData,
      squads: squadsData,
      expenses: expensesData,
      chatHistory: chatsData,
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);

    // 8. Upload to Firebase Storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `exports/${uid}/Kithra_data_${timestamp}.json`;
    const file = bucket.file(fileName);

    await file.save(jsonString, {
      contentType: "application/json",
      metadata: { cacheControl: "private, max-age=0" },
    });

    // 9. Generate a signed URL (valid for 24 hours)
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    logger.info(`Data export successful for ${uid}. File: ${fileName}`);

    return { 
      success: true, 
      downloadUrl: signedUrl,
      message: "Export ready. Link valid for 24 hours." 
    };

  } catch (error: any) {
    logger.error(`Data export failed for ${uid}`, error);
    throw new HttpsError("internal", "Failed to generate export. Please try again later.");
  }
});