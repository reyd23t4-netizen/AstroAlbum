import React, { useState, useEffect, useRef, useCallback } from "react";
import { Plus, X, Camera, ArrowLeft, Trash2, BookOpen, Telescope, Sparkles, ImageOff, Pencil, Volume2, VolumeX, Settings } from "lucide-react";
import { getItem, setItem } from "./lib/storage";
import { playClick, playChime, playDelete, toggleAmbient, setSoundEnabled, isSoundEnabled } from "./lib/sound";

const OBJECTS = [
  { name: "Mercurio", type: "Planeta" },
  { name: "Venus", type: "Planeta" },
  { name: "Tierra", type: "Planeta" },
  { name: "Marte", type: "Planeta" },
  { name: "Júpiter", type: "Planeta" },
  { name: "Saturno", type: "Planeta" },
  { name: "Urano", type: "Planeta" },
  { name: "Neptuno", type: "Planeta" },
  { name: "Plutón", type: "Planeta enano" },
  { name: "Luna", type: "Luna (Tierra)" },
  { name: "Fobos", type: "Luna (Marte)" },
  { name: "Deimos", type: "Luna (Marte)" },
  { name: "Ío", type: "Luna (Júpiter)" },
  { name: "Europa", type: "Luna (Júpiter)" },
  { name: "Ganímedes", type: "Luna (Júpiter)" },
  { name: "Calisto", type: "Luna (Júpiter)" },
  { name: "Titán", type: "Luna (Saturno)" },
  { name: "Encélado", type: "Luna (Saturno)" },
  { name: "Tritón", type: "Luna (Neptuno)" },
];

function catalogId(index) {
  return `OBS-${String(index + 1).padStart(3, "0")}`;
}

