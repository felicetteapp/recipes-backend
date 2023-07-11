import {getFirestore} from "firebase-admin/firestore";
import {removeGroupFromUserDatabaseDoc} from "./users";

export const deleteAllIngredients = async (groupId: string) => {
  const snapshot = await getFirestore()
    .collection(`groups/${groupId}/ingredients`)
    .get();

  const promises = snapshot.docs.map((thisDoc) => thisDoc.ref.delete());

  return Promise.all(promises);
};

export const deleteAllRecipes = async (groupId: string) => {
  const snapshot = await getFirestore()
    .collection(`groups/${groupId}/recipes`)
    .get();

  const promises = snapshot.docs.map((thisDoc) => thisDoc.ref.delete());

  return Promise.all(promises);
};

export const deleteGroupForAllUsers = async (groupId: string) => {
  const users = await getFirestore()
    .collection("users")
    .where("groups", "array-contains", groupId)
    .get();

  const promises = users.docs.map((user) => {
    removeGroupFromUserDatabaseDoc(user.id, groupId);
  });

  return Promise.all(promises);
};

export const clearAllGroupData = async (groupId: string) => {
  await deleteGroupForAllUsers(groupId);
  await deleteAllIngredients(groupId);
  await deleteAllRecipes(groupId);
};
