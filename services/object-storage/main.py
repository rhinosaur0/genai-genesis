import os
from flask import Flask, request, jsonify
from google.cloud import storage

app = Flask(__name__)
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = "C:/Users/advey/Downloads/elated-emitter-454512-q9-c9a0ea2a439b.json"
storage_client = storage.Client()
bucket_name = "genai-genesis-storage"

if not bucket_name:
    raise ValueError("GCS_BUCKET_NAME environment variable must be set.")

@app.route('/objects/<envid>/<id>', methods=['PUT'])
def upload_object(envid, id):
    try:
        data = request.get_data()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(f"environments/{envid}/files/file"+str(id)+".data")
        blob.upload_from_string(data)
        return jsonify({"message": "Object uploaded successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/objects/<envid>/<id>', methods=['GET'])
def download_object(envid, id):
    try:
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(f"environments/{envid}/files/file"+str(id)+".data")
        data = blob.download_as_string()
        return data, 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
