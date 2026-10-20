# Releasing

Pushing a `v*` tag runs [`.github/workflows/release.yml`](.github/workflows/release.yml). It runs the CI checks, builds and zips `dist/`, uploads it to the Chrome Web Store, submits it for review, and attaches the zip to a GitHub release.

```bash
npm version patch        # or minor / major: bumps package.json and tags vX.Y.Z
git push --follow-tags
```

`package.json` is the only place the version lives; the manifest reads it at build time. The workflow fails if the tag doesn't match it.

## One-time setup

### 1. First submission (manual) — done

The API can only update an item that already exists, so the first version went up by hand. The item ID is `hebhnhibdecijopliikejmojkpkcelbc` ([listing](https://chromewebstore.google.com/detail/claude-exporter/hebhnhibdecijopliikejmojkpkcelbc)); the publisher ID is under **Publisher > Settings** in the Developer Dashboard. For reference, the steps were:

1. `npm ci && npm run build && (cd dist && zip -qrX ../claude-exporter.zip .)`
2. In the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), add a new item and upload the zip.
3. Fill in the **Store listing** and **Privacy** tabs and submit.
4. Note the item ID, and the publisher ID from **Publisher > Settings**.

### 2. Google Cloud service account

The workflow authenticates with [Workload Identity Federation](https://github.com/google-github-actions/auth#workload-identity-federation-through-a-service-account), so there's no key or refresh token stored in GitHub. Only tag pushes from this repo can get a token.

```bash
PROJECT_ID=your-project
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
REPO=bensquire/claude-exporter

gcloud services enable chromewebstore.googleapis.com iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com --project=$PROJECT_ID
# A new project can take a few minutes before the pool commands below stop failing with PERMISSION_DENIED.

gcloud iam service-accounts create chrome-web-store --project=$PROJECT_ID
SA=chrome-web-store@$PROJECT_ID.iam.gserviceaccount.com

gcloud iam workload-identity-pools create github --project=$PROJECT_ID --location=global
gcloud iam workload-identity-pools providers create-oidc claude-exporter \
    --project=$PROJECT_ID --location=global --workload-identity-pool=github \
    --issuer-uri=https://token.actions.githubusercontent.com \
    --attribute-mapping=google.subject=assertion.sub,attribute.repository=assertion.repository \
    --attribute-condition="assertion.repository=='$REPO' && assertion.ref.startsWith('refs/tags/v')"

gcloud iam service-accounts add-iam-policy-binding $SA --project=$PROJECT_ID \
    --role=roles/iam.workloadIdentityUser \
    --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"
```

Then add the service account's email under **Account** in the Developer Dashboard. A publisher can only have one service account.

### 3. GitHub repository variables

Under **Settings > Secrets and variables > Actions > Variables**, add:

| Variable                         | Value                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `CWS_PUBLISHER_ID`               | Publisher ID from the dashboard                                                                     |
| `CWS_EXTENSION_ID`               | Item ID from the first submission                                                                   |
| `GCP_SERVICE_ACCOUNT`            | `chrome-web-store@<project>.iam.gserviceaccount.com`                                                |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<project-number>/locations/global/workloadIdentityPools/github/providers/claude-exporter` |

None of these are secret. Optionally, add required reviewers to the `chrome-web-store` environment (**Settings > Environments**) so each release waits for your approval before uploading.
