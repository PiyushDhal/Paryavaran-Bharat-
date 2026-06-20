import cv2
import pytesseract
import json

# Set up tesseract path if needed, usually available in environments
img = cv2.imread("frontend/public/earth-india-hero.png")
if img is None:
    print("Could not read image")
else:
    h, w, _ = img.shape
    print(f"Image size: {w}x{h}")
    # We can try to use tesseract to find the bounding boxes of words
    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    
    results = []
    for i in range(len(data['text'])):
        text = data['text'][i].strip()
        if text.lower() in ["delhi", "mumbai", "kolkata", "hyderabad", "bengaluru", "chennai", "guwahati"]:
            x = data['left'][i]
            y = data['top'][i]
            results.append({
                "text": text,
                "x_pct": round((x / w) * 100, 2),
                "y_pct": round((y / h) * 100, 2)
            })
    
    print(json.dumps(results, indent=2))
