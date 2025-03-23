import os
import zipfile
import io
from flask import Flask, request, jsonify, send_file
from google.cloud import storage

app = Flask(__name__)
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = "C:/Users/advey/Downloads/elated-emitter-454512-q9-c9a0ea2a439b.json"
storage_client = storage.Client()
bucket_name = "genai-genesis-storage"

if not bucket_name:
    raise ValueError("GCS_BUCKET_NAME environment variable must be set.")

@app.route('/objects/<envid>/<filename>', methods=['PUT'])
def upload_object(envid, filename):
    try:
        data = request.get_data()

        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(f"testingenv/objects/{envid}/files/{filename}")
        blob.upload_from_string(data)  

        return jsonify({"message": "Object uploaded successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/objects/<envid>/<filename>', methods=['GET'])
def download_object(envid, filename):
    try:
        
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(f"testingenv/objects/{envid}/files/{filename}")

        data = blob.download_as_bytes() 

        return data, 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/objects/', methods=['GET'])
def download_objects():
    try:
        # Get the bucket and the prefix for object listing
        bucket = storage_client.bucket(bucket_name)
        pref1 = "testingenv/objects"
        blob1 = bucket.list_blobs(prefix=pref1)

        # Create an in-memory ZIP file
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Iterate through the blobs to find .urdf and .obj files
            for bl1 in blob1:
                pref2 = f"testingenv/objects/{bl1.name}/files"
                blob2 = bucket.list_blobs(prefix=pref2)
                for bl2 in blob2:
                    if bl2.name.endswith(".urdf") or bl2.name.endswith(".obj"):
                        data = bl2.download_as_bytes()

                        zip_file.writestr(bl2.name, data)

        zip_buffer.seek(0)
        return send_file(zip_buffer, as_attachment=True, download_name="all_files.zip", mimetype="application/zip")

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
