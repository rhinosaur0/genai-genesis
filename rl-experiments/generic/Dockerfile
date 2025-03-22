FROM python:3.10

WORKDIR /app


COPY requirements.txt .
COPY train_agent.py .

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 5000


CMD ["python", "train_agent.py"]
