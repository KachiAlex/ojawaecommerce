# Cloud Build setup for deploying Firebase Functions

This document shows how to configure Google Cloud Build to deploy the `functions` codebase automatically on push.

Prerequisites
- Google Cloud project with Firebase enabled (project ID: your Firebase project)
- Owner or sufficient IAM permissions to create triggers and grant roles

High-level steps
1. Enable required APIs:

```bash
gcloud services enable cloudbuild.googleapis.com cloudfunctions.googleapis.com cloudresourcemanager.googleapis.com artifactregistry.googleapis.com
```

2. Grant Cloud Build service account deploy permissions (replace `$PROJECT_ID`):

```bash
PROJECT_ID=ojawa-ecommerce
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
CLOUD_BUILD_SA="$PROJECT_NUMBER@cloudbuild.gserviceaccount.com"

# Grant minimum roles
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$CLOUD_BUILD_SA" --role=roles/cloudfunctions.admin
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$CLOUD_BUILD_SA" --role=roles/iam.serviceAccountUser
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$CLOUD_BUILD_SA" --role=roles/cloudbuild.builds.editor

# Optionally grant Storage/ArtifactRegistry permissions if you use them
```

3. Create a Cloud Build trigger (GitHub example):

Use the Cloud Console or gcloud CLI. Example using gcloud (requires GitHub app setup):

```bash
gcloud beta builds triggers create github \
  --repo-name="<REPO_NAME>" \
  --repo-owner="<REPO_OWNER>" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --description="Deploy Firebase functions on push to main"
```

4. What `cloudbuild.yaml` does (in repository root)
- Installs Node dependencies in `functions` (and `functions-routes` if present)
- Runs `npx firebase-tools@latest deploy --only functions --project="$PROJECT_ID"` using the Cloud Build service account

5. Post-deploy smoke test (recommended)

Add a final step in `cloudbuild.yaml` or a separate Cloud Build step to curl the deployed endpoint and fail the build if it returns non-2xx.

Notes and troubleshooting
- If your code requires environment variables, store secrets in Secret Manager and expose them during the build.
- The `cloudbuild.yaml` uses the Cloud Build service account credentials; make sure the service account has `iam.serviceAccountUser` and `cloudfunctions.admin` roles.
- If you prefer to use `gcloud functions deploy` instead of `firebase-tools`, adapt the deploy step accordingly.
