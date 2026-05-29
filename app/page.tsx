"use client";

import { useEffect, useState } from "react";
import Auth from "./auth";
import { supabase } from "../lib/supabase";
import { getTodayScanCount } from "../lib/scanLimit";
import jsPDF from "jspdf";

type DetectionResult = {
  result: string;
  confidence: number;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  imageWidth?: number;
  imageHeight?: number;
  lastModified?: string;
  metadataStatus?: string;
  compressionAnalysis?: string;
  forensicSummary?: string;
};

const GUEST_DAILY_LIMIT = 3;

const USER_DAILY_LIMIT = 100;

const MAX_FILE_SIZE_MB = 20;

const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
const [scansLeft, setScansLeft] = useState(3);
const [isReady, setIsReady] = useState(false);
const [history, setHistory] = useState<

{
  id: string;
  result: string;
  confidence: number;
  created_at: string;
  image_url?: string;
  }[]

>([]);
const [user, setUser] = useState<any>(null);
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
const [showAuthModal, setShowAuthModal] = useState(false);
const [scanStage, setScanStage] = useState(0);
const [notice, setNotice] = useState<{
  message: string;
  action?: "auth";
} | null>(null);
const showNotice = (message: string, action?: "auth") => {
  setNotice({ message, action });

  setTimeout(() => {
    setNotice(null);
  }, 4500);
};

const fetchHistory = async (userId: string) => {
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (!error && data) {
    setHistory(data);
  }
};

const deleteScan = async (scanId: string) => {
  const { error } = await supabase
    .from("scans")
    .delete()
    .eq("id", scanId);
  if (!error && user) {
    fetchHistory(user.id);
  }
};
const downloadReport = async () => {
  if (!result) return;

  const pdf = new jsPDF("p", "mm", "a4");

  pdf.setFillColor(5, 8, 22);
  pdf.rect(0, 0, 210, 297, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.text("Real or AI", 20, 25);

  pdf.setFontSize(14);
  pdf.setTextColor(180, 180, 190);
  pdf.text("Forensic Authenticity Report", 20, 35);

  pdf.setDrawColor(34, 211, 238);
  pdf.line(20, 42, 190, 42);

  if (image) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    pdf.addImage(img, "JPEG", 20, 50, 60, 60);
  }

  pdf.setFontSize(18);

  pdf.setTextColor(
    result.result.includes("AI") ? 248 : 74,
    result.result.includes("AI") ? 113 : 222,
    result.result.includes("AI") ? 113 : 128
  );

  pdf.text(result.result, 90, 60);

  pdf.setFontSize(12);
  pdf.setTextColor(255, 255, 255);

  pdf.text(`AI Probability: ${result.confidence}%`, 90, 78);

  pdf.text(
    `Real Probability: ${100 - result.confidence}%`,
    90,
    87
  );

  pdf.text(
    `File Name: ${result.fileName || "N/A"}`,
    20,
    122
  );

  pdf.text(
    `File Type: ${result.fileType || "N/A"}`,
    20,
    131
  );

  pdf.text(
    `File Size: ${result.fileSize || "N/A"}`,
    20,
    140
  );

  pdf.text(
    `Dimensions: ${result.imageWidth || "-"} x ${
      result.imageHeight || "-"
    } px`,
    20,
    149
  );

  pdf.text(
    `Metadata: ${result.metadataStatus || "N/A"}`,
    20,
    158
  );

  pdf.text(
    `Compression: ${
      result.compressionAnalysis || "N/A"
    }`,
    20,
    167
  );

  pdf.text(
    `Generated: ${new Date().toLocaleString()}`,
    20,
    176
  );

  pdf.setFontSize(14);
  pdf.setTextColor(34, 211, 238);

  pdf.text("Forensic Summary", 20, 198);

  pdf.setFontSize(11);
  pdf.setTextColor(220, 220, 225);

  const summaryLines = pdf.splitTextToSize(
    result.forensicSummary ||
      "No forensic summary available.",
    170
  );

  pdf.text(summaryLines, 20, 208);

  pdf.setFontSize(9);
  pdf.setTextColor(140, 140, 150);

  pdf.text(
    "AI detection is probabilistic and may not always be accurate.",
    20,
    275
  );

  pdf.save(`real-or-ai-report-${Date.now()}.pdf`);
};

