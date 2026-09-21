import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [originalImg, setOriginalImg] = useState(null);
  const [suspectImg, setSuspectImg] = useState(null);
  const [mode, setMode] = useState('ai'); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [heatmapImg, setHeatmapImg] = useState(null);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('tamperlens_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('tamperlens_history', JSON.stringify(history));
  }, [history]);

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      setHistory([]);
    }
  };

  const deleteHistoryItem = (id) => {
    setHistory(history.filter(item => item.id !== id));
  };

  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setter(url);
      setHeatmapImg(null);
    }
  };

  const removeImage = (e, setter) => {
    e.preventDefault();
    e.stopPropagation();
    setter(null);
    setHeatmapImg(null);
  };

  const runAnalysis = async () => {
    if (!originalImg || !suspectImg) return;
    setIsAnalyzing(true);

    try {
      // Get blobs from object URLs
      const originalFile = await fetch(originalImg).then(r => r.blob());
      const suspectFile = await fetch(suspectImg).then(r => r.blob());

      const formData = new FormData();
      formData.append('mode', mode);
      formData.append('file1', originalFile, 'original.jpg');
      formData.append('file2', suspectFile, 'suspect.jpg');

      const response = await fetch('http://localhost:8000/api/verify', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        setHeatmapImg(data.heatmap);
        const newResult = {
          id: `TL-${Math.floor(Math.random()*90000)+10000}-REF`,
          time: new Date().toISOString().replace('T', ' ').substring(0, 19),
          mode: data.modeUsed,
          status: data.status,
          score: data.score + '%'
        };
        setHistory([newResult, ...history]);
      } else {
        alert("Verification Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to AI server. Make sure Python backend is running.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <div className="bg-elements">
        <div className="glow-1"></div>
        <div className="glow-2"></div>
        <div className="glow-3"></div>
        <div className="grid-overlay"></div>
      </div>

      <header className="header-nav">
        <div className="nav-content">
          <div className="logo">TamperLens</div>
        </div>
      </header>

      <div className="app-container">
        <div className="hero">
          <h1>Verification Workspace</h1>
          <p>Enterprise-Grade Packaging & Seal Integrity Analysis</p>
        </div>

        <div className="scanner-grid">
          {/* Original Card */}
          <div className="glass-panel neo-glow-cyan group">
            <div className="tag tag-cyan">REFERENCE SOURCE</div>
            <h3 className="card-title">Original (Reference)</h3>
            <label className="uploader">
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, setOriginalImg)} />
              <div className={`scanline ${isAnalyzing ? 'active' : ''}`}></div>
              {originalImg ? (
                <>
                  <img src={originalImg} alt="Original" className="uploaded-image" />
                  <button className="remove-image-btn" onClick={(e) => removeImage(e, setOriginalImg)} title="Remove Image">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined uploader-icon">description</span>
                  <div style={{ textAlign: 'center' }}>
                    <p className="uploader-title">Click or drag to upload authentic seal</p>
                    <p className="uploader-sub">Supported formats: JPG, PNG, RAW (Max 50MB)</p>
                  </div>
                </>
              )}
            </label>
          </div>

          {/* Suspect Card */}
          <div className="glass-panel neo-glow-violet group">
            <div className="tag tag-violet">ANALYSIS TARGET</div>
            <h3 className="card-title">Suspected (To Verify)</h3>
            <label className="uploader">
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, setSuspectImg)} />
              <div className={`scanline ${isAnalyzing ? 'active' : ''}`} style={{ background: 'linear-gradient(to right, transparent, var(--color-primary), transparent)' }}></div>
              {suspectImg ? (
                <>
                  <img src={suspectImg} alt="Suspect" className="uploaded-image" />
                  {heatmapImg && (
                    <img src={heatmapImg} alt="Heatmap Overlay" className="uploaded-image heatmap-overlay" />
                  )}
                  <button className="remove-image-btn" onClick={(e) => removeImage(e, setSuspectImg)} title="Remove Image">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined uploader-icon">qr_code_scanner</span>
                  <div style={{ textAlign: 'center' }}>
                    <p className="uploader-title">Click or drag to upload suspected seal</p>
                    <p className="uploader-sub">High-res captures recommended for neural drift check</p>
                  </div>
                </>
              )}
            </label>
          </div>
        </div>

        <div className="controls-section">
          <div className="toggle-group">
            <button className={`toggle-btn ${mode === 'classic' ? 'active' : ''}`} onClick={() => setMode('classic')}>
              Classic (Pixel)
            </button>
            <button className={`toggle-btn ${mode === 'ai' ? 'active' : ''}`} onClick={() => setMode('ai')}>
              AI Mode (Neural)
            </button>
          </div>
          
          <button className="analyze-btn" onClick={runAnalysis} disabled={!originalImg || !suspectImg || isAnalyzing}>
            <span style={{ position: 'relative', zIndex: 10 }}>{isAnalyzing ? 'Processing...' : 'Run Verification'}</span>
            <div className="btn-glare"></div>
          </button>
        </div>

        <div className="results-section">
          <div className="results-header">
            <h2>Recent Activity</h2>
            {history.length > 0 && (
              <button onClick={clearHistory} style={{ color: 'var(--color-error)', cursor: 'pointer' }}>
                Clear All
              </button>
            )}
          </div>
          <div className="glass-panel" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Reference ID</th>
                  <th>Timestamp</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? (
                  history.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.id}</td>
                      <td>{item.time}</td>
                      <td>{item.mode}</td>
                      <td>
                        <div className={item.status === 'AUTHENTIC' ? 'status-authentic' : 'status-tampered'}>
                          <div className={`status-dot ${item.status === 'AUTHENTIC' ? 'bg-authentic' : 'bg-tampered'}`}></div>
                          {item.status}
                        </div>
                      </td>
                      <td style={{ color: item.status === 'TAMPERED' ? 'var(--color-error)' : 'var(--color-on-background)' }}>
                        {item.score}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                        <button 
                          onClick={() => deleteHistoryItem(item.id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--color-outline)', cursor: 'pointer', padding: '4px' }}
                          title="Delete Item"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '48px', color: 'var(--color-outline)' }}>
                      No recent activity. Run a verification to see results here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  )
}

export default App
