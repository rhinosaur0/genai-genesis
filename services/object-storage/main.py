import os
import zipfile
import io
from flask import Flask, request, jsonify, send_file
from google.cloud import storage

app = Flask(__name__)
# os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = "elated-emitter-454512-q9-c9a0ea2a439b.json"
storage_client = storage.Client()
# bucket_name = "genai-genesis-storage"
bucket_name = os.environ.get("GCS_BUCKET_NAME")

if not bucket_name:
    raise ValueError("GCS_BUCKET_NAME environment variable must be set.")

@app.route('/objects/<envid>/<filename>', methods=['PUT'])
def upload_object(envid, filename):
    try:
        data = request.get_data()

        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(f"{envid}/{filename}")
        blob.upload_from_string(data)

        return jsonify({"message": "Object uploaded successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/objects/<envid>/<filename>', methods=['GET'])
def download_object(envid, filename):
    try:
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(f"{envid}/{filename}")
        data = blob.download_as_bytes()
        return data, 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/objects/<envid>', methods=['GET'])
def download_objects(envid):
    try:
        # Get the bucket and list all blobs with the specified prefix
        bucket = storage_client.bucket(bucket_name)
        blobs = bucket.list_blobs(prefix=f"{envid}/")

        # Create an in-memory ZIP file
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for blob in blobs:
                if blob.name.endswith('.urdf') or blob.name.endswith('.obj'):
                    data = blob.download_as_bytes()
                    # Use relative path in zip by removing the prefix
                    relative_path = blob.name.replace(f"{envid}/", "")
                    zip_file.writestr(relative_path, data)

        zip_buffer.seek(0)
        return send_file(zip_buffer, as_attachment=True, download_name="all_files.zip", mimetype="application/zip")

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
