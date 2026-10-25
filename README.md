# StepPulse — Exergaming Cadence & Telemetry Visualizer

A web application designed to analyze high-frequency exercise game logs, visualize second-by-second step rates (Steps Per Second / SPS), and quantify gamer excitement, stamina fatigue, and pacing dynamics during step-based exercise gaming.

Built with **React 19**, **TypeScript**, **Vite**, **TailwindCSS**, and **shadcn/ui**, following the **`design-taste-frontend`** (`framed-sheet`) design standard.

---

## Table of Contents
1. [Supported Log Formats](#supported-log-formats)
2. [Mathematical Formulations & Formulas](#mathematical-formulations--formulas)
   - [1. Session Duration & Total Steps](#1-session-duration--total-steps)
   - [2. Second-by-Second Cadence (SPS & SPM)](#2-second-by-second-cadence-sps--spm)
   - [3. Average & Peak Cadence](#3-average--peak-cadence)
   - [4. Cadence Acceleration & Deceleration](#4-cadence-acceleration--deceleration)
   - [5. Rolling Moving Averages (3s and 5s Trends)](#5-rolling-moving-averages-3s-and-5s-trends)
   - [6. Cadence Intensity Zones](#6-cadence-intensity-zones)
   - [7. Real-Time Second Excitement Score](#7-real-time-second-excitement-score)
   - [8. Overall Session Excitement Tier & Score](#8-overall-session-excitement-tier--score)
   - [9. Caloric Energy Expenditure](#9-caloric-energy-expenditure)
   - [10. Stamina & Fatigue Trend Ratio](#10-stamina--fatigue-trend-ratio)
3. [Architecture & Features](#architecture--features)
4. [Getting Started](#getting-started)

---

## Supported Log Formats

StepPulse ingests raw telemetry logs produced by step sensors, dance mats, or exergaming peripherals. Two main formats are automatically detected:

### 1. JSON Lines Format (`.txt` / `.jsonl` / `.log`)
Each line represents a sensor polling snapshot:
```json
{"steps": 0, "timestamp": 1792895611119}
{"steps": 1, "timestamp": 1792895611245}
{"steps": 2, "timestamp": 1792895611598}
```
- `steps`: Cumulative step count ($S \in \mathbb{N}$)
- `timestamp`: Epoch millisecond timestamp ($t \in \mathbb{N}$)

### 2. CSV / Comma-Separated Values (`.csv`)
```csv
timestamp,steps
1792895611119,0
1792895611245,1
```

---

## Mathematical Formulations & Formulas

All metrics in StepPulse are derived directly from verifiable timestamped sensor records. Below are the exact formulas used in the analytics engine:

### 1. Session Duration & Total Steps

Given raw records $R = \{(S_0, t_0), (S_1, t_1), \dots, (S_{n-1}, t_{n-1})\}$ sorted chronologically:

$$\text{Duration (seconds)}: \quad T = \frac{t_{n-1} - t_0}{1000}$$

$$\text{Total Steps}: \quad S_{\text{total}} = S_{n-1} - S_0$$

$$\text{Total 1-Second Analysis Windows}: \quad N_{\text{sec}} = \lceil T \rceil$$

---

### 2. Second-by-Second Cadence (SPS & SPM)

For each 1-second interval $s \in [1, N_{\text{sec}}]$, the window boundary is defined as:

$$W_s = \left[ t_0 + (s - 1) \times 1000, \; t_0 + s \times 1000 \right]$$

Let $S(t)$ be the latest cumulative step counter recorded at or before timestamp $t$.

$$\text{Steps in Second } s \; (\text{SPS}_s): \quad \text{SPS}_s = S(t_0 + s \times 1000) - S(t_0 + (s - 1) \times 1000)$$

$$\text{Equivalent Steps Per Minute } (\text{SPM}_s): \quad \text{SPM}_s = \text{SPS}_s \times 60$$

*Example*: If a gamer takes 4 steps within second $s$, $\text{SPS}_s = 4.0\text{ steps/sec}$, representing a sprint cadence equivalent to $240\text{ SPM}$.

---

### 3. Average & Peak Cadence

$$\text{Average Session Cadence}: \quad \overline{\text{SPS}} = \frac{S_{\text{total}}}{T}$$

$$\text{Average Session SPM}: \quad \overline{\text{SPM}} = \overline{\text{SPS}} \times 60$$

$$\text{Peak Cadence}: \quad \text{SPS}_{\max} = \max_{s \in [1, N_{\text{sec}}]} (\text{SPS}_s)$$

$$\text{Peak Moment}: \quad s_{\text{peak}} = \arg\max_{s} (\text{SPS}_s)$$

---

### 4. Cadence Acceleration & Deceleration

Measures the instantaneous rate of cadence change between consecutive 1-second intervals, reflecting sudden bursts of gamer effort or rapid braking:

$$\alpha_s = \text{SPS}_s - \text{SPS}_{s-1} \quad (\text{steps/sec}^2)$$

- $\alpha_s > 0$: **Cadence Acceleration / Surge** (e.g., gamer reacting to a fast game sequence)
- $\alpha_s < 0$: **Cadence Deceleration / Braking** (e.g., recovering after a burst)
- $\alpha_s = 0$: **Steady Rhythmic Cadence**

---

### 5. Rolling Moving Averages (3s and 5s Trends)

To filter single-second jitter while preserving rhythm dynamics, 3-second and 5-second moving averages are computed:

#### 3-Second Rolling Moving Average ($\text{MA3}_s$):
$$\text{MA3}_s = \frac{\text{SPS}_{s-1} + \text{SPS}_s + \text{SPS}_{s+1}}{3}$$
*(Boundary points $s=1$ and $s=N_{\text{sec}}$ clamp to the nearest valid sample).*

#### 5-Second Rolling Moving Average ($\text{MA5}_s$):
$$\text{MA5}_s = \frac{1}{|W_5(s)|} \sum_{k \in W_5(s)} \text{SPS}_k, \quad \text{where } W_5(s) = [\max(1, s-2), \min(N_{\text{sec}}, s+2)]$$

---

### 6. Cadence Intensity Zones

Every second $s$ is categorized into one of five functional exergaming intensity tiers based on $\text{SPS}_s$:

| Zone Name | SPS Range | SPM Range | Exergaming Context | Color Token |
| :--- | :--- | :--- | :--- | :--- |
| **Rest / Idle** | $\text{SPS} \le 0.2$ | $0\text{ SPM}$ | Pauses, cutscenes, resting | `#94a3b8` (Slate) |
| **Warmup / Light** | $0.2 < \text{SPS} \le 1.4$ | $12\text{--}84\text{ SPM}$ | Light rhythmic stepping | `#1b6c80` (Teal) |
| **Active Groove** | $1.4 < \text{SPS} \le 2.4$ | $85\text{--}144\text{ SPM}$ | Moderate aerobic gameplay | `#2f70bb` (Blue) |
| **High Intensity** | $2.4 < \text{SPS} \le 3.4$ | $145\text{--}204\text{ SPM}$ | Fast sprint gameplay sections | `#a86f0c` (Amber) |
| **Overdrive Frenzy** | $\text{SPS} > 3.4$ | $\ge 205\text{ SPM}$ | Maximum burst exertion | `#c4242a` (Crimson) |

---

### 7. Real-Time Second Excitement Score

Quantifies the gamer's excitement and physical engagement at second $s$ on a scale of $0\text{--}100$. The score aggregates four factors:

$$E_s = \min\left(100, \; \text{round}\left( C_{\text{cadence}} + C_{\text{sustained}} + C_{\text{accel}} + C_{\text{streak}} \right)\right)$$

Where:
1. **Instantaneous Cadence Weight** ($0\text{--}70$ pts):
   $$C_{\text{cadence}} = \min\left(70, \; \frac{\text{SPS}_s}{4.0} \times 70\right)$$
2. **Sustained Momentum Weight** ($0\text{--}15$ pts):
   $$C_{\text{sustained}} = \min\left(15, \; \frac{\text{MA3}_s}{4.0} \times 15\right)$$
3. **Pace Acceleration Surge Bonus** ($0\text{--}10$ pts):
   $$C_{\text{accel}} = \begin{cases} \min(10, \; \alpha_s \times 5) & \text{if } \alpha_s > 0 \\ 0 & \text{if } \alpha_s \le 0 \end{cases}$$
4. **Combo Streak Bonus** ($0\text{--}5$ pts):
   $$C_{\text{streak}} = \min(5, \; K_{\text{streak}} \times 1)$$
   *(where $K_{\text{streak}}$ is consecutive seconds maintained at $\text{SPS} \ge 3.0$).*

---

### 8. Overall Session Excitement Tier & Score

The session grade evaluates overall session excitement ($E_{\text{session}} \in [0, 100]$):

$$E_{\text{session}} = \min\left(100, \; \text{round}\left( \frac{\overline{\text{SPS}}}{3.5} \times 45 + \frac{\text{SPS}_{\max}}{5.0} \times 35 + R_{\text{sprint}} \times 20 \right)\right)$$

Where the High-Intensity Ratio ($R_{\text{sprint}}$) is:

$$R_{\text{sprint}} = \frac{|\{s \mid \text{SPS}_s \ge 2.5\}|}{N_{\text{sec}}}$$

#### Excitement Tier Thresholds:
- **S+ Tier** ($E_{\text{session}} \ge 80$): **Maximum Burst** — Peak cadence sustained across recurring high-tempo sections.
- **A Tier** ($65 \le E_{\text{session}} < 80$): **High Intensity** — Recurring sprint bursts with strong gamer engagement.
- **B Tier** ($45 \le E_{\text{session}} < 65$): **Steady Rhythm** — Consistent aerobic cadence with balanced stamina pacing.
- **C Tier** ($E_{\text{session}} < 45$): **Casual Pacing** — Relaxed pace suitable for warmup or light exploration.

---

### 9. Caloric Energy Expenditure

Estimated gross energy expenditure in kilocalories (kcal) using step mechanical equivalent and cadence intensity adjustments:

$$K = \text{round}\left(S_{\text{total}} \times 0.045 \times M_{\text{intensity}} \times 10\right) / 10$$

Where $M_{\text{intensity}}$ is the cadence-dependent metabolic multiplier:

$$M_{\text{intensity}} = \begin{cases} 
1.30 & \text{if } \overline{\text{SPS}} > 2.5 \; (\text{Vigorous anaerobic sprint}) \\
1.15 & \text{if } \overline{\text{SPS}} > 1.8 \; (\text{Active aerobic stepping}) \\
1.00 & \text{otherwise } (\text{Light baseline cadence})
\end{cases}$$

---

### 10. Stamina & Fatigue Trend Ratio

Quantifies pacing degradation or "second wind" stamina by comparing average cadence across the first half versus second half of the session:

$$\overline{\text{SPS}}_{\text{1st half}} = \frac{1}{\lfloor N_{\text{sec}} / 2 \rfloor} \sum_{s=1}^{\lfloor N_{\text{sec}} / 2 \rfloor} \text{SPS}_s$$

$$\overline{\text{SPS}}_{\text{2nd half}} = \frac{1}{N_{\text{sec}} - \lfloor N_{\text{sec}} / 2 \rfloor} \sum_{s=\lfloor N_{\text{sec}} / 2 \rfloor + 1}^{N_{\text{sec}}} \text{SPS}_s$$

$$\text{Fatigue Ratio}: \quad R_{\text{fatigue}} = \frac{\overline{\text{SPS}}_{\text{2nd half}}}{\overline{\text{SPS}}_{\text{1st half}}}$$

#### Classification:
- **Second wind pacing** ($R_{\text{fatigue}} > 1.15$): Gamer accelerated cadence in the latter half.
- **Fatigue decline** ($R_{\text{fatigue}} < 0.85$): Noticeable drop-off in cadence due to fatigue.
- **Balanced stamina** ($0.85 \le R_{\text{fatigue}} \le 1.15$): Highly consistent pacing maintained throughout.

---

## Architecture & Features

1. **Executive Finding Strip**: Immediate top-level session diagnosis answering core performance questions at a glance.
2. **Unified KPI Strip**: Total steps, peak cadence, average cadence, excitement grade, and caloric burn split by quiet hairlines with tabular figures.
3. **Second-by-Second Cadence Timeline**:
   - Flat bar series mapped to 4-tier functional cadence palette.
   - 3-second moving trend overlay.
   - Distinct, accessible reference lines: **Violet** (`#7c3aed`) for Sprint Threshold ($3.0\text{ SPS}$) and **Emerald Green** (`#059669`) for Session Average ($\overline{\text{SPS}}$).
   - Interactive zoom & pan brush controller.
4. **Replay Simulator**:
   - 240° calibrated tachometer/speedometer gauge.
   - Smooth `requestAnimationFrame` value tweening ($280\text{ms}$ `easeOutCubic`) and hardware-accelerated CSS needle transitions.
   - Dedicated lower open chamber preventing text/needle collisions.
   - **Verified Telemetry Grid**: Real-time display of Step Delta, Instantaneous Acceleration ($\Delta\text{SPS/s}$), 3s Moving Trend, and Cumulative Hardware Step Count.
   - Web Audio API synthesizer for rhythm clicks without external audio files.
5. **Cadence Breakdown & Stamina Analysis**:
   - Donut distribution of time spent in Rest, Warmup, Active, Sprint, and Burst zones.
   - First-half vs. Second-half pacing fatigue split.
6. **Telemetry Inspector**: Searchable, sortable second-by-second data table with CSV export.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd stepsChangeVisualize

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Running Design & Token Verification
The project incorporates automated visual and token linting via `tasteskill v2`:
```bash
node .agents/skills/design-taste-frontend/scripts/inspect.mjs --app http://localhost:5173/
```
