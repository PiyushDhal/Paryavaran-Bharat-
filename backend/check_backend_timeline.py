import urllib.request
import json

url = "http://localhost:8000/api/v1/climate/timeline?district_id=101"
try:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=5) as res:
        print("Response Code:", res.status)
        data = json.loads(res.read().decode("utf-8"))
        print("Data length:", len(data))
        print("First item:", data[0])
except Exception as e:
    print("Failed to call timeline endpoint:", e)
