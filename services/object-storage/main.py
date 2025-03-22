# services/object-storage/main.py
import os
from flask import Flask, request, jsonify
from google.cloud import storage

app = Flask(__name__)
storage_client = storage.Client()
bucket_name = os.environ.get("GCS_BUCKET_NAME")

if not bucket_name:
    raise ValueError("GCS_BUCKET_NAME environment variable must be set.")

@app.route('/objects/<object_name>', methods=['PUT'])
def upload_object(object_name):
    try:
        data = request.get_data()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(object_name)
        blob.upload_from_string(data)
        return jsonify({"message": "Object uploaded successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/objects/<object_name>', methods=['GET'])
def download_object(object_name):
    try:
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(object_name)
        data = blob.download_as_string()
        return data, 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
