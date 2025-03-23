from google.cloud import storage

def check_storage_connection(bucket_name="genai-genesis-storage"):
    try:
        client = storage.Client()
        bucket = client.get_bucket(bucket_name)  # This will raise an exception if there's a connection issue.
        if bucket.exists():
            print("Connected to Google Cloud Storage and bucket exists!")
            return True
        else:
            print("Bucket does not exist.")
            return False
    except Exception as e:
        print("Error connecting to Google Cloud Storage:", e)
        return False

# Usage
check_storage_connection()