import {getFirestore} from "firebase-admin/firestore";

export const inviteIsValid = async (inviteId: string, email: string) => {
  const snapshot = await getFirestore().doc(`invites/${inviteId}`).get();

  if (!snapshot.exists) {
    return {isValid: false};
  }

  const data = snapshot.data();

  if (!data) {
    return {isValid: false};
  }

  return {
    groupId: data.groupId,
    isValid: data.to === email,
  };
};


export const deleteInvite = async (inviteId:string) => {
  return getFirestore().doc(`invites/${inviteId}`).delete();
};
