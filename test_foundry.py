
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI, APIStatusError

# Load local configuration
load_dotenv(
    Path(__file__).with_name(".env"),
    override=True
)

base_url = os.environ["AZURE_OPENAI_BASE_URL"].strip()
api_key = os.environ["AZURE_OPENAI_API_KEY"].strip()
deployment = os.environ["AZURE_OPENAI_DEPLOYMENT"].strip()

# Validate base URL
base_url = base_url.rstrip("/") + "/"

if not base_url.endswith("/openai/v1/"):
    raise ValueError(
        "Base URL must end with /openai/v1/"
    )

# Initialize Azure OpenAI client
client = OpenAI(
    base_url=base_url,
    api_key=api_key
)

print("Connecting to Microsoft Foundry...")
print("Deployment:", deployment)

try:
    response = client.responses.create(
        model=deployment,
        instructions=(
            "You are Matchwork's AI football analyst. "
            "Analyze synthetic football events accurately. "
            "Explain why important moments matter. "
            "Never invent statistics or match outcomes."
        ),
        input=(
            "Match minute: 78\n"
            "Score: Home 1 - 1 Away\n"
            "Event: The home team completed eight "
            "consecutive passes before attempting "
            "a shot that was saved by the goalkeeper.\n"
            "Explain the tactical importance "
            "in two sentences."
        )
    )

    print("\nSUCCESS!")
    print("Matchwork AI Analysis:")
    print(response.output_text)

except APIStatusError as error:
    print("\nAzure API request failed.")
    print("HTTP status:", error.status_code)
    print("Details:", error.response.text)
