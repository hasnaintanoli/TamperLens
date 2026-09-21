from fastapi import FastAPI, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import io
import cv2
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as ssim

import torch
import torch.nn.functional as F
from transformers import AutoImageProcessor, AutoModel

app = FastAPI()

# Allow CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI Model (DINOv2)
print("Loading DINOv2 Model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
processor = AutoImageProcessor.from_pretrained('facebook/dinov2-small')
model = AutoModel.from_pretrained('facebook/dinov2-small').to(device)
model.eval()
print("Model loaded successfully on", device)

def get_dino_embedding(image: Image.Image):
    inputs = processor(images=image.convert("RGB"), return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model(**inputs)
    embed = outputs.last_hidden_state[:, 0, :]
    return F.normalize(embed, p=2, dim=1)

def compare_classic(img1_np, img2_np):
    # Align and Compare using SSIM
    T = (640, 640)
    img1 = cv2.resize(img1_np, T)
    
    # Alignment
    g1 = cv2.cvtColor(img1, cv2.COLOR_RGB2GRAY)
    img2_resized = cv2.resize(img2_np, T)
    g2_initial = cv2.cvtColor(img2_resized, cv2.COLOR_RGB2GRAY)
    
    orb = cv2.ORB_create(5000)
    kp1, d1 = orb.detectAndCompute(g1, None)
    kp2, d2 = orb.detectAndCompute(g2_initial, None)
    
    img2 = img2_resized
    if d1 is not None and d2 is not None and len(kp1) >= 4 and len(kp2) >= 4:
        matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = sorted(matcher.match(d1, d2), key=lambda x: x.distance)[:200]
        if len(matches) >= 4:
            pts1 = np.float32([kp1[m.queryIdx].pt for m in matches])
            pts2 = np.float32([kp2[m.trainIdx].pt for m in matches])
            H, _ = cv2.findHomography(pts2, pts1, cv2.RANSAC, 5.0)
            if H is not None:
                img2 = cv2.warpPerspective(img2_resized, H, T)

    # Compare
    g2 = cv2.cvtColor(img2, cv2.COLOR_RGB2GRAY)
    score, diff = ssim(g1, g2, full=True)
    
    # Generate Heatmap
    import base64
    diff_uint8 = (diff * 255).astype("uint8")
    diff_color = cv2.applyColorMap(cv2.bitwise_not(diff_uint8), cv2.COLORMAP_INFERNO)
    
    # Encode as Base64 JPEG
    _, buffer = cv2.imencode(".jpg", diff_color)
    base64_heatmap = "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")

    return score * 100, base64_heatmap

@app.post("/api/verify")
async def verify_images(
    mode: str = Form(...),
    file1: UploadFile = File(...),
    file2: UploadFile = File(...)
):
    try:
        content1 = await file1.read()
        content2 = await file2.read()
        
        pil1 = Image.open(io.BytesIO(content1)).convert("RGB")
        pil2 = Image.open(io.BytesIO(content2)).convert("RGB")

        np1 = np.array(pil1)
        np2 = np.array(pil2)
        classic_score, base64_heatmap = compare_classic(np1, np2)

        if mode == "ai":
            # Use DINOv2
            e1 = get_dino_embedding(pil1)
            e2 = get_dino_embedding(pil2)
            sim = torch.mm(e1, e2.transpose(0, 1)).item()
            score = max(0, min(100, sim * 100))
        else:
            score = classic_score

        # Verdict logic
        threshold = 92
        if score >= threshold + 3:
            status = "AUTHENTIC"
        elif score >= threshold:
            status = "SUSPICIOUS"
        else:
            status = "TAMPERED"

        return {
            "success": True,
            "score": round(score, 2),
            "status": status,
            "modeUsed": "Meta DINOv2 (AI)" if mode == "ai" else "SSIM (Classic)",
            "heatmap": base64_heatmap
        }

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
