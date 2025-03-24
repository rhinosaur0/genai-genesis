# Repository structure

The repository is structured as follows:

```
.
├── api                # API Gateway
├── backend (deprecated)            # Local hosted backend services
├── frontend               # React app
├── docs                # Documentation
├── services             # Serves various cloud microservices via Cloud Run
├── train_engine              # Job to run the training engine
├── renderer-engine              # Job to run the renderer engine
├── rl-experiments              # Experiments with RL algorithms
└── ...
```

## Description

- `api/api-spec.yaml` contains the OpenAPI specification for the API Gateway.

- `backend` contains the backend services that were initially hosted locally.

- `services` exposes various cloud microservices via Cloud Run.

- `train_engine` contains the job to run the training engine.

## Content

Check that each folder you want to buid as docker and deploy to the cloud has a `Dockerfile` .
