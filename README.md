# Felicette Recipes Backend

![Felicette Recipes logo](.github/logo192.png)

Backend that supports the **Felicette Recipes** application

## Configurations

### Firebase

Make sure your project have an billing plan that allows Cloud Functions

### Github

#### Variables

Add `FIREBASE_PROJECT_ID` variable to the repository

#### Secrets

Add `GCP_SA_KEY` secret to the repository with the json formatted Service Account key with the necessary permissions to deploy functions, firestore indexes and rules
