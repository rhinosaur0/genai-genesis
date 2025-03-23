from flask import Flask, jsonify
from kubernetes import client, config, watch
import os
import time
import yaml

app = Flask(__name__)

@app.route('/trigger', methods=['POST'])
def trigger_gke_job():
    try:
        config.load_incluster_config()
        batch_v1 = client.BatchV1Api()
        api_client = client.ApiClient()

        # Load job YAML from file
        with open('job.yaml', 'r') as f:
            job_yaml = yaml.safe_load(f)

        # Sanitize the YAML for serialization and create the V1Job object.
        job = api_client.sanitize_for_serialization(job_yaml)
        job = client.V1Job(**job)

        # Create the job
        batch_v1.create_namespaced_job(namespace="default", body=job)

        # Watch for job completion
        w = watch.Watch()
        for event in w.stream(
            batch_v1.list_namespaced_job,
            namespace="default",
            field_selector="metadata.name=rl-training-job",
        ):
            if event["type"] == "MODIFIED":
                job_status = event["object"].status
                if job_status.succeeded is not None and job_status.succeeded > 0:
                    w.stop()
                    return jsonify({"status": "Job succeeded"})
                if job_status.failed is not None and job_status.failed > 0:
                    w.stop()
                    return jsonify({"status": "Job failed"})
            time.sleep(1)

        return jsonify({"status": "Job triggered"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))