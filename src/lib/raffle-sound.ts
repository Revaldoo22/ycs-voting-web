/**
 * Efek suara panggung undian, dibangkitkan langsung lewat Web Audio API.
 *
 * Tidak memakai berkas audio sama sekali: semua bunyi disintesis dari
 * oscillator dan noise pendek. Jadi tidak ada aset yang perlu diunduh,
 * tidak ada jeda buffering saat acara berlangsung, dan ukuran bundle
 * tidak bertambah.
 *
 * Target rasanya: panggung game show. Nada dibangun berlapis (nada dasar +
 * oktaf + harmoni ketiga/kelima), dilewatkan reverb pendek supaya terdengar
 * seperti di aula, dan diberi bass drum agar momen besar terasa berbobot.
 *
 * AudioContext baru boleh berbunyi setelah ada interaksi pengguna, maka
 * konteks dibuat malas (saat suara pertama diminta) dan selalu di-resume.
 */

let ctx: AudioContext | null = null;
/** Bus utama: semua suara kering (tanpa gema) masuk sini. */
let master: GainNode | null = null;
/** Kirim ke reverb; dipakai bunyi yang perlu terdengar megah. */
let reverbSend: GainNode | null = null;
let muted = false;

const MUTE_KEY = "raffle-sound-muted";

if (typeof window !== "undefined") {
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    muted = false;
  }
}

type Audio = { ctx: AudioContext; master: GainNode; reverb: GainNode };

/**
 * Impulse response sintetis: derau yang meluruh secara eksponensial. Cukup
 * untuk kesan ruang aula tanpa perlu memuat berkas IR.
 */
function buildReverb(ac: AudioContext): ConvolverNode {
  const seconds = 2.2;
  const frames = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, frames, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < frames; i++) {
      // Pangkat 2.6 = ekor gema yang meluruh cukup cepat, tidak menggantung.
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 2.6);
    }
  }
  const conv = ac.createConvolver();
  conv.buffer = buf;
  return conv;
}

function audio(): Audio | null {
  if (typeof window === "undefined" || muted) return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();

      // Kompresor di ujung rantai: saat banyak nada menumpuk (fanfare +
      // drum + confetti) puncaknya ditahan supaya tidak pecah/clipping.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 22;
      comp.ratio.value = 3.5;
      comp.attack.value = 0.004;
      comp.release.value = 0.22;
      comp.connect(ctx.destination);

      master = ctx.createGain();
      master.gain.value = 0.62;
      master.connect(comp);

      const conv = buildReverb(ctx);
      const wet = ctx.createGain();
      wet.gain.value = 0.5;
      conv.connect(wet);
      wet.connect(comp);

      reverbSend = ctx.createGain();
      reverbSend.gain.value = 1;
      reverbSend.connect(conv);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return master && reverbSend
      ? { ctx, master, reverb: reverbSend }
      : null;
  } catch {
    return null;
  }
}

/** Satu nada: oscillator dengan amplop ADSR ringkas dan kirim ke gema. */
function tone(
  freq: number,
  {
    at = 0,
    dur = 0.14,
    gain = 0.3,
    type = "triangle",
    sweepTo,
    /** Porsi sinyal yang dikirim ke reverb (0 = kering, 1 = basah penuh). */
    send = 0.18,
    /** Sedikit lepas nada agar tumpukan nada tidak terdengar kaku. */
    detune = 0,
  }: {
    at?: number;
    dur?: number;
    gain?: number;
    type?: OscillatorType;
    sweepTo?: number;
    send?: number;
    detune?: number;
  } = {},
) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + at;
  const osc = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(freq, t);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);

  // Attack cepat lalu decay panjang: terdengar seperti dipetik/dipukul.
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(g);
  g.connect(a.master);
  if (send > 0) {
    const s = a.ctx.createGain();
    s.gain.value = send;
    g.connect(s);
    s.connect(a.reverb);
  }
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/**
 * Nada "tebal": nada dasar + oktaf bawah + sedikit detune kiri-kanan.
 * Satu oscillator terdengar tipis; tumpukan inilah yang membuat bunyi
 * terasa besar dan meriah.
 */
