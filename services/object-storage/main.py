import os
import zipfile
import io
import logging
import mimetypes
from flask import Flask, request, jsonify, send_file, make_response, after_this_request
from flask_cors import CORS
from google.cloud import storage
from werkzeug.exceptions import BadRequest, NotFound, InternalServerError

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Enable CORS for all origins to work with React frontend
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "PUT", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

# Configure cloud storage
try:
    storage_client = storage.Client()
    bucket_name = os.environ.get("GCS_BUCKET_NAME")

    if not bucket_name:
        raise ValueError("GCS_BUCKET_NAME environment variable must be set.")
    
    # Pre-initialize bucket for reuse
    bucket = storage_client.bucket(bucket_name)
    
    logger.info(f"Successfully connected to GCS bucket: {bucket_name}")
except Exception as e:
    logger.error(f"Failed to initialize Google Cloud Storage: {str(e)}")
    raise

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Cloud Run"""
    return jsonify({"status": "healthy"}), 200

@app.route('/objects/<envid>/<filename>', methods=['PUT'])
def upload_object(envid, filename):
    """
    Upload an object to Google Cloud Storage
    Handles Content-Type for proper React frontend interaction
    """
    try:
        data = request.get_data()
        if not data:
            logger.warning(f"Received empty data for {envid}/{filename}")
            raise BadRequest("Empty file content")

        # Detect content type or use the one provided by the client
        content_type = request.headers.get('Content-Type')
        if not content_type or content_type == 'application/octet-stream':
            content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        
        # Create blob with the appropriate object path
        safe_envid = secure_filename_component(envid)
        safe_filename = secure_filename_component(filename)
        blob = bucket.blob(f"{safe_envid}/{safe_filename}")
        
        # Set content type and upload
        blob.content_type = content_type
        blob.upload_from_string(data)
        
        # Generate a public URL valid for client access
        public_url = blob.public_url
        
        logger.info(f"Successfully uploaded {safe_envid}/{safe_filename}")
        
        # Return a React-friendly response with file metadata
        return jsonify({
            "success": True,
            "message": "Object uploaded successfully",
            "data": {
                "filename": filename,
                "path": f"{safe_envid}/{safe_filename}",
                "contentType": content_type,
                "size": len(data),
                "url": public_url
            }
        }), 200

    except BadRequest as e:
        logger.warning(f"Bad request: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error uploading object: {str(e)}")
        return jsonify({"success": False, "error": "Failed to upload file"}), 500

@app.route('/objects/<envid>/<filename>', methods=['GET'])
def download_object(envid, filename):
    """
    Download a specific object
    Returns the file with appropriate headers for React to handle
    """
    try:
        # Create safe path components
        safe_envid = secure_filename_component(envid)
        safe_filename = secure_filename_component(filename)
        blob_name = f"{safe_envid}/{safe_filename}"
        
        # Check if blob exists
        blob = bucket.blob(blob_name)
        if not blob.exists():
            logger.warning(f"File not found: {blob_name}")
            raise NotFound(f"File {filename} not found")
        
        # Get content type
        content_type = blob.content_type or mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        
        # Download as bytes
        data = blob.download_as_bytes()
        
        # Create a response with correct content type
        response = make_response(data)
        response.headers.set('Content-Type', content_type)
        response.headers.set('Content-Disposition', f'inline; filename="{filename}"')
        response.headers.set('Access-Control-Expose-Headers', 'Content-Disposition')
        
        logger.info(f"Successfully downloaded {blob_name}")
        return response
        
    except NotFound as e:
        return jsonify({"success": False, "error": str(e)}), 404
    except Exception as e:
        logger.error(f"Error downloading object: {str(e)}")
        return jsonify({"success": False, "error": "Failed to download file"}), 500

@app.route('/objects/<envid>', methods=['GET'])
def download_objects(envid):
    """
    Download multiple objects as a zip file
    Efficient streaming response for React applications
    """
    try:
        # Create safe path component
        safe_envid = secure_filename_component(envid)
        
        # List all blobs with the specified prefix
        blobs_list = list(bucket.list_blobs(prefix=f"{safe_envid}/"))
        
        if not blobs_list:
            logger.warning(f"No files found for environment: {safe_envid}")
            return jsonify({"success": False, "error": "No files found"}), 404

        # Create an in-memory ZIP file
        zip_buffer = io.BytesIO()
        
        file_count = 0
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for blob in blobs_list:
                # Only include specific file types if needed
                # Remove this condition if you want all files
                if blob.name.endswith(('.urdf', '.obj')):
                    data = blob.download_as_bytes()
                    # Use relative path in zip by removing the prefix
                    relative_path = blob.name.replace(f"{safe_envid}/", "")
                    zip_file.writestr(relative_path, data)
                    file_count += 1

        if file_count == 0:
            logger.warning(f"No matching files found for environment: {safe_envid}")
            return jsonify({"success": False, "error": "No matching files found"}), 404

        zip_buffer.seek(0)
        
        # Clean up resources after request completes
        @after_this_request
        def cleanup(response):
            zip_buffer.close()
            return response
        
        logger.info(f"Successfully created zip with {file_count} files for {safe_envid}")
        
        # Return with proper headers for React download
        response = send_file(
            zip_buffer,
            as_attachment=True,
            download_name=f"{envid}_files.zip",
            mimetype="application/zip"
        )
        response.headers.set('Access-Control-Expose-Headers', 'Content-Disposition')
        return response

    except Exception as e:
        logger.error(f"Error creating zip archive: {str(e)}")
        return jsonify({"success": False, "error": "Failed to create zip archive"}), 500

@app.route('/objects/<envid>/list', methods=['GET'])
def list_objects(envid):
    """
    List all objects for an environment - useful for React frontend to know available files
    """
    try:
        safe_envid = secure_filename_component(envid)
        blobs = bucket.list_blobs(prefix=f"{safe_envid}/")
        
        files = []
        for blob in blobs:
            # Get relative path
            relative_path = blob.name.replace(f"{safe_envid}/", "")
            
            files.append({
                "name": relative_path,
                "path": blob.name,
                "size": blob.size,
                "contentType": blob.content_type,
                "updated": blob.updated.isoformat() if blob.updated else None,
                "url": blob.public_url
            })
        
        logger.info(f"Listed {len(files)} objects for {safe_envid}")
        return jsonify({"success": True, "files": files})
    
    except Exception as e:
        logger.error(f"Error listing objects: {str(e)}")
        return jsonify({"success": False, "error": "Failed to list files"}), 500

def secure_filename_component(component):
    """Ensure filename components are safe to use in GCS paths"""
    # Replace potentially dangerous characters
    return component.replace('/', '_').replace('\\', '_').replace('..', '_')

# Error handlers
@app.errorhandler(BadRequest)
def handle_bad_request(e):
    return jsonify({"success": False, "error": str(e)}), 400

@app.errorhandler(NotFound)
def handle_not_found(e):
    return jsonify({"success": False, "error": str(e)}), 404

@app.errorhandler(InternalServerError)
def handle_server_error(e):
    logger.error(f"Internal server error: {str(e)}")
    return jsonify({"success": False, "error": "Internal server error"}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    logger.error(f"Unhandled exception: {str(e)}")
    return jsonify({"success": False, "error": "An unexpected error occurred"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
