import {auth, firestore, https} from "firebase-functions/v1";
import {initializeApp} from "firebase-admin/app";
import {
  addGroupToUserDatabaseDoc,
  createUserOnDatabase,
  updateGroupsFromUserClaims,
} from "./users";
import {getAuth} from "firebase-admin/auth";
import {deleteInvite, inviteIsValid} from "./invites";
import {clearAllGroupData} from "./groups";

initializeApp();

export const onAuthUserIsCreated = auth.user().onCreate(async ({uid}) => {
  await createUserOnDatabase(uid);

  return true;
});

export const onGroupDelete = firestore
  .document("groups/{groupId}")
  .onDelete(async (_, context) => {
    await clearAllGroupData(context.params.groupId);
    return true;
  });

export const onGroupCreate = firestore
  .document("groups/{groupId}")
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    if (!data) {
      return false;
    }

    await addGroupToUserDatabaseDoc(data.creatorUid, context.params.groupId);
    return true;
  });

export const onUserWrite = firestore
  .document("users/{userId}")
  .onWrite(async (a, context) => {
    if (!a.after.exists) {
      await getAuth().deleteUser(context.params.userId);

      return;
    }

    if (a.before.exists) {
      const beforeData = a.before.data();
      const previousGroups = (beforeData?.groups || []) as Array<string>;

      const afterData = a.after.data();
      const currentGroups = (afterData?.groups || []) as Array<string>;

      const groupsWereUpdated =
        previousGroups.some((group) => !currentGroups.includes(group)) ||
        currentGroups.some((group) => !previousGroups.includes(group));

      if (groupsWereUpdated) {
        await updateGroupsFromUserClaims(context.params.userId, currentGroups);
      }

      return;
    }
  });

export const acceptInvite = https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new Error("missing auth");
  }

  const auth = context.auth;

  if (!auth) {
    throw new Error("missing auth");
  }

  const authEmail = auth.token.email;

  if (!authEmail) {
    throw new Error("missing email");
  }

  if (!data) {
    throw new Error("missing data");
  }

  if (!data.inviteId) {
    throw new Error("missing inviteId");
  }

  const {isValid, groupId} = await inviteIsValid(data.inviteId, authEmail);

  if (!isValid) {
    throw new Error("invite is not valid");
  }

  if (!groupId) {
    throw new Error("missing groupId");
  }

  await addGroupToUserDatabaseDoc(auth.uid, groupId);

  return deleteInvite(data.inviteId);
});
