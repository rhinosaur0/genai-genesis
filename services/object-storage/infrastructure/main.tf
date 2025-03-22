terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0" # Or the latest version
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Create a Cloud Storage bucket
# resource "google_storage_bucket" "bucket" {
#  name     = "${var.project_id}-rl-bucket"
#  location = var.region
#}

# Deploy Cloud Run service
resource "google_cloud_run_service" "object_storage" {
  name     = "object-storage"
  location = var.region
  template {
    spec {
      containers {
        image = var.image
        env {
          name  = "GCS_BUCKET_NAME"
          value = var.existing_bucket_name
        }
        ports {
          container_port = 8080
        }
      }
      timeout_seconds = 300
    }
  }
  traffic {
    latest_revision = true
    percent         = 100
  }
}

# Set IAM policy to allow unauthenticated access (for simplicity, adjust for production)
resource "google_cloud_run_service_iam_policy" "noauth" {
  location    = google_cloud_run_service.object_storage.location
  project     = google_cloud_run_service.object_storage.project
  service     = google_cloud_run_service.object_storage.name

  policy_data = <<POLICY
{
  "bindings": [
    {
      "members": [
        "allUsers"
      ],
      "role": "roles/run.invoker"
    }
  ]
}
POLICY
}

# Output the Cloud Run service URL
output "cloud_run_url" {
  value = google_cloud_run_service.object_storage.status[0].url
}