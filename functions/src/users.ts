import * as functions from "firebase-functions";
import {getAuth} from "firebase-admin/auth";
import {Timestamp, getFirestore, FieldValue} from "firebase-admin/firestore";

const getUserGroupsClaims = async (userUid: string) => {
  const user = await getAuth().getUser(userUid);

  const currentCustomClaims = user.customClaims || {};
  const currentUserGroups = currentCustomClaims.groups || [];

  return currentUserGroups.filter(
    (thisGroup: unknown) => typeof thisGroup === "string"
  ) as string[];
};

export const updateGroupsFromUserClaims = async (
  userUid?: string,
  currentGroupsId?: Array<string>
) => {
  functions.logger.info(`Udate user ${userUid} claims`, {
    structuredData: true,
  });

  if (!userUid || !currentGroupsId) {
    return;
  }

  const currentGroupsOnClaims = await getUserGroupsClaims(userUid);

  functions.logger.info({currentGroupsOnClaims, currentGroupsId});

  const groupsToRemove = currentGroupsOnClaims.filter(
    (groupId) => !currentGroupsId.includes(groupId)
  );

  const groupsToAdd = currentGroupsId.filter(
    (groupId) => !currentGroupsOnClaims.includes(groupId)
  );

  const newClaims = currentGroupsOnClaims.filter(
    (currentGroupId) => !groupsToRemove.includes(currentGroupId)
  );

  newClaims.push(...groupsToAdd);

  functions.logger.info({groupsToAdd, groupsToRemove, newClaims});

  await getAuth().setCustomUserClaims(userUid, {
    groups: newClaims,
  });

  await getFirestore()
    .doc(`users/${userUid}`)
    .set({metadataUpdated: Timestamp.now()}, {merge: true});
};

export const createUserOnDatabase = async (userUid: string) => {
  return await getFirestore()
    .doc(`users/${userUid}`)
    .create({metadataUpdated: Timestamp.now()});
};

export const addGroupToUserDatabaseDoc = async (
  userUid: string,
  groupId: string
) => {
  return await getFirestore()
    .doc(`users/${userUid}`)
    .set({groups: FieldValue.arrayUnion(groupId)}, {merge: true});
};

export const removeGroupFromUserDatabaseDoc = async (
  userUid: string,
  groupId: string
) => {
  return await getFirestore()
    .doc(`users/${userUid}`)
    .set({groups: FieldValue.arrayRemove(groupId)}, {merge: true});
};
