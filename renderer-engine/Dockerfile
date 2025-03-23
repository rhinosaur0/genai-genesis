FROM python:3.9-slim-buster

WORKDIR /app

RUN apt-get update && apt-get install -y build-essential python3-dev
RUN pip install --upgrade setuptools
RUN rm -rf /root/.cache/pip

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8000
ENV GCS_BUCKET_NAME=genai-genesis-storage

CMD ["python", "app.py"]