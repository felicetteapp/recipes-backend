import {https} from "firebase-functions/v2";
import {beforeUserCreated} from "firebase-functions/v2/identity";
import {
  onDocumentDeleted,
  onDocumentCreated,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
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

export const onAuthUserIsCreated = beforeUserCreated(async (event) => {
  if (event.data) {
    await createUserOnDatabase(event.data.uid);
  }
});

export const onGroupDelete = onDocumentDeleted(
  "groups/{groupId}",
  async (event) => {
    await clearAllGroupData(event.params.groupId);
    return true;
  }
);

export const onGroupCreate = onDocumentCreated(
  "groups/{groupId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) {
      return false;
    }

    await addGroupToUserDatabaseDoc(data.creatorUid, event.params.groupId);
    return true;
  }
);

export const onUserWrite = onDocumentWritten(
  "users/{userId}",
  async (event) => {
    if (!event.data?.after.exists) {
      await getAuth().deleteUser(event.params.userId);

      return;
    }

    if (event.data?.before.exists) {
      const beforeData = event.data.before.data();
      const previousGroups = (beforeData?.groups || []) as Array<string>;

      const afterData = event.data.after.data();
      const currentGroups = (afterData?.groups || []) as Array<string>;

      const groupsWereUpdated =
        previousGroups.some((group) => !currentGroups.includes(group)) ||
        currentGroups.some((group) => !previousGroups.includes(group));

      if (groupsWereUpdated) {
        await updateGroupsFromUserClaims(event.params.userId, currentGroups);
      }

      return;
    }
  }
);

export const acceptInvite = https.onCall(
  {
    enforceAppCheck: true,
  },
  async (request) => {
    const {auth, data} = request;

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
  }
);
