'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Pen, Eraser, Trash2, Undo2, Save, Sparkles, Plus,
  Loader2, Type, BookOpen, ChevronRight, Star, ChevronLeft, ImagePlus, X, Lightbulb, Menu,
  FileText, Upload, ExternalLink,
} from 'lucide-react';
import type { Summary, DoctorPdf } from '@/db/schema';

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = [
  { label: 'Black',  value: '#1e293b' },
  { label: 'Blue',   value: '#2563eb' },
  { label: 'Red',    value: '#dc2626' },
  { label: 'Green',  value: '#15803d' },
  { label: 'Purple', value: '#7c3aed' },
];

const SIZES = [
  { label: 'Fine',   value: 1.5 },
  { label: 'Medium', value: 3 },
  { label: 'Bold',   value: 5 },
  { label: 'Thick',  value: 8 },
];

const CANVAS_W    = 760;
const CANVAS_H    = 1100; // height per page
const LINE_GAP    = 32;
const LINE_START_Y = 48;
const MARGIN_X    = 70;

// ─── Types ────────────────────────────────────────────────────────────────────

interface StrokePoint { x: number; y: number; pressure: number }
interface PenStroke { kind: 'pen'; points: StrokePoint[]; color: string; size: number }
interface ImgStroke { kind: 'img'; el: HTMLImageElement; x: number; y: number; w: number; h: number }
type AnyStroke = PenStroke | ImgStroke;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gradeColor(grade: string) {
  if (grade === 'Excellent')  return 'text-emerald-600';
  if (grade === 'Good')       return 'text-blue-600';
  if (grade === 'Needs Work') return 'text-amber-600';
  return 'text-red-500';
}

