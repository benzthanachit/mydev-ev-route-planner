# Google Cloud Run Deployment Guide

This guide explains how to build and deploy the `mydev-ev-route-planner` application directly to [Google Cloud Run](https://cloud.google.com/run). 

Using Google Cloud Run is an excellent way to run auto-scaling Node.js/Next.js containers without managing the underlying infrastructure.

## Prerequisites

1.  **Google Cloud Platform Account**: Ensure you have an active GCP project with billing enabled.
2.  **Enable Required APIs**:
    Enable the following APIs in your GCP Project:
    *   **Cloud Build API** (for building the container)
    *   **Cloud Run API** (for running the container)
    *   **Artifact Registry API** (for storing container images)
3.  **Install Google Cloud SDK (`gcloud`)**:
    *   Download and install from [Google Cloud CLI documentation](https://cloud.google.com/sdk/docs/install-windows) for Windows.
    *   Initialize it by running: `gcloud init` in your terminal.

## Preparing the Code
By default, Dockerizing a Next.js app on Cloud Run works best with Next.js's "standalone" output. We have already modified `next.config.ts` to include `output: 'standalone'` and created the `Dockerfile`.

Make sure you have your environment variables handy (e.g., from your `.env.local` file), which includes your Supabase and Maps tokens.

## Deployment Steps

Open a terminal (PowerShell, Command Prompt, or VS Code Terminal) in the project root directory.

### 1. Extract Public Variables for Build

Next.js needs the `NEXT_PUBLIC_*` variables to be available **during the build process** so they can be baked into the client bundle. The easiest and most reliable way to provide these to Google Cloud Build (when using a custom Dockerfile) is to create a `.env.production` file. 

Create a `.env.production` file in your project root containing only your public variables:
```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_OCM_API_KEY=your_ocm_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
*(The `.dockerignore` file allows `.env.production` to be copied into the Docker container during the build stage, allowing Next.js to read them securely.)*

### 2. Build and Deploy using Cloud Run Source Deploy (Method 1: Easiest)

Run the following command to let Google Cloud Build the Docker image and deploy it directly. Note that we still pass **secret** variables (like `GEMINI_API_KEY`) using `--set-env-vars` because those only need to be present at runtime and should not be baked into the frontend.

```powershell
gcloud run deploy ev-route-planner `
  --source . `
  --region asia-southeast1 `
  --allow-unauthenticated `
  --set-env-vars GEMINI_API_KEY=your_gemini_key
```

### Explanation of the flags:

*   `--source .`: Tells `gcloud` to build the Docker image using the `Dockerfile` in the current directory and push it to Artifact Registry automatically.
*   `--region asia-southeast1`: The Google Cloud region to deploy your service to.
*   `--allow-unauthenticated`: Makes your service publicly accessible over the internet rather than requiring IAM authentication.
*   `--set-env-vars`: These are passed as `ENV` variables to the container dynamically **at runtime**. Secret keys (like `GEMINI_API_KEY`) should only be provided here.

---

### Alternative: Build Locally and Deploy (Method 2: Manual Control)

If you prefer to build the Docker image on your local machine and then deploy the built image, follow these steps. This requires an Artifact Registry repository.

**Step 2.1: Authenticate Docker to Google Cloud**
```powershell
gcloud auth configure-docker asia-southeast1-docker.pkg.dev
```

**Step 2.2: Create an Artifact Registry Repository (Only need to do this once)**
```powershell
gcloud artifacts repositories create ev-repo `
  --repository-format=docker `
  --location=asia-southeast1 `
  --description="Docker repository for EV Planner"
```

**Step 2.3: Build the Image Locally**
Build the image locally. Make sure you have your `.env.production` file ready as Next.js will use it during this build. Replace `[PROJECT_ID]` with your actual GCP Project ID.

```powershell
docker build -t asia-southeast1-docker.pkg.dev/[PROJECT_ID]/ev-repo/ev-route-planner:latest .
```

**Step 2.4: Push the Image to Artifact Registry**
```powershell
docker push asia-southeast1-docker.pkg.dev/[PROJECT_ID]/ev-repo/ev-route-planner:latest
```

**Step 2.5: Deploy from the Existing Image**
Deploy the image you just pushed. Note we use `--image` instead of `--source`:

```powershell
gcloud run deploy ev-route-planner `
  --image asia-southeast1-docker.pkg.dev/[PROJECT_ID]/ev-repo/ev-route-planner:latest `
  --region asia-southeast1 `
  --allow-unauthenticated `
  --set-env-vars GEMINI_API_KEY=your_gemini_key
```

---

### 3. Access the Application

Once the deployment finishes, `gcloud` will output a **Service URL** in your terminal.
It will look something like:
`Service [ev-route-planner] revision [ev-route-planner-00001-xxx] has been deployed and is serving 100 percent of traffic.` 
`Service URL: https://ev-route-planner-xxxxxxxxx-as.a.run.app`

Open your web browser and navigate to the printed URL!

## Troubleshooting

*   **Failed Build due to "standalone" output missing**: Ensure your `next.config.ts` contains `output: 'standalone'`.
*   **Missing Environment Variables on Client**: If you see missing tokens on the map, ensure you provided them specifically in the `--set-build-env-vars` flag, as they can't be added to Next.js public variables retroactively out-of-the-box in standalone mode without rebuilds.
*   **Container Crash loops or Permission Errors**: Our `Dockerfile` correctly creates a `nextjs` non-root user and maps the directories appropriately, which matches Cloud Run security best practices. However, you can check logs by running:
    ```powershell
    gcloud run logs read ev-route-planner
    ```
