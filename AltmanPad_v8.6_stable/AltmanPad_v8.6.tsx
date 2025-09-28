import React, { useRef, useState, useEffect } from "react";

// AltmanPad™ v8.6 — 筆圧対応 + 4種類の筆スタイル（小筆ノーマル化、手動保存版）
export default function AltmanPadSumie() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // UI state
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(24);
  const [opacity, setOpacity] = useState(0.7);
  const [paperTexture, setPaperTexture] = useState<"white" | "washi" | "hanshi" | "gassen">("white");
  const [inkSplatter, setInkSplatter] = useState(true);
  const [brushType, setBrushType] = useState<"normal" | "thin" | "bold" | "uno">("normal");
  const [waterAmount, setWaterAmount] = useState(0.3);

  // internal
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const lastMid = useRef<{ x: number; y: number } | null>(null);
  const velocityRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  // ---------- Helpers ----------
  const computeLineWidth = (base: number, type: "normal" | "thin" | "bold" | "uno") => {
    let factor = 1;
    if (paperTexture === "washi") factor = 1.5;
    if (paperTexture === "hanshi") factor = 1.2;
    if (paperTexture === "gassen") factor = 0.7;

    if (type === "thin") return base * 0.4 * factor;
    if (type === "bold") return base * 2 * factor;
    if (type === "uno") return base * 1.2 * factor;
    if (type === "normal") return base * 1 * factor;
    return base * factor;
  };
  const getLineWidth = () => computeLineWidth(brushSize, brushType);

  const drawPaperTexture = (ctx: CanvasRenderingContext2D) => {
    const cv = canvasRef.current!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    if (paperTexture === "washi") {
      ctx.fillStyle = "#fdfcf7";
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = "#eee";
      for (let i = 0; i < 50; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * cv.width, Math.random() * cv.height);
        ctx.lineTo(Math.random() * cv.width, Math.random() * cv.height);
        ctx.stroke();
      }
    }
  };

  const getRelativePos = (e: any) => {
    const cv = canvasRef.current!;
    const rect = cv.getBoundingClientRect();
    const touch = e.touches && e.touches[0];
    const clientX: number = touch ? touch.clientX : e.clientX;
    const clientY: number = touch ? touch.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top, pressure: e.pressure ?? (touch ? touch.force || 0.5 : 0.5) };
  };

  // ---------- Effects ----------
  useEffect(() => {
    const cv = canvasRef.current!;
    if (!cv) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = 1200, cssH = 800;
    cv.width = Math.floor(cssW * dpr);
    cv.height = Math.floor(cssH * dpr);
    cv.style.width = cssW + "px";
    cv.style.height = cssH + "px";
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPaperTexture(ctx);
  }, [paperTexture]);

  // ---------- Drawing ----------
  const startDrawing = (e: any) => {
    const p = getRelativePos(e);
    lastPoint.current = p;
    lastMid.current = p;
    lastTimeRef.current = Date.now();
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing || !lastPoint.current || !lastMid.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const curr = getRelativePos(e);
    const prev = lastPoint.current;

    const now = Date.now();
    let velocity = 0;
    if (lastTimeRef.current) {
      const dt = now - lastTimeRef.current;
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      velocity = dist / (dt || 1);
    }
    velocityRef.current = velocity;
    lastTimeRef.current = now;

    const mid = { x: (prev.x + curr.x) / 2, y: (prev.y + curr.y) / 2 };
    let width = getLineWidth() * (curr.pressure || 1);

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = opacity;
    ctx.stroke();

    lastPoint.current = curr;
    lastMid.current = mid;
  };

  const saveImage = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const url = cv.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `AltmanPad_Sumie_${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPoint.current = null;
    lastMid.current = null;
    lastTimeRef.current = null;
  };

  return (
    <div style={{ padding: 10, fontFamily: "ui-sans-serif, system-ui" }}>
      <h2>🖌 AltmanPad™ v8.6 — 筆圧対応 + 4種類の筆スタイル（小筆ノーマル化、手動保存版）</h2>
      <canvas
        ref={canvasRef}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        style={{ width: "100%", height: "auto", border: "1px solid #ccc", backgroundColor: "#fff" }}
      />
      <div style={{ marginTop: 10 }}>
        <label>色 <input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>
        <label>太さ <input type="range" min={4} max={80} value={brushSize} onChange={(e) => setBrushSize(+e.target.value)} /></label>
        <label>透明度 <input type="range" min={0.1} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} /></label>
        <label>水量 <input type="range" min={0} max={1} step={0.01} value={waterAmount} onChange={(e) => setWaterAmount(+e.target.value)} /></label>
        <button onClick={saveImage}>🖼 PNG保存</button>
      </div>
    </div>
  );
}