function fatTone(
  freq: number,
  opts: {
    at?: number;
    dur?: number;
    gain?: number;
    send?: number;
  } = {},
) {
  const { at = 0, dur = 0.3, gain = 0.3, send = 0.3 } = opts;
  tone(freq, { at, dur, gain, type: "triangle", send });
  tone(freq, { at, dur, gain: gain * 0.5, type: "square", detune: 8, send });
  tone(freq, { at, dur, gain: gain * 0.45, type: "sawtooth", detune: -9, send });
  // Oktaf bawah memberi bobot; sine supaya tidak mengeruhkan.
  tone(freq / 2, { at, dur: dur * 1.1, gain: gain * 0.4, type: "sine", send });
}

/** Akor penuh (dasar-terts-kuint-oktaf), untuk momen kemenangan. */
function chord(
  root: number,
  { at = 0, dur = 0.7, gain = 0.22 }: { at?: number; dur?: number; gain?: number } = {},
) {
  // Rasio interval mayor: 1 (dasar), 5/4 (terts), 3/2 (kuint), 2 (oktaf).
  [1, 1.25, 1.5, 2].forEach((ratio, i) =>
    fatTone(root * ratio, {
      at: at + i * 0.012, // sebar tipis biar terdengar "disapu", bukan serempak
      dur,
      gain: gain * (i === 0 ? 1 : 0.75),
      send: 0.42,
    }),
  );
}

/** Derau pendek: dipakai untuk klik mekanis, desis confetti, dan tepuk. */
function noise({
  at = 0,
  dur = 0.06,
  gain = 0.25,
  freq = 2400,
  q = 1,
  type = "bandpass",
  send = 0.1,
}: {
  at?: number;
  dur?: number;
  gain?: number;
  freq?: number;
  q?: number;
  type?: BiquadFilterType;
  send?: number;
} = {}) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + at;
  const frames = Math.max(1, Math.floor(a.ctx.sampleRate * dur));
  const buf = a.ctx.createBuffer(1, frames, a.ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const src = a.ctx.createBufferSource();
  src.buffer = buf;
  const filter = a.ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(a.master);
  if (send > 0) {
    const s = a.ctx.createGain();
    s.gain.value = send;
    g.connect(s);
    s.connect(a.reverb);
  }
  src.start(t);
  src.stop(t + dur);
}

/** Bass drum: sine yang turun cepat. Memberi hentakan pada momen besar. */
function kick({ at = 0, gain = 0.55 }: { at?: number; gain?: number } = {}) {
  tone(150, {
    at,
    dur: 0.32,
    gain,
    type: "sine",
    sweepTo: 44,
    send: 0.05,
  });
}

/** Simbal/crash: derau lebar yang meluruh panjang, penanda klimaks. */
function crash({ at = 0, gain = 0.3, dur = 1.5 }: { at?: number; gain?: number; dur?: number } = {}) {
  noise({ at, dur, gain, freq: 6000, q: 0.4, type: "highpass", send: 0.6 });
  noise({ at, dur: dur * 0.55, gain: gain * 0.7, freq: 3200, q: 0.5, type: "highpass", send: 0.5 });
}

/** Riuh tepuk tangan: banyak derau sangat pendek yang ditebar acak. */
function applause({ at = 0, dur = 1.8, gain = 0.3 }: { at?: number; dur?: number; gain?: number } = {}) {
  const claps = 90;
  for (let i = 0; i < claps; i++) {
    // Padat di awal lalu menipis, seperti tepuk tangan yang mereda.
    const p = Math.pow(Math.random(), 0.65);
    noise({
      at: at + p * dur,
      dur: 0.035 + Math.random() * 0.04,
      gain: gain * (0.25 + Math.random() * 0.5),
      freq: 1200 + Math.random() * 2600,
      q: 0.7,
      send: 0.45,
    });
  }
}

