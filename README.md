# 🔍 TamperLens

> **Enterprise-Grade AI & Computer Vision Packaging & Seal Integrity Analysis**

TamperLens is an intelligent verification system designed to detect subtle visual tampering, counterfeit packaging, and broken seals. It combines state-of-the-art foundation vision models (**Meta DINOv2**) with classic computer vision alignment (**ORB + RANSAC Homography + SSIM Heatmaps**) for pixel-accurate discrepancy visualization.

---


## Part 1: Start the Backend (Python API)

Open your first terminal and run these commands one by one:

1. **Go to the backend folder:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment** *(Only needed the first time)*:
   ```bash
   python -m venv .venv
   ```

3. **Activate the environment**:
   ```bash
   .\.venv\Scripts\activate
   ```
   *(Note: For Mac/Linux, use `source .venv/bin/activate`)*

4. **Install all Python libraries** *(Only needed the first time)*:
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the API server**:
   ```bash
   python api.py
   ```
   ✅ *Your backend is now running. Keep this terminal open!*

---

## Part 2: Start the Frontend (React App)

Open a **new, second terminal** and run these commands:

1. **Go to the frontend folder:**
   ```bash
   cd frontend
   ```

2. **Install Node dependencies** *(Only needed the first time)*:
   ```bash
   npm install
   ```

3. **Start the website**:
   ```bash
   npm run dev
   ```
   ✅ *Your frontend is now running.*

---

## Final Step
Open your browser and click this link to use the project:
**http://localhost:5173**
