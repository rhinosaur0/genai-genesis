variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
  default     = "elated-emitter-454512-q9"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "northamerica-northeast2"
}

variable "image" {
  description = "Docker image for cloud run service"
  type        = string
}

variable "existing_bucket_name" {
  description = "Name of the existing GCS bucket"
  type        = string
  default     = "genai-genesis-storage"
}