/** Kilau berkilau (glissando nada tinggi acak), kesan taburan confetti. */
function sparkle({ at = 0, dur = 1.1, gain = 0.16, count = 16 }: { at?: number; dur?: number; gain?: number; count?: number } = {}) {
  const scale = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349, 2637];
  for (let i = 0; i < count; i++) {
    tone(scale[Math.floor(Math.random() * scale.length)], {
      at: at + (i / count) * dur + Math.random() * 0.05,
      dur: 0.22,
      gain: gain * (0.5 + Math.random() * 0.5),
      type: "sine",
      send: 0.55,
    });
  }
}

/** Putaran berulang (reel/roda) yang bisa dihentikan kapan saja. */
type Loop = { stop: () => void };

function tickLoop(
  durationMs: number,
  {
    startMs = 45,
    endMs = 150,
    /** Nada dengung latar yang ikut naik selama berputar. */
    riser = true,
  }: { startMs?: number; endMs?: number; riser?: boolean } = {},
): Loop {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const start = Date.now();

  // Dengung yang perlahan naik: menumpuk ketegangan selama reel berputar.
  if (riser) {
    const secs = durationMs / 1000;
    tone(180, {
      dur: secs,
      gain: 0.12,
      type: "sawtooth",
      sweepTo: 520,
      send: 0.3,
    });
  }

  let i = 0;
  const step = () => {
    if (stopped) return;
    const p = Math.min(1, (Date.now() - start) / durationMs);

    // Klik mekanis: derau tajam + nada pendek, makin turun saat melambat.
    noise({ dur: 0.028, gain: 0.2, freq: 3400 - 1500 * p, q: 2.5, send: 0.12 });
    tone(880 - 380 * p, { dur: 0.035, gain: 0.1, type: "square", send: 0.1 });
    // Tiap ketukan keempat sedikit lebih tegas: terasa berirama.
    if (i % 4 === 0) {
      noise({ dur: 0.045, gain: 0.13, freq: 1800, q: 1.6, send: 0.2 });
    }
    i++;

    if (p >= 1) return;
    // Jeda antar klik memanjang (ease-out), meniru laju putaran yang melambat.
    const gap = startMs + (endMs - startMs) * (1 - Math.pow(1 - p, 3));
    timer = setTimeout(step, gap);
  };
  step();

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

export const raffleSound = {
  isMuted: () => muted,

  setMuted(value: boolean) {
    muted = value;
    try {
      window.localStorage.setItem(MUTE_KEY, value ? "1" : "0");
    } catch {
      // Penyimpanan diblokir browser: setelan cukup berlaku untuk sesi ini.
    }
    if (value && ctx) void ctx.suspend();
    if (!value && ctx?.state === "suspended") void ctx.resume();
  },

  /** Dipanggil pada klik pertama agar AudioContext siap sebelum dibutuhkan. */
  unlock() {
    audio();
  },

  /** Detik countdown 3-2-1: makin dekat nol, makin tinggi dan makin tegas. */
  countdown(n: number) {
    const step = 3 - n; // 0, 1, 2
    kick({ gain: 0.4 + step * 0.06 });
    fatTone(392 * Math.pow(1.122, step * 2), {
      dur: 0.3,
      gain: 0.26,
      send: 0.35,
    });
    noise({ dur: 0.05, gain: 0.14, freq: 5200, q: 0.6, type: "highpass", send: 0.3 });
  },

  /** Bunyi "go" setelah countdown habis: akor naik + crash. */
  countdownGo() {
    kick({ gain: 0.6 });
    crash({ gain: 0.26, dur: 1.2 });
    chord(523.25, { dur: 0.5, gain: 0.2 });
    tone(1046.5, { at: 0.1, dur: 0.4, gain: 0.2, type: "square", send: 0.4 });
  },

  /** Reel slot mulai berputar; hentikan lewat objek yang dikembalikan. */
  reelSpin(durationMs: number): Loop {
    // Hentakan awal: terasa seperti tuas ditarik.
    kick({ gain: 0.38 });
    tone(220, { dur: 0.22, gain: 0.2, type: "sawtooth", sweepTo: 620, send: 0.25 });
    return tickLoop(durationMs, { startMs: 34, endMs: 115 });
  },

  /**
   * Satu digit mendarat dan terkunci. Nada naik mengikuti tangga nada mayor
   * supaya delapan digit terdengar seperti melodi yang menanjak, bukan
   * delapan bunyi yang sama.
   */
  reelLock(index: number) {
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5];
    const f = scale[Math.min(index, scale.length - 1)];
    noise({ dur: 0.05, gain: 0.26, freq: 1500, q: 3, send: 0.18 });
    kick({ at: 0.005, gain: 0.26 });
    fatTone(f, { at: 0.01, dur: 0.26, gain: 0.22, send: 0.4 });
  },

  /** Nama pemenang muncul: arpeggio naik yang melebar jadi akor. */
  winnerName() {
    kick({ gain: 0.5 });
    crash({ gain: 0.2, dur: 1.3 });
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      fatTone(f, { at: i * 0.1, dur: 0.42, gain: 0.24, send: 0.45 }),
    );
    chord(523.25, { at: 0.42, dur: 1.1, gain: 0.19 });
    sparkle({ at: 0.4, dur: 0.8, gain: 0.13, count: 10 });
  },

  /** Roda hadiah mulai berputar. */
  wheelSpin(durationMs: number): Loop {
    kick({ gain: 0.34 });
    return tickLoop(durationMs, { startMs: 36, endMs: 185 });
  },

  /** Roda berhenti tepat di satu segmen: klak mantap + hentakan. */
  wheelStop() {
    noise({ dur: 0.1, gain: 0.3, freq: 900, q: 2, send: 0.25 });
    kick({ gain: 0.5 });
    fatTone(392, { at: 0.02, dur: 0.3, gain: 0.24, send: 0.4 });
  },

  /**
   * Fanfare hadiah: dimainkan saat kartu pemenang dan confetti muncul.
   * Ini puncak acara, jadi paling panjang dan paling padat lapisannya.
   */
  reveal() {
    // 1. Hentakan pembuka + crash.
    kick({ gain: 0.62 });
    crash({ gain: 0.3, dur: 1.8 });

    // 2. Fanfare naik ala terompet kemenangan.
    const fanfare: [number, number][] = [
      [523.25, 0],
      [659.25, 0.11],
      [783.99, 0.22],
      [1046.5, 0.33],
    ];
    fanfare.forEach(([f, at]) =>
      fatTone(f, { at, dur: 0.4, gain: 0.26, send: 0.45 }),
    );

    // 3. Akor kemenangan ditahan panjang, plus hentakan penegas.
    chord(523.25, { at: 0.46, dur: 1.5, gain: 0.21 });
    kick({ at: 0.46, gain: 0.5 });
    kick({ at: 0.92, gain: 0.34 });
    crash({ at: 0.46, gain: 0.22, dur: 2 });

    // 4. Taburan confetti: kilau nada tinggi + desis.
    sparkle({ at: 0.5, dur: 1.4, gain: 0.15, count: 20 });
    for (let i = 0; i < 6; i++) {
      noise({
        at: 0.5 + i * 0.07,
        dur: 0.26,
        gain: 0.1,
        freq: 3000 + i * 450,
        q: 0.8,
        send: 0.4,
      });
    }

    // 5. Tepuk tangan penonton menutup momen.
    applause({ at: 0.62, dur: 2.2, gain: 0.3 });
  },

  /** Undian cepat tanpa panggung: fanfare pendek tapi tetap terasa menang. */
  quickWin() {
    kick({ gain: 0.42 });
    fatTone(659.25, { dur: 0.2, gain: 0.24, send: 0.35 });
    fatTone(987.77, { at: 0.13, dur: 0.36, gain: 0.24, send: 0.4 });
    chord(659.25, { at: 0.26, dur: 0.7, gain: 0.15 });
    sparkle({ at: 0.2, dur: 0.6, gain: 0.1, count: 8 });
  },

  /** Terjadi kesalahan (kupon habis, gagal mengundi). */
  error() {
    // Dua nada turun, sedikit sumbang: jelas terdengar sebagai kegagalan.
    fatTone(220, { dur: 0.26, gain: 0.2, send: 0.2 });
    fatTone(155, { at: 0.18, dur: 0.42, gain: 0.2, send: 0.2 });
  },
};

export type RaffleSoundLoop = Loop;