function scoreRingColor(score: number) {
  if (score >= 85) return '#10b981';
  if (score >= 65) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 30, cx = 36, cy = 36;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color  = scoreRingColor(score);
  return (
    <svg width={72} height={72} className="rotate-[-90deg]">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${cx}px ${cy}px`, fontSize: 14, fontWeight: 700, fill: color }}>
        {score}
      </text>
    </svg>
  );
}

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, totalHeight: number, pageBreaks: number[]) {
  ctx.fillStyle = '#fffef7';
  ctx.fillRect(0, 0, CANVAS_W, totalHeight);
  ctx.fillStyle = '#cbd5e1';
  for (const pb of pageBreaks) ctx.fillRect(0, pb, CANVAS_W, 3);
  drawLines(ctx, totalHeight, pageBreaks);
}

// Draws only the ruled lines + margin — called again after loadedImg so lines stay visible
function drawLines(ctx: CanvasRenderingContext2D, totalHeight: number, pageBreaks: number[]) {
  ctx.strokeStyle = '#bfdbfe';
  ctx.lineWidth = 1;
  for (let y = LINE_START_Y; y < totalHeight; y += LINE_GAP) {
    if (pageBreaks.some(pb => y >= pb && y <= pb + 3)) continue;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
  }
  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(MARGIN_X, 0); ctx.lineTo(MARGIN_X, totalHeight); ctx.stroke();
}

// Weighted-average smoothing: removes mouse/touch jitter without moving endpoints
function smoothPoints(pts: StrokePoint[]): StrokePoint[] {
  if (pts.length < 3) return pts;
  const s: StrokePoint[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    s.push({
      x:        pts[i - 1].x * 0.25 + pts[i].x * 0.5 + pts[i + 1].x * 0.25,
      y:        pts[i - 1].y * 0.25 + pts[i].y * 0.5 + pts[i + 1].y * 0.25,
      pressure: pts[i].pressure,
    });
  }
  s.push(pts[pts.length - 1]);
  return s;
}

function drawOneStroke(ctx: CanvasRenderingContext2D, stroke: AnyStroke) {
  if (stroke.kind === 'img') {
    ctx.drawImage(stroke.el, stroke.x, stroke.y, stroke.w, stroke.h);
    return;
  }

  if (stroke.points.length < 2) return;
  const pts = smoothPoints(stroke.points);

  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.lineWidth   = stroke.size;

  // Single continuous path — no per-segment beginPath/stroke, no visible seams
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    const mid0 = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    ctx.lineTo(mid0.x, mid0.y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mid = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mid.x, mid.y);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  }

  ctx.stroke();
  ctx.restore();
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SummariesPage() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Vector stroke data (ground truth of user's drawing)
  const strokes        = useRef<AnyStroke[]>([]);
  const currentStroke  = useRef<PenStroke | null>(null);
  const undoHistory    = useRef<AnyStroke[][]>([]);
  const imageInputRef  = useRef<HTMLInputElement>(null);
  const pageBreaks     = useRef<number[]>([]);
  const loadedImg      = useRef<HTMLImageElement | null>(null);
  const eraserReady    = useRef(false);
  const isDrawing      = useRef(false);
  const savedDataRef   = useRef<ImageData | null>(null); // snapshot before each stroke
  const dprRef         = useRef(1); // window.devicePixelRatio, set on canvas init
  const selImgIdxRef   = useRef<number | null>(null);  // keeps sync with state for event handlers
  const imgDragRef     = useRef<{
    type: 'move' | 'resize';
    startClientX: number; startClientY: number;
    origX: number; origY: number; origW: number; origH: number;
  } | null>(null);

  const [selectedImgIdx, setSelectedImgIdx] = useState<number | null>(null);
  const [overlayTick,    setOverlayTick]    = useState(0); // forces overlay re-render during drag

  const [summariesList, setSummariesList] = useState<Omit<Summary, 'canvasData' | 'textContent' | 'aiFeedback'>[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isDirty,   setIsDirty]   = useState(false);

  const [title,   setTitle]   = useState('');
  const [subject, setSubject] = useState('');
  const [topic,   setTopic]   = useState('');

  const [mode,       setMode]       = useState<'pen' | 'text'>('pen');
  const [tool,       setTool]       = useState<'pen' | 'eraser'>('pen');
  const [color,      setColor]      = useState(COLORS[0].value);
  const [strokeSize, setStrokeSize] = useState(SIZES[1].value);

  const [textContent, setTextContent] = useState('');

  const [pageCount,  setPageCount]  = useState(1);

  const [aiResult,   setAiResult]   = useState<Record<string, unknown> | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [showIdeal,  setShowIdeal]  = useState(false);
  const [showResult, setShowResult] = useState(true);
  const [showPanel,  setShowPanel]  = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Doctor PDFs state
  const [sidebarTab, setSidebarTab] = useState<'summaries' | 'pdfs'>('summaries');
  const [doctorPdfsList, setDoctorPdfsList] = useState<DoctorPdf[]>([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // ── Redraw entire canvas from vector data ─────────────────────────────────

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = dprRef.current;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // reapply after any canvas resize
    const logicalH = canvas.height / dpr;
    drawBackground(ctx, logicalH, pageBreaks.current);
    if (loadedImg.current) {
      ctx.drawImage(loadedImg.current, 0, 0, CANVAS_W, loadedImg.current.naturalHeight);
      drawLines(ctx, logicalH, pageBreaks.current); // redraw lines on top of loaded image
    }
    for (const s of strokes.current) drawOneStroke(ctx, s);
  }, []);

  // ── Init / reset canvas ───────────────────────────────────────────────────

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    canvas.width  = Math.round(CANVAS_W * dpr);
    canvas.height = Math.round(CANVAS_H * dpr);
    strokes.current     = [];
    undoHistory.current = [];
    pageBreaks.current  = [];
    loadedImg.current   = null;
    setPageCount(1);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground(ctx, CANVAS_H, []);
  }, []);

  function goToPage(n: number) {
    const canvas = canvasRef.current;
    const scroll = scrollAreaRef.current;
    if (!canvas || !scroll) return;

    // canvas has CSS width:100% so it's proportionally scaled — display height ≠ canvas.height px.
    // getBoundingClientRect gives the true CSS pixel dimensions after scaling.
    const rect         = canvas.getBoundingClientRect();
    const scrollRect   = scroll.getBoundingClientRect();
    const pagesCount   = (canvas.height / dprRef.current) / CANVAS_H;
    const displayPageH = rect.height / pagesCount;                          // CSS px per page
    const canvasTop    = rect.top - scrollRect.top + scroll.scrollTop;      // canvas y in scroll space
    scroll.scrollTo({ top: canvasTop + (n - 1) * displayPageH, behavior: 'smooth' });
  }

  function handleImageImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = () => {
      const imgEl = new Image();
      imgEl.onload = () => {
        // Save undo snapshot
        undoHistory.current.push(strokes.current.slice());
        if (undoHistory.current.length > 40) undoHistory.current.shift();

        // Place image at current scroll position, converted to canvas coordinates
        const canvas2  = canvasRef.current!;
        const cr2      = canvas2.getBoundingClientRect();
        const scroll2  = scrollAreaRef.current!;
        const sr2      = scroll2.getBoundingClientRect();
        const canvasTopInScroll = cr2.top - sr2.top + scroll2.scrollTop;
        const cssScrollY = scroll2.scrollTop - canvasTopInScroll;  // scroll within canvas area
        const canvasY   = Math.max(20, cssScrollY * (canvas2.height / cr2.height) + 20);
        const maxW  = CANVAS_W - MARGIN_X - 30;
        const scale = Math.min(1, maxW / imgEl.naturalWidth);
        const w = imgEl.naturalWidth  * scale;
        const h = imgEl.naturalHeight * scale;
        const x = MARGIN_X + 15;
        const y = canvasY;

        const imgStroke: ImgStroke = { kind: 'img', el: imgEl, x, y, w, h };
        strokes.current = [...strokes.current, imgStroke];
        redrawAll();
        setIsDirty(true);
      };
      imgEl.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  // ── Image selection & drag ────────────────────────────────────────────────

  function selectImg(idx: number) {
    selImgIdxRef.current = idx;
    setSelectedImgIdx(idx);
  }

  function deselectImg() {
    selImgIdxRef.current = null;
    setSelectedImgIdx(null);
  }

  function deleteSelectedImg() {
    const idx = selImgIdxRef.current;
    if (idx === null) return;
    undoHistory.current.push(strokes.current.slice());
    strokes.current = strokes.current.filter((_, i) => i !== idx);
    deselectImg();
    redrawAll();
    setIsDirty(true);
  }

  function startImgDrag(e: React.PointerEvent<HTMLDivElement>, type: 'move' | 'resize') {
    e.preventDefault();
    e.stopPropagation();
    const idx = selImgIdxRef.current;
    if (idx === null) return;
    const s = strokes.current[idx];
    if (!s || s.kind !== 'img') return;

    imgDragRef.current = {
      type,
      startClientX: e.clientX, startClientY: e.clientY,
      origX: s.x, origY: s.y, origW: s.w, origH: s.h,
    };

    window.addEventListener('pointermove', handleImgDragMove);
    window.addEventListener('pointerup',   handleImgDragEnd);
  }

  function handleImgDragMove(e: PointerEvent) {
    const drag = imgDragRef.current;
    const idx  = selImgIdxRef.current;
    if (!drag || idx === null) return;

    const canvas = canvasRef.current!;
    const cr     = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / cr.width;
    const scaleY = (canvas.height / dprRef.current) / cr.height;
    const dx = (e.clientX - drag.startClientX) * scaleX;
    const dy = (e.clientY - drag.startClientY) * scaleY;

    strokes.current = strokes.current.map((s, i) => {
      if (i !== idx || s.kind !== 'img') return s;
      if (drag.type === 'move') {
        return { ...s, x: drag.origX + dx, y: drag.origY + dy };
      } else {
        const newW = Math.max(40, drag.origW + dx);
        const ratio = s.el.naturalHeight / s.el.naturalWidth;
        return { ...s, w: newW, h: newW * ratio };
      }
    });
    redrawAll();
    setOverlayTick(t => t + 1);
    setIsDirty(true);
  }

  function handleImgDragEnd() {
    imgDragRef.current = null;
    window.removeEventListener('pointermove', handleImgDragMove);
    window.removeEventListener('pointerup',   handleImgDragEnd);
  }

  // Compute overlay CSS rect for a selected image
  function getImgOverlayRect(idx: number) {
    const canvas = canvasRef.current;
    const scroll = scrollAreaRef.current;
    if (!canvas || !scroll) return null;
    const s = strokes.current[idx];
    if (!s || s.kind !== 'img') return null;
    const cr = canvas.getBoundingClientRect();
    const sr = scroll.getBoundingClientRect();
    const sx = cr.width  / CANVAS_W;
    const sy = cr.height / (canvas.height / dprRef.current);
    return {
      left:   (cr.left - sr.left + scroll.scrollLeft) + s.x * sx,
      top:    (cr.top  - sr.top  + scroll.scrollTop)  + s.y * sy,
      width:  s.w * sx,
      height: s.h * sy,
    };
  }

  useEffect(() => {
    if (mode === 'pen') initCanvas();
  }, [mode, initCanvas]);

  // ── Fetch list ────────────────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    try {
      const res  = await fetch('/api/summaries');
      const data = await res.json();
      setSummariesList(data);
    } catch { /* silent */ }
  }, []);

  const fetchPdfs = useCallback(async () => {
    try {
      const res = await fetch('/api/doctor-pdfs');
      const data = await res.json();
      setDoctorPdfsList(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchList(); fetchPdfs(); }, [fetchList, fetchPdfs]);

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', file.name.replace(/\.pdf$/i, ''));
      const res = await fetch('/api/doctor-pdfs', { method: 'POST', body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('PDF uploaded!');
      await fetchPdfs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  }

  async function handleDeletePdf(id: string) {
    if (!confirm('Delete this PDF?')) return;
    try {
      await fetch(`/api/doctor-pdfs/${id}`, { method: 'DELETE' });
      toast.success('PDF deleted');
      await fetchPdfs();
    } catch { toast.error('Failed to delete'); }
  }

  // ── Pointer position ──────────────────────────────────────────────────────

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
      y: (e.clientY - rect.top)  * ((canvas.height / dprRef.current) / rect.height),
    };
  }

  // ── Pointer handlers ──────────────────────────────────────────────────────

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const pos = getPos(e);

    // Check if clicking on any image → select it (topmost wins)
    if (tool === 'pen') {
      let hitIdx = -1;
      for (let i = 0; i < strokes.current.length; i++) {
        const s = strokes.current[i];
        if (s.kind === 'img' && pos.x >= s.x && pos.x <= s.x + s.w && pos.y >= s.y && pos.y <= s.y + s.h) {
          hitIdx = i;
        }
      }
      if (hitIdx >= 0) { selectImg(hitIdx); return; }
    }

    // Clicking on blank area → deselect any selected image
    if (selImgIdxRef.current !== null) deselectImg();

    canvasRef.current!.setPointerCapture(e.pointerId);
    isDrawing.current = true;

    if (tool === 'pen') {
      // Save undo snapshot before starting new stroke
      undoHistory.current.push(strokes.current.slice());
      if (undoHistory.current.length > 40) undoHistory.current.shift();
      currentStroke.current = {
        kind: 'pen',
        points: [{ x: pos.x, y: pos.y, pressure: e.pressure > 0 ? e.pressure : 0.5 }],
        color,
        size: strokeSize,
      };
      // Snapshot canvas state so incremental drawing can restore it each frame
      const canvas = canvasRef.current!;
      savedDataRef.current = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    } else {
      // Eraser: one undo snapshot per gesture
      if (!eraserReady.current) {
        undoHistory.current.push(strokes.current.slice());
        if (undoHistory.current.length > 40) undoHistory.current.shift();
        eraserReady.current = true;
      }
      // Erase on first contact
      eraseAt(pos.x, pos.y);
    }
    setIsDirty(true);
  }

  function eraseAt(x: number, y: number) {
    const radius = strokeSize * 14;
    const before = strokes.current.length;
    strokes.current = strokes.current.filter(s => {
      if (s.kind === 'img') return true; // images are not erasable by pen eraser
      return !s.points.some(p => Math.hypot(p.x - x, p.y - y) < radius);
    });
    if (strokes.current.length !== before) redrawAll();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const pos = getPos(e);

    if (tool === 'eraser') {
      eraseAt(pos.x, pos.y);
      return;
    }

    const stroke = currentStroke.current;
    if (!stroke) return;
    stroke.points.push({ x: pos.x, y: pos.y, pressure: e.pressure > 0 ? e.pressure : 0.5 });

    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;

    // Restore pre-stroke snapshot so the whole stroke is redrawn as one clean path
    if (savedDataRef.current) ctx.putImageData(savedDataRef.current, 0, 0);
    drawOneStroke(ctx, stroke);
  }

  function onPointerUp() {
    isDrawing.current = false;
    if (tool === 'pen' && currentStroke.current) {
      const stroke = currentStroke.current;
      if (stroke.points.length > 1) {
        strokes.current = [...strokes.current, stroke];
      }
      currentStroke.current = null;
      savedDataRef.current  = null;
    }
    if (tool === 'eraser') eraserReady.current = false;
  }

  // ── Undo ──────────────────────────────────────────────────────────────────

  function handleUndo() {
    const prev = undoHistory.current.pop();
    if (prev === undefined) return;
    strokes.current = prev;
    redrawAll();
  }

  // ── Clear ─────────────────────────────────────────────────────────────────

  function handleClear() {
    if (!confirm('Clear the canvas? This cannot be undone.')) return;
    strokes.current     = [];
    undoHistory.current = [];
    loadedImg.current   = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = dprRef.current;
      canvas.height = Math.round(CANVAS_H * dpr);
      pageBreaks.current = [];
      redrawAll();
    }
    setIsDirty(true);
  }

  // ── Add page ──────────────────────────────────────────────────────────────

  function addPage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = dprRef.current;
    const logicalPrevH = canvas.height / dpr;
    pageBreaks.current.push(logicalPrevH);              // logical break coordinate
    canvas.height = Math.round((logicalPrevH + CANVAS_H) * dpr);
    redrawAll();
    undoHistory.current = [];
    setPageCount(c => {
      const next = c + 1;
      setTimeout(() => goToPage(next), 150);
      return next;
    });
  }

  // ── New ───────────────────────────────────────────────────────────────────

  function handleNew() {
    setCurrentId(null);
    setTitle(''); setSubject(''); setTopic('');
    setTextContent('');
    setAiResult(null);
    setIsDirty(false);
    setTimeout(initCanvas, 50);
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  async function handleLoad(id: string) {
    try {
      const res  = await fetch(`/api/summaries/${id}`);
      const data = await res.json();
      setCurrentId(data.id);
      setTitle(data.title ?? '');
      setSubject(data.subject ?? '');
      setTopic(data.topic ?? '');
      setTextContent(data.textContent ?? '');
      setAiResult(data.aiFeedback ? JSON.parse(data.aiFeedback) : null);
      setIsDirty(false);

      // Reset strokes
      strokes.current     = [];
      undoHistory.current = [];

      if (data.canvasData) {
        setMode('pen');
        setTimeout(() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const img = new Image();
          img.onload = () => {
            const dpr = window.devicePixelRatio || 1;
            dprRef.current = dpr;
            const logicalH = img.naturalHeight || CANVAS_H;
            canvas.width  = Math.round(CANVAS_W * dpr);
            canvas.height = Math.round(logicalH * dpr);
            // Reconstruct page breaks (logical coords) from logical height
            const breaks: number[] = [];
            for (let y = CANVAS_H; y < logicalH; y += CANVAS_H) breaks.push(y);
            pageBreaks.current = breaks;
            loadedImg.current  = img;
            setPageCount(breaks.length + 1);
            redrawAll();
          };
          img.src = data.canvasData;
        }, 50);
      } else {
        setTimeout(initCanvas, 50);
      }
    } catch {
      toast.error('Failed to load summary');
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!title.trim()) { toast.error('Add a title first'); return; }
    setSaving(true);
    try {
      let canvasData: string | null = null;
      if (mode === 'pen' && canvasRef.current) {
        // Save strokes-only (no background lines) so loading doesn't double the lines
        const canvas   = canvasRef.current;
        const logicalH = canvas.height / dprRef.current;
        const tmp    = document.createElement('canvas');
        tmp.width  = CANVAS_W;
        tmp.height = logicalH;
        const tCtx = tmp.getContext('2d')!;
        // White fill so it's visible as a standalone image
        tCtx.fillStyle = '#fffef7';
        tCtx.fillRect(0, 0, CANVAS_W, logicalH);
        if (loadedImg.current) tCtx.drawImage(loadedImg.current, 0, 0, CANVAS_W, loadedImg.current.naturalHeight);
        for (const s of strokes.current) drawOneStroke(tCtx, s);
        canvasData = tmp.toDataURL('image/jpeg', 0.92);
      }

      const body = { title: title.trim(), subject, topic, canvasData, textContent };
      const res  = await fetch(
        currentId ? `/api/summaries/${currentId}` : '/api/summaries',
        { method: currentId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Save failed (${res.status})`);
      }
      const saved = await res.json();
      if (!currentId) setCurrentId(saved.id);
      setIsDirty(false);
      await fetchList();
      toast.success('Summary saved!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Delete this summary?')) return;
    await fetch(`/api/summaries/${id}`, { method: 'DELETE' });
    if (currentId === id) handleNew();
    await fetchList();
    toast.success('Deleted');
  }

  // ── Evaluate ──────────────────────────────────────────────────────────────

  async function handleEvaluate() {
    if (!currentId) { toast.error('Save the summary first'); return; }
    setEvaluating(true);
    try {
      // Capture the display canvas scaled to logical size — works for fresh drawings,
      // loaded summaries (stored in loadedImg), and any combination.
      let canvasData: string | null = null;
      if (mode === 'pen' && canvasRef.current) {
        const canvas   = canvasRef.current;
        const logicalH = canvas.height / dprRef.current;
        const tmp      = document.createElement('canvas');
        tmp.width  = CANVAS_W;
        tmp.height = logicalH;
        // drawImage scales the DPR-sized canvas down to logical coords — captures everything
        tmp.getContext('2d')!.drawImage(canvas, 0, 0, CANVAS_W, logicalH);
        canvasData = tmp.toDataURL('image/jpeg', 0.9);
      }

      if (!canvasData && !textContent.trim()) {
        toast.error('Draw something on the canvas first');
        setEvaluating(false);
        return;
      }

      const res  = await fetch(`/api/summaries/${currentId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic || title, textContent, canvasData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Evaluation failed');
      setAiResult(data);
      setShowIdeal(false);
      setShowResult(false); // start collapsed so canvas stays visible
      setShowPanel(true);
      await fetchList();
      toast.success(`Score: ${data.score}/100 — ${data.grade}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setEvaluating(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  const result = aiResult as {
    score?: number; grade?: string; overallFeedback?: string;
    coverage?:     { score: number; comment: string };
    accuracy?:     { score: number; comment: string };
    organization?: { score: number; comment: string };
    strengths?:    string[];
    improvements?: string[];
    transcription?: string;
    idealAnswer?:  string;
    writingTips?:  { steps: { label: string; example: string }[]; memoryTrick: string };
  } | null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen">

      {/* Backdrop overlay for mobile sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* ── Left sidebar ───────────────────────────────────────────── */}
      <aside className={cn(
        'w-52 border-r border-border bg-muted flex flex-col shrink-0 transition-transform duration-200',
        'fixed inset-y-0 left-0 z-40 lg:relative lg:translate-x-0',
        showSidebar ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-1 flex-1">
            <button
              onClick={() => setSidebarTab('summaries')}
              className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                sidebarTab === 'summaries' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <BookOpen className="w-3.5 h-3.5" /> Summaries
            </button>
            <button
              onClick={() => setSidebarTab('pdfs')}
              className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                sidebarTab === 'pdfs' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <FileText className="w-3.5 h-3.5" /> PDFs
            </button>
          </div>
          <div className="flex items-center gap-1">
            {sidebarTab === 'summaries' && (
              <button onClick={handleNew} className="p-1 rounded-md hover:bg-card text-muted-foreground" title="New summary">
                <Plus className="w-4 h-4" />
              </button>
            )}
            {sidebarTab === 'pdfs' && (
              <button
                onClick={() => pdfInputRef.current?.click()}
                className="p-1 rounded-md hover:bg-card text-muted-foreground"
                title="Upload PDF"
                disabled={uploadingPdf}
              >
                {uploadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </button>
            )}
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handlePdfUpload}
            />
            <button
              onClick={() => setShowSidebar(false)}
              className="p-1 rounded-md hover:bg-card text-muted-foreground transition-colors lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {sidebarTab === 'summaries' ? (
          <>
          {summariesList.length === 0 ? (
            <p className="text-[10px] text-muted-foreground px-4 py-3 text-center leading-relaxed">
              No summaries yet.<br />Start writing to save one.
            </p>
          ) : summariesList.map(s => (
            <div
              key={s.id}
              className={cn(
                'group w-full text-left px-4 py-2.5 flex items-start gap-2 hover:bg-muted transition-colors cursor-pointer',
                currentId === s.id && 'bg-indigo-50 border-r-2 border-indigo-500'
              )}
              onClick={() => handleLoad(s.id)}
            >
              <div className="flex-1 min-w-0">
                <p className={cn('text-xs font-semibold truncate', currentId === s.id ? 'text-indigo-700' : 'text-foreground')}>
                  {s.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {s.subject && <p className="text-[10px] text-muted-foreground truncate">{s.subject}</p>}
                  {s.aiScore != null && (
                    <span className={cn('text-[10px] font-bold', s.aiScore >= 85 ? 'text-emerald-600' : s.aiScore >= 65 ? 'text-blue-600' : 'text-amber-600')}>
                      {s.aiScore}/100
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(s.id); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400 shrink-0 mt-0.5"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          </>
          ) : (
          <>
            {doctorPdfsList.length === 0 ? (
              <div className="text-center px-4 py-6">
                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  No PDFs yet.<br />Upload doctor slides & notes.
                </p>
                <button
                  onClick={() => pdfInputRef.current?.click()}
                  className="mt-2 text-[10px] text-indigo-500 hover:text-indigo-600 font-medium"
                >
                  Upload PDF
                </button>
              </div>
            ) : doctorPdfsList.map(pdf => (
              <div
                key={pdf.id}
                className="group w-full text-left px-4 py-2.5 flex items-start gap-2 hover:bg-card transition-colors"
              >
                <FileText className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{pdf.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {pdf.subject && <p className="text-[10px] text-muted-foreground truncate">{pdf.subject}</p>}
                    <p className="text-[10px] text-muted-foreground">{(pdf.fileSize / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                  <a
                    href={`/api/doctor-pdfs/${pdf.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-0.5 text-muted-foreground hover:text-indigo-500"
                    title="Open PDF"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => handleDeletePdf(pdf.id)}
                    className="p-0.5 text-muted-foreground hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </>
          )}
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto flex flex-col">

        {/* Meta bar */}
        <div className="border-b border-border px-4 sm:px-5 py-3 flex flex-wrap gap-3 items-center bg-card shrink-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setShowSidebar(true)}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Input value={title}   onChange={e => { setTitle(e.target.value);   setIsDirty(true); }} placeholder="Summary title…"    className="w-48 h-8 text-sm font-medium" />
          <Input value={subject} onChange={e => { setSubject(e.target.value); setIsDirty(true); }} placeholder="Subject (optional)" className="w-36 h-8 text-xs" />
          <Input value={topic}   onChange={e => { setTopic(e.target.value);   setIsDirty(true); }} placeholder="Lesson / topic"     className="w-44 h-8 text-xs" />
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} className="gap-1.5 h-8 text-xs">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {isDirty ? 'Save *' : 'Save'}
            </Button>
            <Button size="sm" onClick={handleEvaluate} disabled={evaluating}
              className="gap-1.5 h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              {evaluating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Evaluate
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-b border-border px-4 sm:px-5 py-2 flex flex-wrap gap-4 items-center bg-card shrink-0">

          {/* Mode toggle */}
          <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
            {(['pen', 'text'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {m === 'pen' ? <><Pen className="w-3 h-3" /> Pen</> : <><Type className="w-3 h-3" /> Keyboard</>}
              </button>
            ))}
          </div>

          {mode === 'pen' && (
            <>
              {/* Pen / Eraser */}
              <div className="flex gap-1">
                {(['pen', 'eraser'] as const).map(t => (
                  <button key={t} onClick={() => setTool(t)}
                    className={cn('p-2 rounded-lg border transition-colors',
                      tool === t ? 'bg-foreground text-white border-border' : 'border-border text-muted-foreground hover:bg-muted')}
                    title={t === 'pen' ? 'Pen' : 'Eraser — removes whole strokes on touch'}>
                    {t === 'pen' ? <Pen className="w-3.5 h-3.5" /> : <Eraser className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>

              {/* Colors */}
              <div className="flex gap-1.5 items-center">
                {COLORS.map(c => (
                  <button key={c.value} onClick={() => { setColor(c.value); setTool('pen'); }}
                    className={cn('w-5 h-5 rounded-full border-2 transition-all',
                      color === c.value && tool === 'pen' ? 'border-primary scale-125' : 'border-transparent hover:scale-110')}
                    style={{ background: c.value }} title={c.label} />
                ))}
              </div>

              {/* Stroke sizes */}
              <div className="flex gap-1 items-center">
                {SIZES.map(s => (
                  <button key={s.value} onClick={() => setStrokeSize(s.value)}
                    className={cn('w-7 h-7 rounded-lg border flex items-center justify-center transition-colors',
                      strokeSize === s.value ? 'bg-foreground border-border' : 'border-border hover:bg-muted')}
                    title={s.label}>
                    <div className="rounded-full" style={{
                      width: s.value * 2 + 2, height: s.value * 2 + 2,
                      background: strokeSize === s.value ? '#fff' : '#475569',
                    }} />
                  </button>
                ))}
              </div>

              {/* Undo / Clear / + Page / Navigation */}
              <div className="flex gap-1 items-center">
                <button onClick={handleUndo} className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted" title="Undo last stroke">
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleClear} className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-red-50 hover:text-red-500" title="Clear canvas">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={addPage}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-xs font-medium transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Page
                </button>

                {/* Image import */}
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 text-xs font-medium transition-colors"
                  title="Insert image (PNG, JPG, etc.)">
                  <ImagePlus className="w-3.5 h-3.5" /> Image
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageImport}
                />

                {/* Page navigation (only if more than 1 page) */}
                {pageCount > 1 && (
                  <div className="flex items-center gap-0.5 ml-1 border border-border rounded-lg overflow-hidden">
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        onClick={() => goToPage(n)}
                        className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600 transition-colors border-r border-border last:border-r-0"
                        title={`Go to page ${n}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Writing area */}
        <div ref={scrollAreaRef} className="flex-1 overflow-auto bg-muted flex justify-center items-start py-6 px-4" style={{ position: 'relative' }}>
          <div className="shadow-lg rounded-sm overflow-hidden" style={{ width: '100%', maxWidth: CANVAS_W }}>
            {mode === 'pen' ? (
              <canvas
                ref={canvasRef}
                style={{ display: 'block', width: '100%', touchAction: 'none',
                  cursor: tool === 'eraser'
                    ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='8' cy='8' r='6' fill='none' stroke='%23475569' stroke-width='1.5'/%3E%3C/svg%3E") 8 8, crosshair`
                    : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Ccircle cx='4' cy='4' r='3' fill='%231e293b'/%3E%3C/svg%3E") 4 4, crosshair`,
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              />
            ) : null}
          </div>

          {/* Image resize/move overlay (rendered inside scroll area for correct absolute positioning) */}
          {mode === 'pen' && selectedImgIdx !== null && (() => {
            const rect = getImgOverlayRect(selectedImgIdx);
            if (!rect) return null;
            return (
              <div
                key={`img-overlay-${overlayTick}`}
                style={{
                  position: 'absolute', left: rect.left, top: rect.top,
                  width: rect.width, height: rect.height,
                  border: '2px solid #3b82f6', boxSizing: 'border-box',
                  cursor: 'move', zIndex: 20,
                }}
                onPointerDown={e => startImgDrag(e, 'move')}
              >
                {/* Delete button */}
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={deleteSelectedImg}
                  style={{
                    position: 'absolute', top: -10, right: -10,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#ef4444', color: '#fff', border: 'none',
                    fontSize: 11, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 21,
                  }}
                  title="Delete image"
                >✕</button>

                {/* Bottom-right resize handle */}
                <div
                  onPointerDown={e => startImgDrag(e, 'resize')}
                  style={{
                    position: 'absolute', right: -5, bottom: -5,
                    width: 12, height: 12, background: '#3b82f6',
                    borderRadius: 3, cursor: 'se-resize', zIndex: 21,
                  }}
                  title="Drag to resize"
                />

                {/* Corner size hint */}
                <div style={{
                  position: 'absolute', bottom: 4, left: 4,
                  background: 'rgba(59,130,246,0.85)', color: '#fff',
                  fontSize: 9, padding: '1px 4px', borderRadius: 3, pointerEvents: 'none',
                }}>
                  {Math.round(strokes.current[selectedImgIdx]?.kind === 'img'
                    ? (strokes.current[selectedImgIdx] as ImgStroke).w : 0)}px
                </div>
              </div>
            );
          })()}

          {mode === 'text' && (
            <div className="shadow-lg rounded-sm overflow-hidden" style={{ width: '100%', maxWidth: CANVAS_W }}>
              <div style={{
                background: '#fffef7',
                minHeight: CANVAS_H,
                width: '100%',
                backgroundImage: `linear-gradient(to bottom, transparent ${LINE_START_Y - 1}px, #bfdbfe ${LINE_START_Y - 1}px, #bfdbfe ${LINE_START_Y}px, transparent ${LINE_START_Y}px)`,
                backgroundSize: `100% ${LINE_GAP}px`,
                backgroundPositionY: `${LINE_START_Y - LINE_GAP}px`,
                borderLeft: `2.5px solid #fca5a5`,
                paddingLeft: MARGIN_X + 8,
              }}>
                <textarea
                  value={textContent}
                  onChange={e => { setTextContent(e.target.value); setIsDirty(true); }}
                  placeholder="Start writing your summary here…"
                  style={{
                    width: '100%', minHeight: CANVAS_H, background: 'transparent',
                    border: 'none', outline: 'none', resize: 'none',
                    lineHeight: `${LINE_GAP}px`, paddingTop: `${LINE_START_Y % LINE_GAP}px`,
                    paddingRight: 24, fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: 15, color: '#1e293b',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Text notes (pen mode — for AI evaluation) */}
        {mode === 'pen' && (
          <div className="border-t border-border px-5 py-3 bg-card shrink-0">
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Type className="w-3 h-3" />
              Written notes (for AI evaluation) — type the key points from your drawing
            </p>
            <textarea
              value={textContent}
              onChange={e => { setTextContent(e.target.value); setIsDirty(true); }}
              placeholder="Type the key points from your handwritten notes here so the AI can evaluate them…"
              className="w-full h-20 text-sm border border-border rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 leading-relaxed"
            />
          </div>
        )}

        {/* Collapsed rating strip */}
        {result && !showPanel && (
          <button
            onClick={() => setShowPanel(true)}
            className={cn(
              'w-full flex items-center justify-between px-5 py-1.5 border-t text-xs font-semibold transition-colors shrink-0',
              result.grade === 'Excellent' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' :
              result.grade === 'Good'      ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' :
              result.grade === 'Needs Work'? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' :
                                             'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
            )}
          >
            <span>{result.grade} — {result.score}/100</span>
            <span className="text-[10px] opacity-60">Click to show rating</span>
          </button>
        )}
        {result && showPanel && (
          <div className="border-t border-border bg-card shrink-0">
            {/* Always-visible compact header — click to expand/collapse */}
            <div className="flex items-center gap-3 px-5 py-2.5">
              <button
                onClick={() => setShowResult(v => !v)}
                className="flex items-center gap-3 flex-1 hover:bg-muted rounded-lg transition-colors -ml-1 pl-1"
              >
                <ScoreRing score={result.score ?? 0} />
                <div className="flex-1 text-left">
                  <p className={cn('text-sm font-bold', gradeColor(result.grade ?? ''))}>{result.grade} — {result.score}/100</p>
                  <p className="text-[11px] text-muted-foreground">{showResult ? 'Click to hide details' : 'Click to see full evaluation'}</p>
                </div>
                <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', showResult && 'rotate-90')} />
              </button>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-colors shrink-0"
                title="Hide rating panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Collapsible details */}
            {showResult && (
            <div className="px-5 pb-4 space-y-3">
              <div className="flex-1 min-w-0 space-y-3">
                {(result?.transcription || textContent?.trim()) && (
                  <div className="bg-muted border border-border rounded-lg px-3 py-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">What AI read from your handwriting</p>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">{result?.transcription || textContent.trim()}</p>
                  </div>
                )}
                <p className="text-sm text-foreground leading-relaxed">{result.overallFeedback}</p>
                <div className="grid grid-cols-3 gap-3">
                  {(['coverage', 'accuracy', 'organization'] as const).map(key => {
                    const item = result[key] as { score: number; comment: string } | undefined;
                    if (!item) return null;
                    return (
                      <div key={key} className="bg-muted rounded-lg p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{key}</p>
                          <p className="text-xs font-bold text-foreground">{item.score}%</p>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden mb-1.5">
                          <div className="h-full rounded-full" style={{ width: `${item.score}%`, background: scoreRingColor(item.score) }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{item.comment}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {result.strengths && result.strengths.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-emerald-600 mb-1 flex items-center gap-1">
                        <Star className="w-3 h-3" /> Strengths
                      </p>
                      <ul className="space-y-0.5">
                        {result.strengths.map((s, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                            <span className="text-emerald-400 shrink-0">✓</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.improvements && result.improvements.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-amber-600 mb-1 flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" /> To Improve
                      </p>
                      <ul className="space-y-0.5">
                        {result.improvements.map((s, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                            <span className="text-amber-400 shrink-0">→</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* How to write a better answer */}
                {result.writingTips && result.writingTips.steps.length > 0 && (
                  <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> How to write a better answer
                    </p>
                    <ol className="space-y-1.5">
                      {result.writingTips.steps.map((step, i) => (
                        <li key={i} className="flex gap-2 text-[11px]">
                          <span className="shrink-0 w-4 h-4 rounded-full bg-violet-200 text-violet-700 font-bold flex items-center justify-center text-[9px]">{i + 1}</span>
                          <span>
                            <span className="font-semibold text-violet-800">{step.label}</span>
                            <span className="text-muted-foreground"> — {step.example}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-2 text-[10px] font-bold text-violet-700 tracking-wide">{result.writingTips.memoryTrick}</p>
                  </div>
                )}

                {/* Ideal answer reveal */}
                {result.idealAnswer && (
                  <div>
                    <button
                      onClick={() => setShowIdeal(v => !v)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1"
                    >
                      <BookOpen className="w-3 h-3" />
                      {showIdeal ? 'Hide ideal answer' : 'Show full-mark model answer'}
                    </button>
                    {showIdeal && (
                      <div className="mt-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide mb-1">Full-mark model answer</p>
                        <p className="text-xs text-indigo-900 leading-relaxed">{result.idealAnswer}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