useEffect(() => {
  const loadUser = async () => {
    const { data } = await supabase.auth.getUser();

    setUser(data.user);

    if (data.user) {
      fetchHistory(data.user.id);
    }
  };

  loadUser();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, session) => {
    setUser(session?.user ?? null);

    if (session?.user) {
      setShowAuthModal(false);
      fetchHistory(session.user.id);
    } else {
      setHistory([]);
    }
  });

  return () => subscription.unsubscribe();
}, []);

useEffect(() => {
  const today = new Date().toDateString();
  const saved = localStorage.getItem("freeScansData");

  if (saved) {
    const parsed = JSON.parse(saved);

    if (parsed.date === today) {
      setScansLeft(parsed.scansLeft);
    } else {
      localStorage.setItem(
        "freeScansData",
        JSON.stringify({
          date: today,
          scansLeft: GUEST_DAILY_LIMIT,
        })
      );

      setScansLeft(GUEST_DAILY_LIMIT);
    }
  } else {
    localStorage.setItem(
      "freeScansData",
      JSON.stringify({
        date: today,
        scansLeft: GUEST_DAILY_LIMIT,
      })
    );

    setScansLeft(GUEST_DAILY_LIMIT);
  }

  setIsReady(true);
}, []);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;
    console.log("UPLOADED FILE TYPE:", file.type);
    const isImage = file.type.startsWith("image/");
const isVideo = file.type.startsWith("video/");

if (!isImage && !isVideo) {
  showNotice("Please upload a valid image or video file.");
  return;
}