function generateId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* algunos entornos bloquean crypto.randomUUID sin contexto seguro */
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function resizeImage(file, maxDim = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const STORAGE_KEY = "astro-albums-v1";
const SETTINGS_KEY = "astro-settings-v1";

const BG_THEMES = {
  nebula: {
    label: "Nebulosa",
    swatch: ["#B5502D", "#6FA8B5", "#C9A24B"],
    nebulas: [
      { color: "#B5502D", top: "10%", left: "15%", size: 420, anim: "driftA", duration: "22s" },
      { color: "#6FA8B5", top: "60%", left: "70%", size: 480, anim: "driftB", duration: "28s" },
      { color: "#C9A24B", top: "75%", left: "20%", size: 340, anim: "driftC", duration: "24s" },
    ],
    dust: true,
    shootingStars: true,
  },
  aurora: {
    label: "Aurora",
    swatch: ["#4CAF7D", "#8B6FB5", "#5FA8D9"],
    nebulas: [
      { color: "#4CAF7D", top: "12%", left: "70%", size: 400, anim: "driftA", duration: "24s" },
      { color: "#8B6FB5", top: "65%", left: "20%", size: 460, anim: "driftB", duration: "30s" },
      { color: "#5FA8D9", top: "30%", left: "40%", size: 360, anim: "driftC", duration: "26s" },
    ],
    dust: true,
    shootingStars: true,
  },
  starfield: {
    label: "Campo estelar",
    swatch: ["#EDE6D6", "#6FA8B5"],
    nebulas: [],
    dust: false,
    shootingStars: true,
  },
  minimal: {
    label: "Minimalista",
    swatch: ["#EDE6D6"],
    nebulas: [],
    dust: false,
    shootingStars: false,
  },
};

export default function AstroAlbum() {
  const [albums, setAlbums] = useState(null); // null = loading
  const [saveError, setSaveError] = useState(false);
  const [view, setView] = useState("home"); // home | album
  const [activeAlbumId, setActiveAlbumId] = useState(null);
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [activeEntry, setActiveEntry] = useState(null);
  const [renamingAlbum, setRenamingAlbum] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [bgTheme, setBgTheme] = useState("nebula");
  const [showSettings, setShowSettings] = useState(false);

  function handleToggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    toggleAmbient(next);
    if (next) playClick();
  }

  // Load
  useEffect(() => {
    (async () => {
      try {
        const res = await getItem(STORAGE_KEY);
        setAlbums(res ? JSON.parse(res) : []);
      } catch {
        setAlbums([]);
      }
      try {
        const settings = await getItem(SETTINGS_KEY);
        if (settings) {
          const parsed = JSON.parse(settings);
          if (parsed.bgTheme && BG_THEMES[parsed.bgTheme]) setBgTheme(parsed.bgTheme);
        }
      } catch {
        /* usar valores por defecto */
      }
    })();
  }, []);

  function changeBgTheme(theme) {
    setBgTheme(theme);
    setItem(SETTINGS_KEY, JSON.stringify({ bgTheme: theme })).catch(() => {});
    playClick();
  }

  // Los navegadores bloquean audio hasta la primera interacción del usuario
  useEffect(() => {
    function startOnFirstInteraction() {
      if (isSoundEnabled()) toggleAmbient(true);
      window.removeEventListener("pointerdown", startOnFirstInteraction);
      window.removeEventListener("keydown", startOnFirstInteraction);
    }
    window.addEventListener("pointerdown", startOnFirstInteraction);
    window.addEventListener("keydown", startOnFirstInteraction);
    return () => {
      window.removeEventListener("pointerdown", startOnFirstInteraction);
      window.removeEventListener("keydown", startOnFirstInteraction);
    };
  }, []);

  const persist = useCallback(async (next) => {
    setAlbums(next);
    try {
      await setItem(STORAGE_KEY, JSON.stringify(next));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, []);

  if (albums === null) {
    return (
      <div className="min-h-screen bg-[#0A0C14] flex items-center justify-center">
        <div className="text-[#EDE6D6]/60 font-mono text-sm tracking-widest animate-pulse">
          CARGANDO BITÁCORA...
        </div>
      </div>
    );
  }

  const activeAlbum = albums.find((a) => a.id === activeAlbumId) || null;

  function createAlbum(name) {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const album = {
      id: generateId(),
      name: trimmed,
      createdAt: Date.now(),
      entries: [],
    };
    persist([album, ...albums]);
    setShowNewAlbum(false);
    setActiveAlbumId(album.id);
    setView("album");
    playChime();
  }

  function renameAlbum(name) {
    const trimmed = (name || "").trim();
    if (!trimmed || !activeAlbum) return;
    persist(
      albums.map((a) => (a.id === activeAlbum.id ? { ...a, name: trimmed } : a))
    );
    setRenamingAlbum(false);
    playClick();
  }

  function deleteAlbum(id) {
    persist(albums.filter((a) => a.id !== id));
    if (activeAlbumId === id) {
      setActiveAlbumId(null);
      setView("home");
    }
    playDelete();
  }

  function addEntry(entry) {
    const next = albums.map((a) =>
      a.id === activeAlbum.id
        ? { ...a, entries: [...a.entries, { id: generateId(), ...entry }] }
        : a
    );
    persist(next);
    setShowAddEntry(false);
    playChime();
  }

  function deleteEntry(entryId) {
    const next = albums.map((a) =>
      a.id === activeAlbum.id
        ? { ...a, entries: a.entries.filter((e) => e.id !== entryId) }
        : a
    );
    persist(next);
    setActiveEntry(null);
    playDelete();
  }

  return (
    <div className="min-h-screen bg-[#0A0C14] text-[#EDE6D6] relative overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .font-display { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        @keyframes twinkle { 0%,100%{opacity:.25} 50%{opacity:.9} }
        .star { position:absolute; border-radius:50%; background:#EDE6D6; animation:twinkle 4s ease-in-out infinite; }
        .card-entry { transition: transform .18s ease, border-color .18s ease; }
        .card-entry:hover { transform: translateY(-3px); }
        ::selection { background:#B5502D; color:#0A0C14; }

        @keyframes driftA { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(4%,-6%) scale(1.12)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes driftB { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-5%,5%) scale(1.08)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes driftC { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(3%,4%) scale(1.15)} 100%{transform:translate(0,0) scale(1)} }
        .nebula { position:absolute; border-radius:50%; filter: blur(60px); opacity:.16; }

        @keyframes dustFloat {
          0% { transform: translate(0,0); opacity:0; }
          10% { opacity:.5; }
          90% { opacity:.5; }
          100% { transform: translate(var(--dx), var(--dy)); opacity:0; }
        }
        .dust { position:absolute; border-radius:50%; background:#C9A24B; animation:dustFloat linear infinite; }

        @keyframes shoot {
          0% { transform: translate(0,0) rotate(var(--ang)); opacity:0; }
          8% { opacity:1; }
          70% { opacity:.7; }
          100% { transform: translate(var(--sx), var(--sy)) rotate(var(--ang)); opacity:0; }
        }
        .shooting-star {
          position:absolute; height:1.5px; width:90px;
          background: linear-gradient(90deg, transparent, #EDE6D6, transparent);
          animation: shoot linear forwards;
        }
      `}</style>

      <Cosmos theme={bgTheme} />

      {/* Header */}
      <header className="relative z-10 border-b border-[#EDE6D6]/10">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <button
            onClick={() => {
              playClick();
              setView("home");
              setActiveAlbumId(null);
            }}
            className="flex items-center gap-3 group"
          >
            <Telescope size={22} className="text-[#B5502D]" strokeWidth={1.6} />
            <span className="font-display text-xl tracking-tight">Bitácora Estelar</span>
          </button>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#EDE6D6]/40 uppercase hidden sm:block">
              Catálogo de observaciones
            </span>
            <button
              onClick={() => {
                setShowSettings(true);
                playClick();
              }}
              title="Ajustes"
              className="text-[#EDE6D6]/50 hover:text-[#6FA8B5] transition-colors"
            >
              <Settings size={17} strokeWidth={1.6} />
            </button>
            <button
              onClick={handleToggleSound}
              title={soundOn ? "Silenciar" : "Activar sonido"}
              className="text-[#EDE6D6]/50 hover:text-[#C9A24B] transition-colors"
            >
              {soundOn ? <Volume2 size={17} strokeWidth={1.6} /> : <VolumeX size={17} strokeWidth={1.6} />}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        {view === "home" && (
          <HomeView
            albums={albums}
            onOpen={(id) => {
              playClick();
              setActiveAlbumId(id);
              setView("album");
            }}
            onDelete={deleteAlbum}
            onNew={() => {
              playClick();
              setShowNewAlbum(true);
            }}
          />
        )}

        {view === "album" && activeAlbum && (
          <AlbumView
            album={activeAlbum}
            onBack={() => {
              playClick();
              setView("home");
              setActiveAlbumId(null);
            }}
            onAdd={() => {
              playClick();
              setShowAddEntry(true);
            }}
            onOpenEntry={(e) => {
              playClick();
              setActiveEntry(e);
            }}
            onRename={() => setRenamingAlbum(true)}
          />
        )}
      </main>

      {saveError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#B5502D] text-[#0A0C14] font-mono text-xs px-4 py-2 rounded">
          No se pudo guardar. Los cambios podrían perderse.
        </div>
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          bgTheme={bgTheme}
          onChangeTheme={changeBgTheme}
          soundOn={soundOn}
          onToggleSound={handleToggleSound}
        />
      )}

      {showNewAlbum && (
        <Modal onClose={() => setShowNewAlbum(false)} title="Nuevo álbum">
          <NameForm
            placeholder="p. ej. Oposición de Marte 2026"
            onSubmit={createAlbum}
            submitLabel="Crear álbum"
          />
        </Modal>
      )}

      {renamingAlbum && activeAlbum && (
        <Modal onClose={() => setRenamingAlbum(false)} title="Renombrar álbum">
          <NameForm
            placeholder="Nombre del álbum"
            initial={activeAlbum.name}
            onSubmit={renameAlbum}
            submitLabel="Guardar"
          />
        </Modal>
      )}

      {showAddEntry && activeAlbum && (
        <AddEntryModal
          nextIndex={activeAlbum.entries.length}
          onClose={() => setShowAddEntry(false)}
          onSave={addEntry}
        />
      )}

      {activeEntry && (
        <EntryDetailModal
          entry={activeEntry}
          index={activeAlbum.entries.findIndex((e) => e.id === activeEntry.id)}
          onClose={() => setActiveEntry(null)}
          onDelete={() => deleteEntry(activeEntry.id)}
        />
      )}
    </div>
  );
}

function Cosmos({ theme = "nebula" }) {
  const config = BG_THEMES[theme] || BG_THEMES.nebula;

  const stars = React.useMemo(
    () =>
      Array.from({ length: 55 }, () => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 1.6 + 0.6,
        delay: Math.random() * 4,
      })),
    []
  );

  const dust = React.useMemo(
    () =>
      config.dust
        ? Array.from({ length: 22 }, () => ({
            top: Math.random() * 100,
            left: Math.random() * 100,
            size: Math.random() * 2.5 + 1,
            duration: Math.random() * 14 + 12,
            delay: Math.random() * 10,
            dx: `${(Math.random() - 0.5) * 120}px`,
            dy: `${-(Math.random() * 160 + 60)}px`,
          }))
        : [],
    [config.dust]
  );

  const [shootingStars, setShootingStars] = useState([]);

  useEffect(() => {
    if (!config.shootingStars) {
      setShootingStars([]);
      return;
    }
    let timeoutId;
    function scheduleNext() {
      const delay = 4000 + Math.random() * 6000;
      timeoutId = setTimeout(() => {
        const id = Math.random().toString(36).slice(2);
        const top = Math.random() * 50;
        const left = Math.random() * 60 + 20;
        const ang = -20 - Math.random() * 15;
        const dist = 240 + Math.random() * 120;
        const rad = (ang * Math.PI) / 180;
        const sx = `${Math.cos(rad) * dist}px`;
        const sy = `${Math.sin(rad) * dist}px`;
        setShootingStars((prev) => [...prev, { id, top, left, ang, sx, sy }]);
        setTimeout(() => {
          setShootingStars((prev) => prev.filter((s) => s.id !== id));
        }, 1400);
        scheduleNext();
      }, delay);
    }
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [config.shootingStars]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {config.nebulas.map((n, i) => (
        <div
          key={i}
          className="nebula"
          style={{
            top: n.top,
            left: n.left,
            width: n.size,
            height: n.size,
            background: n.color,
            animation: `${n.anim} ${n.duration} ease-in-out infinite`,
          }}
        />
      ))}

      {stars.map((s, i) => (
        <div
          key={`s-${i}`}
          className="star"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      {dust.map((d, i) => (
        <div
          key={`d-${i}`}
          className="dust"
          style={{
            top: `${d.top}%`,
            left: `${d.left}%`,
            width: d.size,
            height: d.size,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
            "--dx": d.dx,
            "--dy": d.dy,
          }}
        />
      ))}

      {shootingStars.map((s) => (
        <div
          key={s.id}
          className="shooting-star"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            "--ang": `${s.ang}deg`,
            "--sx": s.sx,
            "--sy": s.sy,
            animationDuration: "1.1s",
          }}
        />
      ))}
    </div>
  );
}

function HomeView({ albums, onOpen, onDelete, onNew }) {
  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold">Tus álbumes</h1>
          <p className="font-mono text-xs text-[#EDE6D6]/50 mt-2 tracking-wide">
            {albums.length} {albums.length === 1 ? "álbum registrado" : "álbumes registrados"}
          </p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 bg-[#B5502D] hover:bg-[#c65f39] text-[#0A0C14] font-mono text-xs tracking-wide px-4 py-2.5 rounded transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} /> NUEVO ÁLBUM
        </button>
      </div>

      {albums.length === 0 ? (
        <EmptyState onNew={onNew} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {albums.map((album) => (
            <div
              key={album.id}
              onClick={() => onOpen(album.id)}
              className="card-entry group relative border border-[#EDE6D6]/15 rounded-md p-5 cursor-pointer bg-gradient-to-b from-[#12151F] to-[#0A0C14] hover:border-[#B5502D]/50"
            >
              <div className="flex items-start justify-between mb-8">
                <BookOpen size={18} className="text-[#6FA8B5]" strokeWidth={1.6} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`¿Eliminar "${album.name}" y todas sus fotos?`)) onDelete(album.id);
                    else playClick();
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[#EDE6D6]/40 hover:text-[#B5502D] transition-opacity"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <h3 className="font-display text-lg font-medium leading-snug mb-1">{album.name}</h3>
              <p className="font-mono text-[11px] text-[#EDE6D6]/45 tracking-wide">
                {album.entries.length} {album.entries.length === 1 ? "objeto" : "objetos"}
              </p>
              <div className="flex gap-1 mt-4">
                {album.entries.slice(0, 5).map((e) =>
                  e.photo ? (
                    <img
                      key={e.id}
                      src={e.photo}
                      alt=""
                      className="w-8 h-8 object-cover rounded-sm border border-[#EDE6D6]/10"
                    />
                  ) : (
                    <div
                      key={e.id}
                      className="w-8 h-8 rounded-sm border border-[#EDE6D6]/10 bg-[#EDE6D6]/5 flex items-center justify-center"
                    >
                      <ImageOff size={11} className="text-[#EDE6D6]/25" />
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onNew }) {
  return (
    <div className="border border-dashed border-[#EDE6D6]/20 rounded-md py-20 flex flex-col items-center text-center px-6">
      <Sparkles size={26} className="text-[#C9A24B] mb-4" strokeWidth={1.4} />
      <h2 className="font-display text-xl mb-2">Aún no hay observaciones</h2>
      <p className="font-mono text-xs text-[#EDE6D6]/45 max-w-xs mb-6">
        Crea tu primer álbum para empezar a archivar fotos de planetas y lunas.
      </p>
      <button
        onClick={onNew}
        className="flex items-center gap-2 bg-[#B5502D] hover:bg-[#c65f39] text-[#0A0C14] font-mono text-xs tracking-wide px-4 py-2.5 rounded transition-colors"
      >
        <Plus size={15} strokeWidth={2.5} /> CREAR ÁLBUM
      </button>
    </div>
  );
}

function AlbumView({ album, onBack, onAdd, onOpenEntry, onRename }) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 font-mono text-xs text-[#EDE6D6]/50 hover:text-[#EDE6D6] mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> ÁLBUMES
      </button>

      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold">{album.name}</h1>
          <button onClick={onRename} className="text-[#EDE6D6]/35 hover:text-[#6FA8B5] transition-colors">
            <Pencil size={16} />
          </button>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-[#6FA8B5] hover:bg-[#7fb8c4] text-[#0A0C14] font-mono text-xs tracking-wide px-4 py-2.5 rounded transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} /> AGREGAR OBJETO
        </button>
      </div>

      {album.entries.length === 0 ? (
        <div className="border border-dashed border-[#EDE6D6]/20 rounded-md py-20 flex flex-col items-center text-center px-6">
          <Camera size={24} className="text-[#6FA8B5] mb-4" strokeWidth={1.4} />
          <h2 className="font-display text-xl mb-2">Álbum vacío</h2>
          <p className="font-mono text-xs text-[#EDE6D6]/45 max-w-xs">
            Agrega tu primer planeta o luna con su foto y datos de observación.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {album.entries.map((entry, i) => (
            <div
              key={entry.id}
              onClick={() => onOpenEntry(entry)}
              className="card-entry cursor-pointer border border-[#EDE6D6]/12 rounded-md overflow-hidden bg-[#12151F] hover:border-[#6FA8B5]/50"
            >
              <div className="aspect-square bg-[#0A0C14] flex items-center justify-center overflow-hidden">
                {entry.photo ? (
                  <img src={entry.photo} alt={entry.objectName} className="w-full h-full object-cover" />
                ) : (
                  <ImageOff size={22} className="text-[#EDE6D6]/25" />
                )}
              </div>
              <div className="p-3">
                <p className="font-mono text-[9px] tracking-widest text-[#C9A24B]/80 mb-1">
                  {catalogId(i)}
                </p>
                <p className="font-display text-sm font-medium leading-tight truncate">{entry.objectName}</p>
                {entry.category && (
                  <p className="font-mono text-[10px] text-[#EDE6D6]/40 mt-0.5">{entry.category}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-[#0A0C14]/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#12151F] border border-[#EDE6D6]/15 rounded-md w-full max-w-md p-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#EDE6D6]/40 hover:text-[#EDE6D6] transition-colors"
        >
          <X size={18} />
        </button>
        <h2 className="font-display text-xl font-medium mb-5 text-[#EDE6D6]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function SettingsModal({ onClose, bgTheme, onChangeTheme, soundOn, onToggleSound }) {
  return (
    <Modal onClose={onClose} title="Ajustes">
      <div className="mb-6">
        <p className="font-mono text-[10px] tracking-wide text-[#EDE6D6]/50 mb-3">FONDO</p>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(BG_THEMES).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => onChangeTheme(key)}
              className={`text-left border rounded-md p-3 transition-colors ${
                bgTheme === key
                  ? "border-[#B5502D] bg-[#B5502D]/10"
                  : "border-[#EDE6D6]/15 hover:border-[#EDE6D6]/35"
              }`}
            >
              <div className="flex gap-1 mb-2">
                {cfg.swatch.map((c, i) => (
                  <span key={i} className="w-3.5 h-3.5 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <p className="font-mono text-xs">{cfg.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#EDE6D6]/10 pt-4">
        <p className="font-mono text-[10px] tracking-wide text-[#EDE6D6]/50">SONIDO</p>
        <button
          onClick={onToggleSound}
          className={`flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded transition-colors ${
            soundOn ? "bg-[#6FA8B5] text-[#0A0C14]" : "bg-[#EDE6D6]/10 text-[#EDE6D6]/60"
          }`}
        >
          {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
          {soundOn ? "Activado" : "Silenciado"}
        </button>
      </div>
    </Modal>
  );
}

function NameForm({ placeholder, initial = "", onSubmit, submitLabel }) {
  const [val, setVal] = useState(initial);
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(val);
      }}
    >
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0A0C14] border border-[#EDE6D6]/20 rounded px-3 py-2.5 font-mono text-sm text-[#EDE6D6] placeholder:text-[#EDE6D6]/30 focus:outline-none focus:border-[#B5502D] mb-4"
      />
      <button
        type="submit"
        disabled={!val.trim()}
        className="w-full bg-[#B5502D] hover:bg-[#c65f39] disabled:opacity-30 disabled:cursor-not-allowed text-[#0A0C14] font-mono text-xs tracking-wide px-4 py-2.5 rounded transition-colors"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function AddEntryModal({ onClose, onSave, nextIndex }) {
  const [objectName, setObjectName] = useState("");
  const [category, setCategory] = useState("");
  const [photo, setPhoto] = useState(null);
  const [date, setDate] = useState("");
  const [equipment, setEquipment] = useState("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const dataUrl = await resizeImage(file);
      setPhoto(dataUrl);
    } catch {
      alert("No se pudo procesar la imagen.");
    } finally {
      setProcessing(false);
    }
  }

  function pickObject(name) {
    setObjectName(name);
    const found = OBJECTS.find((o) => o.name === name);
    setCategory(found ? found.type : "");
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!objectName.trim()) return;
    onSave({ objectName: objectName.trim(), category, photo, date, equipment, notes });
  }

  return (
    <Modal onClose={onClose} title={`Agregar objeto · ${catalogId(nextIndex)}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          onClick={() => fileRef.current?.click()}
          className="border border-dashed border-[#EDE6D6]/25 rounded-md h-40 flex items-center justify-center cursor-pointer overflow-hidden bg-[#0A0C14] hover:border-[#6FA8B5]/50 transition-colors"
        >
          {processing ? (
            <span className="font-mono text-xs text-[#EDE6D6]/50">Procesando...</span>
          ) : photo ? (
            <img src={photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-[#EDE6D6]/40">
              <Camera size={20} className="mb-2" strokeWidth={1.5} />
              <span className="font-mono text-[11px]">Subir foto</span>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

        <div>
          <label className="font-mono text-[10px] tracking-wide text-[#EDE6D6]/50 block mb-1.5">
            OBJETO
          </label>
          <input
            list="objects-list"
            value={objectName}
            onChange={(e) => pickObject(e.target.value)}
            placeholder="p. ej. Saturno"
            className="w-full bg-[#0A0C14] border border-[#EDE6D6]/20 rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#B5502D]"
          />
          <datalist id="objects-list">
            {OBJECTS.map((o) => (
              <option key={o.name} value={o.name} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[10px] tracking-wide text-[#EDE6D6]/50 block mb-1.5">
              FECHA
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#0A0C14] border border-[#EDE6D6]/20 rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#B5502D]"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] tracking-wide text-[#EDE6D6]/50 block mb-1.5">
              EQUIPO
            </label>
            <input
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="Telescopio, cámara..."
              className="w-full bg-[#0A0C14] border border-[#EDE6D6]/20 rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#B5502D]"
            />
          </div>
        </div>

        <div>
          <label className="font-mono text-[10px] tracking-wide text-[#EDE6D6]/50 block mb-1.5">
            NOTAS
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Condiciones del cielo, exposición, detalles observados..."
            className="w-full bg-[#0A0C14] border border-[#EDE6D6]/20 rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#B5502D] resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={!objectName.trim()}
          className="w-full bg-[#6FA8B5] hover:bg-[#7fb8c4] disabled:opacity-30 disabled:cursor-not-allowed text-[#0A0C14] font-mono text-xs tracking-wide px-4 py-2.5 rounded transition-colors"
        >
          GUARDAR OBSERVACIÓN
        </button>
      </form>
    </Modal>
  );
}

function EntryDetailModal({ entry, index, onClose, onDelete }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-[#0A0C14]/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#12151F] border border-[#EDE6D6]/15 rounded-md w-full max-w-lg overflow-hidden relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-[#EDE6D6]/70 hover:text-[#EDE6D6] bg-[#0A0C14]/60 rounded-full p-1.5 transition-colors"
        >
          <X size={16} />
        </button>
        <div className="aspect-video bg-[#0A0C14] flex items-center justify-center">
          {entry.photo ? (
            <img src={entry.photo} alt={entry.objectName} className="w-full h-full object-cover" />
          ) : (
            <ImageOff size={28} className="text-[#EDE6D6]/25" />
          )}
        </div>
        <div className="p-6">
          <p className="font-mono text-[10px] tracking-widest text-[#C9A24B]/80 mb-1">
            {catalogId(index)}
          </p>
          <h2 className="font-display text-2xl font-semibold mb-1">{entry.objectName}</h2>
          {entry.category && (
            <p className="font-mono text-xs text-[#6FA8B5] mb-4">{entry.category}</p>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            {entry.date && (
              <Field label="FECHA" value={new Date(entry.date + "T00:00").toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })} />
            )}
            {entry.equipment && <Field label="EQUIPO" value={entry.equipment} />}
          </div>

          {entry.notes && (
            <div className="mb-5">
              <p className="font-mono text-[10px] tracking-wide text-[#EDE6D6]/50 mb-1.5">NOTAS</p>
              <p className="font-display text-sm leading-relaxed text-[#EDE6D6]/85 whitespace-pre-wrap">
                {entry.notes}
              </p>
            </div>
          )}

          <button
            onClick={() => {
              if (confirm("¿Eliminar esta observación?")) onDelete();
            }}
            className="flex items-center gap-1.5 font-mono text-[11px] text-[#EDE6D6]/40 hover:text-[#B5502D] transition-colors"
          >
            <Trash2 size={13} /> ELIMINAR OBSERVACIÓN
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-wide text-[#EDE6D6]/50 mb-1">{label}</p>
      <p className="font-mono text-xs text-[#EDE6D6]/85">{value}</p>
    </div>
  );
}
