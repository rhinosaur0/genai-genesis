# Google Cloud Platform - Help

Credit goes to ChatGPT, Gemini, Copilot, Claude 3.7, and other various LLM models for contributing to this document.

## Building Containers

### Build the image

```bash
docker build -t region-docker.pkg.dev/project-id/repo/name:tag .
```

Tag image:

```bash
docker tag region-docker.pkg.dev/project-id/repo/name:tag region-docker.pkg.dev/project-id/repo/name:latest
```

### Push to Google Container Registry

```bash
docker push region-docker.pkg.dev/projectid/repo/name:latest
```

### Create new repo in Artifact Registry

```bash
gcloud artifacts repositories create repo-name --repository-format=docker --location=region --description="Description"
```

## Deploying Cloud Run

```bash
gcloud run deploy --image=region-docker.pkg.dev/project-id/repo/name:tag --platform=managed --region=region --allow-unauthenticated --set-env-vars GCS_BUCKET_NAME=genai-genesis-storage
```

## Kubernetes Jobs

### Create secret from service account key

> You have to do the following for every new cluster you create.

Get the credentials for the cluster:

```bash
gcloud container clusters get-credentials CLUSTER_NAME --region REGION --project PROJECT_ID
```

Download the service account key from Google Cloud Platform and create a secret in Kubernetes:

```bash
kubectl create secret generic gcp-sa-key --from-file=key.json=/path/to/your/sa-key.json
```

### Apply the training job

After building and uploading image and setting the right url:

```bash
kubectl apply -f training-job.yaml
```

### Monitor the job

```bash
kubectl get jobs # List all jobs
kubectl get pods # Pods created by the job
kubectl logs -f <pod-name>
```