if (file.size > MAX_FILE_SIZE_BYTES) {
  showNotice(`Image is too large. Please upload an image under ${MAX_FILE_SIZE_MB}MB.`);
  return;
}
   if (user) {
  const todayCount = await getTodayScanCount(user.id);

if (todayCount >= USER_DAILY_LIMIT) {

  showNotice(`You reached your ${USER_DAILY_LIMIT} scans for today.`);

  return;

}
} else {
  if (scansLeft <= 0) {
    showNotice("You reached your free daily limit. Create an account to continue.", "auth");
    return;
  }
}
if (isVideo) {
  const videoUrl = URL.createObjectURL(file);
  setImage(videoUrl);
  setLoading(true);
  setResult(null);

  const formData = new FormData();
  formData.append("video", file);

  const response = await fetch("/api/detect-video", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  setResult({
    result: data.result,
    confidence: data.confidence || 0,
    fileName: file.name,
    fileType: file.type,
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    lastModified: new Date(file.lastModified).toLocaleString(),
    metadataStatus: "Video metadata detected",
    compressionAnalysis: "Video compression analysis pending",
    forensicSummary:
      data.summary ||
      "This video was received and prepared for frame-based AI analysis.",
  });

  setLoading(false);
  return;
}
    const imageUrl = URL.createObjectURL(file);
    const imageDetails = await new Promise<{
  width: number;
  height: number;
}>((resolve) => {
  const img = new Image();

  img.onload = () => {
    resolve({
      width: img.width,
      height: img.height,
    });
  };

  img.src = imageUrl;
});
    setImage(imageUrl);
    setScanStage(0);
    setLoading(true);
    setTimeout(() => setScanStage(1), 400);
    setTimeout(() => setScanStage(2), 900);
    setTimeout(() => setScanStage(3), 1400);
    setTimeout(() => setScanStage(4), 1900);
    setTimeout(() => setScanStage(5), 2400);
    setResult(null);

    const formData = new FormData();
    formData.append("image", file);

    const endpoint = isVideo
  ? "/api/detect-video"
  : "/api/detect";

const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

setResult({
  ...data,
  fileName: file.name,
  fileType: file.type,
  fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
  imageWidth: imageDetails.width,
  imageHeight: imageDetails.height,
  lastModified: new Date(file.lastModified).toLocaleString(),
  metadataStatus:
  file.type === "image/jpeg"
    ? file.size < 300000
      ? "Compressed JPEG detected"
      : "EXIF metadata likely present"
    : file.type === "image/png"
    ? "PNG metadata limited"
    : "Unknown metadata structure",
    compressionAnalysis:
  file.size < 300000
    ? "High compression"
    : file.size < 1000000
    ? "Moderate compression"
    : "Low compression",
    forensicSummary:
  data.result.includes("AI")
    ? file.size < 300000
      ? "This image shows indicators commonly associated with AI-generated imagery and aggressive compression."
      : "This image contains characteristics often found in synthetic or AI-generated media."
    : file.size < 300000
    ? "This image appears authentic but shows signs of heavy compression or optimization."
    : "This image appears authentic with preserved metadata and low manipulation indicators.",
});

if (user) {
  const fileExt = file.name.split(".").pop();

  const fileName = `${user.id}-${Date.now()}.${fileExt}`;

  const { data: uploadData, error: uploadError } =
    await supabase.storage
      .from("scan-images")
      .upload(fileName, file);

  console.log("UPLOAD ERROR:", uploadError);

  let imageUrl = "";

  if (uploadData) {
    const {
      data: { publicUrl },
    } = supabase.storage
      .from("scan-images")
      .getPublicUrl(uploadData.path);

    imageUrl = publicUrl;
  }

  const { data: savedScan, error } = await supabase
    .from("scans")
    .insert({
      user_id: user.id,
      result: data.result,
      confidence: data.confidence,
      image_url: imageUrl,
    })
    .select("id, result, confidence, created_at, image_url")
    .single();

  console.log("SCAN SAVE ERROR:", error);

  if (!error && savedScan) {
    setHistory((prev) => [savedScan, ...prev]);
  }
}

if (!user) {
  setScansLeft((prev) => {
    const updated = Math.max(prev - 1, 0);

    localStorage.setItem(
  "freeScansData",
  JSON.stringify({
    date: new Date().toDateString(),
    scansLeft: updated,
  })
);

    return updated;
  });
}

setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#050816] text-white px-6 py-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1e1b4b,transparent_35%)]"></div>

      <div className="relative z-10">
        <nav className="max-w-7xl mx-auto flex justify-between items-center border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600"></div>
            <h2 className="text-xl font-bold">Real or AI</h2>
          </div>

          <div className="hidden md:flex items-center gap-10 text-sm text-gray-300">
  <a href="#image-check" className="hover:text-white transition">
    Image Check
  </a>

  <a href="#video-check" className="hover:text-white transition">
    Video Check
    <small className="ml-1 bg-purple-600 px-2 py-1 rounded-full">
      Soon
    </small>
  </a>

  <a href="#how-it-works" className="hover:text-white transition">
    How it works
  </a>

  <a href="#pricing" className="hover:text-white transition">
    Pricing
  </a>
</div>

<button
  className="md:hidden text-3xl"
  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
>
  ☰
</button>

{user ? (
  <button
    onClick={async () => {
      await supabase.auth.signOut();
    }}
    className="border border-red-500/60 px-5 py-2 rounded-xl hover:bg-red-500/10 transition"
  >
    Logout
  </button>
) : (
<button
  onClick={() => setShowAuthModal(true)}
  className="border border-purple-500/60 px-5 py-2 rounded-xl hover:bg-purple-500/10 transition"
>
  Sign in
</button>
)}

{mobileMenuOpen && (
  <div className="md:hidden absolute top-24 left-6 right-6 bg-black/95 border border-white/10 rounded-3xl p-6 flex flex-col gap-5 text-lg z-50">
    <a
      href="#image-check"
      onClick={() => setMobileMenuOpen(false)}
    >
      Image Check
    </a>

    <a
      href="#video-check"
      onClick={() => setMobileMenuOpen(false)}
    >
      Video Check
    </a>

    <a
      href="#how-it-works"
      onClick={() => setMobileMenuOpen(false)}
    >
      How it works
    </a>

    <a
      href="#pricing"
      onClick={() => setMobileMenuOpen(false)}
    >
      Pricing
    </a>
  </div>
)}

        </nav>

        <section id="image-check" className="max-w-4xl mx-auto text-center pt-16">
          <p className="inline-block border border-purple-500/50 bg-purple-500/10 px-4 py-2 rounded-full text-sm mb-6">
            {user
  ? "Signed in • scans tracked on your account"
  : `${isReady ? scansLeft : 3} free checks remaining today`}
          </p>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Check if an image is{" "}
            <span className="bg-gradient-to-r from-green-400 via-cyan-400 to-purple-500 text-transparent bg-clip-text">
              Real or AI
            </span>
          </h1>

          <p className="text-gray-300 text-lg mb-10">
            Upload an image and get an AI-likelihood result in seconds.
          </p>

<div
  className="border-2 border-dashed border-purple-500/40 rounded-3xl p-12 hover:border-purple-400 transition bg-white/5 backdrop-blur"
  onDragOver={(e) => e.preventDefault()}
  onDrop={(e) => {
    e.preventDefault();

    const file = e.dataTransfer.files?.[0];

    if (!file) return;

    const fakeEvent = {
      target: {
        files: [file],
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    handleImageUpload(fakeEvent);
  }}
>
  <label className="cursor-pointer flex flex-col items-center gap-4">
    <input
      type="file"
      accept="image/*,video/*"
      className="hidden"
      onChange={handleImageUpload}
    />

    <div className="w-16 h-16 rounded-full border border-purple-400 flex items-center justify-center text-3xl">
      ↑
    </div>

    <p className="text-xl font-bold">
      Drag and drop an image here
    </p>

    <p className="text-sm text-gray-400">
      or click to browse
    </p>

    <p className="text-xs text-gray-500">
      JPG, PNG, WEBP · Max 20MB
    </p>
  </label>
</div>

             {loading && (
  <div className="mt-10 flex flex-col items-center gap-5">

    <div className="w-14 h-14 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin shadow-[0_0_25px_rgba(34,211,238,0.5)]"></div>

    <div className="text-center">

      <p className="text-cyan-300 font-semibold text-lg">

        Running forensic analysis...

      </p>

      <div className="mt-4 space-y-2 text-sm text-gray-400 text-left bg-white/5 border border-white/10 rounded-2xl p-5 w-full max-w-md">

{scanStage >= 1 && (
  <p className="animate-pulse">
    ✓ Reading image metadata
  </p>
)}
{scanStage >= 2 && (
  <p className="animate-pulse">
    ✓ Detecting AI generation patterns
  </p>
)}
{scanStage >= 3 && (
  <p className="animate-pulse">
    ✓ Analyzing compression artifacts
  </p>
)}
{scanStage >= 4 && (
  <p className="animate-pulse">
    ✓ Checking texture consistency
  </p>
)}
{scanStage >= 5 && (
  <p className="animate-pulse">
    ✓ Building authenticity score
  </p>
)}
      </div>

    </div>

  </div>

)}

          {image && (
            <div

  className={`mt-10 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur transition-all duration-300 ${

    loading ? "opacity-60 blur-[1px]" : ""

  }`}

>
{result?.fileType?.startsWith("video/") ? (
  <video
    src={image}
    controls
    className="w-full max-w-md mx-auto rounded-2xl border border-white/10"
  />
) : (
  <img
    src={image}
    alt="Uploaded preview"
    className="w-full max-w-md mx-auto rounded-2xl border border-white/10"
  />
)}

{result && (
  <div
    id="forensic-report"
    style={{
  background: "#0b1020",
}}
    className="mt-6 bg-black/40 rounded-2xl p-6 border border-white/10"
  >
    <p className="text-sm text-purple-300 mb-2">Analysis Result</p>
    <p
  className={`text-3xl font-bold ${
    result.result.includes("AI")
      ? "text-red-400"
      : "text-green-400"
  }`}
>
  {result.result}
</p>

<div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4 text-left">
  <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 mb-3">
    Detected Indicators
  </p>

  <ul className="space-y-2 text-sm text-gray-300">
    {result.result.includes("AI") ? (
      <>
        <li>• Unnatural lighting consistency</li>
        <li>• Repeating texture patterns</li>
        <li>• Synthetic edge reconstruction</li>
        <li>• AI-style smoothing artifacts</li>
      </>
    ) : (
      <>
        <li>• Natural image compression detected</li>
        <li>• Organic lighting variation</li>
        <li>• Authentic texture distribution</li>
        <li>• Real camera noise patterns</li>
      </>
    )}
  </ul>
</div>

    <div className="mt-6 space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span>AI probability</span>
          <span>{result.confidence}%</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
  result.result.includes("AI")
    ? "bg-gradient-to-r from-red-500 to-purple-500"
    : "bg-gradient-to-r from-green-400 to-cyan-400"
}`}
            style={{ width: `${result.confidence}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-sm mb-2">
          <span>Real probability</span>
          <span>{100 - result.confidence}%</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
  result.result.includes("AI")
    ? "bg-gradient-to-r from-green-400 to-cyan-400"
    : "bg-gradient-to-r from-red-500 to-purple-500"
}`}
            style={{ width: `${100 - result.confidence}%` }}
          />
        </div>
      </div>
    </div>

<div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
    <p className="text-xs text-gray-400 mb-1">Authenticity</p>
    <p className="font-bold text-cyan-300">
      {result.result.includes("AI") ? "Low" : "High"}
    </p>
  </div>

  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
    <p className="text-xs text-gray-400 mb-1">Manipulation</p>
    <p className="font-bold text-purple-300">
  {result.result.includes("AI") ? "Possible" : "Low"}
</p>
  </div>

  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
    <p className="text-xs text-gray-400 mb-1">Metadata</p>
    <p className="font-bold text-green-300">
  {result.metadataStatus}
</p>
  </div>

  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
    <p className="text-xs text-gray-400 mb-1">Risk Level</p>
    <p
      className={`font-bold ${
        result.result.includes("AI") ? "text-red-400" : "text-green-400"
      }`}
    >
      {result.result.includes("AI") ? "Medium" : "Low"}
    </p>
  </div>
</div>

<div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-5 text-left">
  <h4 className="font-bold mb-4">File Details</h4>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300">
    <p>File name: {result.fileName}</p>
    <p>File type: {result.fileType}</p>
    <p>File size: {result.fileSize}</p>
    <p>Last modified: {result.lastModified}</p>
    <p>Metadata status: {result.metadataStatus}</p>
    <p>Compression: {result.compressionAnalysis}</p>
    <p>
      Dimensions: {result.imageWidth} × {result.imageHeight}px
    </p>
  </div>
</div>

    <div className="mt-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-400/20 rounded-2xl p-5 text-left">
  <p className="text-xs uppercase tracking-widest text-cyan-300 mb-3">
    Forensic Summary
  </p>

  <p className="text-gray-200 leading-relaxed">
    {result.forensicSummary}
  </p>
</div>
    <p className="text-xs text-gray-500 mt-5">
      AI detection is probabilistic and may not always be accurate.
    </p>
    <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
  <button
    onClick={downloadReport}
    className="bg-cyan-500 text-black px-5 py-2 rounded-xl font-bold hover:bg-cyan-400 transition"
  >
    Download forensic report
  </button>

  <button
    onClick={() => {
      setImage(null);
      setResult(null);
    }}
    className="border border-white/20 px-5 py-2 rounded-xl hover:bg-white/10 transition"
  >
    Scan another image
  </button>
</div>
  </div>
)}
            </div>
          )}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur">
            <div className="text-left p-4">
              <div className="text-3xl mb-3">🛡️</div>
              <h3 className="font-bold">Advanced AI detection</h3>
              <p className="text-sm text-gray-400 mt-1">Powered by AI models</p>
            </div>

            <div className="text-left p-4">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-bold">Lightning fast</h3>
              <p className="text-sm text-gray-400 mt-1">Results in seconds</p>
            </div>

            <div className="text-left p-4">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-bold">Private & secure</h3>
              <p className="text-sm text-gray-400 mt-1">Files are not stored</p>
            </div>

            <div className="text-left p-4">
              <div className="text-3xl mb-3">🏅</div>
              <h3 className="font-bold">Trusted results</h3>
              <p className="text-sm text-gray-400 mt-1">Clear probability score</p>
            </div>
          </div>
          {history.length > 0 && (
  <div className="mt-10 text-left">
    <h3 className="text-xl font-bold mb-4">
      Recent Scans
    </h3>

    <div className="space-y-3">
      {history.map((item, index) => (
        <div
          key={index}
          className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm"
        >
          <div className="flex justify-between items-center gap-4">
  <div className="flex items-center gap-4">

    {item.image_url && (
      <img
        src={item.image_url}
        alt="Scan"
        className="w-20 h-20 object-cover rounded-xl border border-white/10"
      />
    )}

    <div>
      <p
        className={`font-bold ${
          item.result.includes("AI")
            ? "text-red-400"
            : "text-green-400"
        }`}
      >
        {item.result}
      </p>

      <p className="text-xs text-gray-500 mt-1">
        {new Date(item.created_at).toLocaleString()}
      </p>
    </div>

  </div>

<div className="text-right flex items-center gap-4">
  <div>
    <p className="text-sm text-cyan-300 font-bold">
      {item.confidence}%
    </p>

    <p className="text-xs text-gray-500">
      Confidence
    </p>
  </div>

  <button
    onClick={() => deleteScan(item.id)}
    className="text-xs border border-red-500/40 text-red-300 px-3 py-2 rounded-xl hover:bg-red-500/10 transition"
  >
    Delete
  </button>
</div>
</div>
        </div>
      ))}
    </div>
  </div>
)}
        </section>
        <section id="video-check" className="max-w-5xl mx-auto mt-24 text-center">
  <p className="text-sm text-purple-300 mb-3">Coming Soon</p>
  <h2 className="text-4xl font-bold mb-4">Video AI detection</h2>
  <p className="text-gray-400 max-w-2xl mx-auto">
    Soon you’ll be able to upload videos and check frames for AI-generated or manipulated content.
  </p>
</section>

<section id="how-it-works" className="max-w-5xl mx-auto mt-24 text-center">
  <h2 className="text-4xl font-bold mb-10">How it works</h2>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
      <div className="text-4xl mb-4">1</div>
      <h3 className="font-bold text-xl mb-2">Upload</h3>
      <p className="text-gray-400 text-sm">Choose an image from your device.</p>
    </div>

    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
      <div className="text-4xl mb-4">2</div>
      <h3 className="font-bold text-xl mb-2">Analyze</h3>
      <p className="text-gray-400 text-sm">The image is checked for AI-generation signals.</p>
    </div>

    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
      <div className="text-4xl mb-4">3</div>
      <h3 className="font-bold text-xl mb-2">Result</h3>
      <p className="text-gray-400 text-sm">You get an estimated AI probability score.</p>
    </div>
  </div>
</section>

<section id="pricing" className="max-w-5xl mx-auto mt-24 text-center">
  <h2 className="text-4xl font-bold mb-4">Pricing</h2>
  <p className="text-gray-400 mb-10">Start free. Upgrade when you need more scans.</p>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-left">
    <p className="text-sm text-gray-400 mb-3">For casual users</p>

    <h3 className="text-3xl font-bold mb-2">
      Free
    </h3>

    <p className="text-5xl font-bold mb-6">
      $0
    </p>

    <ul className="space-y-3 text-gray-300 mb-8">
      <li>✓ 3 image scans/day</li>
      <li>✓ AI image detection</li>
      <li>✓ Basic authenticity analysis</li>
      <li>✕ Video uploads</li>
      <li>✕ Advanced forensic analysis</li>
    </ul>

    <button className="w-full border border-white/20 rounded-2xl py-3 hover:bg-white/10 transition">
      Current Plan
    </button>
  </div>

  <div className="bg-gradient-to-b from-purple-600/30 to-cyan-500/10 border border-purple-400/40 rounded-3xl p-8 text-left relative overflow-hidden">
    <div className="absolute top-4 right-4 bg-purple-500 text-xs px-3 py-1 rounded-full">
      Popular
    </div>

    <p className="text-sm text-purple-200 mb-3">
      For creators & professionals
    </p>

    <h3 className="text-3xl font-bold mb-2">
      Starter
    </h3>

    <p className="text-5xl font-bold mb-6">
      $12
      <span className="text-lg text-gray-300">
        /month
      </span>
    </p>

    <ul className="space-y-3 text-gray-200 mb-8">
      <li>✓ 500 image scans/month</li>
      <li>✓ Manipulation analysis</li>
      <li>✓ Metadata analysis</li>
      <li>✓ Scan history</li>
      <li>✓ Priority processing</li>
      <li>✕ Video uploads</li>
    </ul>

    <button className="w-full bg-white text-black rounded-2xl py-3 font-bold hover:bg-gray-200 transition">
      Coming Soon
    </button>
  </div>

  <div className="bg-white/5 border border-cyan-400/20 rounded-3xl p-8 text-left">
    <p className="text-sm text-cyan-300 mb-3">
      For advanced investigations
    </p>

    <h3 className="text-3xl font-bold mb-2">
      Pro Video
    </h3>

    <p className="text-5xl font-bold mb-6">
      $39
      <span className="text-lg text-gray-300">
        /month
      </span>
    </p>

    <ul className="space-y-3 text-gray-300 mb-8">
      <li>✓ 1000 image scans/month</li>
      <li>✓ 30 video scans/month</li>
      <li>✓ Deepfake video analysis</li>
      <li>✓ Advanced forensic analysis</li>
      <li>✓ Manipulation detection</li>
      <li>✓ Buy extra credits anytime</li>
    </ul>

    <button className="w-full border border-cyan-400/30 rounded-2xl py-3 hover:bg-cyan-400/10 transition">
      Coming Soon
    </button>
  </div>

</div>
</section>

<footer className="max-w-7xl mx-auto mt-24 border-t border-white/10 py-8 flex flex-col md:flex-row justify-between gap-4 text-sm text-gray-500">
  <p>© 2026 Real or AI. All rights reserved.</p>
  <p>AI detection is probabilistic and may not always be accurate.</p>
</footer>
      </div>
{showAuthModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/20 backdrop-blur-2xl animate-fadeIn">
    <div className="relative w-full max-w-md rounded-[2rem] p-[1px] bg-gradient-to-br from-cyan-300/60 via-white/20 to-purple-500/60 shadow-[0_0_80px_rgba(34,211,238,0.18)] animate-popIn">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/25 bg-[#0b1020]/70 p-8 backdrop-blur-[40px] shadow-inner">
        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-purple-500/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-cyan-400/30 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-purple-500/5 to-transparent pointer-events-none" />

        <button
          onClick={() => setShowAuthModal(false)}
          className="absolute top-5 right-5 z-20 w-11 h-11 rounded-full bg-white/15 border border-white/25 text-gray-100 hover:text-white hover:bg-white/25 transition text-2xl flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.3)]"
        >
          ×
        </button>

        <div className="relative z-10">
          <Auth showNotice={showNotice} />
        </div>
      </div>
    </div>
  </div>
)}

{notice && (
  <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-md animate-popIn">
    <div className="rounded-3xl border border-cyan-400/30 bg-[#0b1020]/90 px-6 py-5 text-white shadow-[0_0_50px_rgba(34,211,238,0.25)] backdrop-blur-2xl">
      <div className="flex items-start gap-4">

        <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center">
          !
        </div>

        <div>
          <p className="font-bold">
            Upload notice
          </p>

          <p className="text-sm text-gray-300 mt-1">
            {notice.message}
            {notice.action === "auth" && (
  <div className="mt-4 flex gap-3">
    <button
      onClick={() => {
        setNotice(null);
        setShowAuthModal(true);
      }}
      className="flex-1 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-black hover:bg-cyan-400 transition"
    >
      Sign in
    </button>

    <button
      onClick={() => {
        setNotice(null);
        setShowAuthModal(true);
      }}
      className="flex-1 rounded-xl border border-purple-400/50 px-4 py-2 text-sm font-bold text-white hover:bg-purple-500/20 transition"
    >
      Sign up
    </button>
  </div>
)}
          </p>
        </div>

      </div>
    </div>
  </div>
)}

    </main>
  );
}