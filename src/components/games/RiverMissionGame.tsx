import { useCallback, useEffect, useRef, useState } from 'react';
import { Gauge, Pause, Play, RotateCcw, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';

const WORLD_WIDTH = 480;
const WORLD_HEIGHT = 720;
const BEST_SCORE_KEY = 'lbw-arcade-river-mission-best';
const UNLOCKED_STAGE_KEY = 'lbw-arcade-river-mission-stage';
const STAGE_DURATION_SECONDS = 5 * 60;

type GameStatus = 'ready' | 'playing' | 'paused' | 'gameover';
type GameSound = 'start' | 'fire' | 'explosion' | 'energy' | 'hit' | 'gameover';
type GameStage = 1 | 2 | 3;

type Bullet = { x: number; y: number; speed: number };
type Enemy = { x: number; y: number; width: number; height: number; speed: number; vx: number; kind: 'boat' | 'drone' };
type EnergyCell = { x: number; y: number; radius: number; speed: number };

interface RuntimeGame {
  playerX: number;
  playerY: number;
  bullets: Bullet[];
  enemies: Enemy[];
  energyCells: EnergyCell[];
  score: number;
  distance: number;
  energy: number;
  lives: number;
  riverOffset: number;
  enemyTimer: number;
  energyTimer: number;
  shotCooldown: number;
  invulnerableFor: number;
  stage: GameStage;
  stageElapsed: number;
  stageIntroFor: number;
  lastFrame: number;
  lastHudUpdate: number;
}

interface HudState {
  score: number;
  distance: number;
  energy: number;
  lives: number;
  best: number;
  stage: GameStage;
  stageElapsed: number;
}

interface RiverMissionGameProps {
  onScore?: (score: { fase: GameStage; pontos: number; distancia: number }) => void;
}

function readBestScore(): number {
  try {
    return Number(window.localStorage.getItem(BEST_SCORE_KEY) || 0);
  } catch {
    return 0;
  }
}

function readUnlockedStage(): GameStage {
  try {
    const storedStage = window.localStorage.getItem(UNLOCKED_STAGE_KEY);
    if (storedStage === '3') return 3;
    if (storedStage === '2') return 2;
    return 1;
  } catch {
    return 1;
  }
}

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

function createRuntime(stage: GameStage = readUnlockedStage()): RuntimeGame {
  return {
    playerX: WORLD_WIDTH / 2,
    playerY: WORLD_HEIGHT - 112,
    bullets: [],
    enemies: [],
    energyCells: [],
    score: 0,
    distance: 0,
    energy: 100,
    lives: 3,
    riverOffset: 0,
    enemyTimer: 0.8,
    energyTimer: 5,
    shotCooldown: 0,
    invulnerableFor: 0,
    stage,
    stageElapsed: 0,
    stageIntroFor: 2.2,
    lastFrame: 0,
    lastHudUpdate: 0,
  };
}

function riverBounds(y: number, offset: number) {
  const worldY = y + offset;
  const center = WORLD_WIDTH / 2
    + Math.sin(worldY * 0.0065) * 48
    + Math.sin(worldY * 0.015) * 18;
  const halfWidth = 142 + Math.sin(worldY * 0.0042 + 1.3) * 24;
  return { left: center - halfWidth, right: center + halfWidth };
}

function overlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export default function RiverMissionGame({ onScore }: RiverMissionGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const runtimeRef = useRef<RuntimeGame>(createRuntime());
  const frameRef = useRef<number | null>(null);
  const statusRef = useRef<GameStatus>('ready');
  const controlsRef = useRef({ left: false, right: false, boost: false, brake: false, fire: false });
  const soundEnabledRef = useRef(true);
  const [status, setStatus] = useState<GameStatus>('ready');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hud, setHud] = useState<HudState>(() => ({
    score: 0,
    distance: 0,
    energy: 100,
    lives: 3,
    best: readBestScore(),
    stage: readUnlockedStage(),
    stageElapsed: 0,
  }));

  const changeStatus = useCallback((next: GameStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const playSound = useCallback((sound: GameSound) => {
    if (!soundEnabledRef.current) return;
    try {
      const AudioContextClass = window.AudioContext
        || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const audio = audioRef.current || new AudioContextClass();
      audioRef.current = audio;
      if (audio.state === 'suspended') void audio.resume();

      const now = audio.currentTime;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.connect(gain);
      gain.connect(audio.destination);

      const settings: Record<GameSound, { from: number; to: number; duration: number; volume: number; wave: OscillatorType }> = {
        start: { from: 180, to: 520, duration: 0.22, volume: 0.08, wave: 'square' },
        fire: { from: 650, to: 180, duration: 0.075, volume: 0.045, wave: 'square' },
        explosion: { from: 150, to: 42, duration: 0.2, volume: 0.095, wave: 'sawtooth' },
        energy: { from: 360, to: 920, duration: 0.18, volume: 0.075, wave: 'square' },
        hit: { from: 95, to: 38, duration: 0.32, volume: 0.12, wave: 'sawtooth' },
        gameover: { from: 210, to: 55, duration: 0.65, volume: 0.09, wave: 'square' },
      };
      const selected = settings[sound];
      oscillator.type = selected.wave;
      oscillator.frequency.setValueAtTime(selected.from, now);
      oscillator.frequency.exponentialRampToValueAtTime(selected.to, now + selected.duration);
      gain.gain.setValueAtTime(selected.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + selected.duration);
      oscillator.start(now);
      oscillator.stop(now + selected.duration);
    } catch {
      // Alguns navegadores bloqueiam áudio até a primeira interação; o jogo segue normalmente.
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((current) => {
      const next = !current;
      soundEnabledRef.current = next;
      if (next) playSound('start');
      return next;
    });
  }, [playSound]);

  const syncHud = useCallback((game: RuntimeGame) => {
    setHud((previous) => ({
      score: Math.floor(game.score),
      distance: Math.floor(game.distance),
      energy: Math.max(0, Math.round(game.energy)),
      lives: game.lives,
      best: Math.max(previous.best, Math.floor(game.score)),
      stage: game.stage,
      stageElapsed: game.stageElapsed,
    }));
  }, []);

  const finishGame = useCallback((game: RuntimeGame) => {
    const finalScore = Math.floor(game.score);
    const best = Math.max(readBestScore(), finalScore);
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(best));
    } catch {
      // O jogo continua funcionando mesmo quando o navegador bloqueia o armazenamento local.
    }
    syncHud(game);
    setHud((previous) => ({ ...previous, best }));
    onScore?.({ fase: game.stage, pontos: finalScore, distancia: Math.floor(game.distance) });
    playSound('gameover');
    changeStatus('gameover');
  }, [changeStatus, onScore, playSound, syncHud]);

  const startGame = useCallback(() => {
    const unlockedStage = readUnlockedStage();
    runtimeRef.current = createRuntime(unlockedStage);
    controlsRef.current = { left: false, right: false, boost: false, brake: false, fire: false };
    setHud((previous) => ({
      score: 0,
      distance: 0,
      energy: 100,
      lives: 3,
      best: previous.best,
      stage: unlockedStage,
      stageElapsed: 0,
    }));
    playSound('start');
    changeStatus('playing');
  }, [changeStatus, playSound]);

  useEffect(() => () => {
    void audioRef.current?.close();
  }, []);

  const setControl = useCallback((control: keyof typeof controlsRef.current, active: boolean) => {
    controlsRef.current[control] = active;
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'a', 'A', 'd', 'D', 'w', 'W', 's', 'S'].includes(event.key)) {
        event.preventDefault();
      }
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') setControl('left', true);
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') setControl('right', true);
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') setControl('boost', true);
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') setControl('brake', true);
      if (event.key === ' ') setControl('fire', true);
      if (event.key.toLowerCase() === 'p' && statusRef.current === 'playing') changeStatus('paused');
      else if (event.key.toLowerCase() === 'p' && statusRef.current === 'paused') changeStatus('playing');
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') setControl('left', false);
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') setControl('right', false);
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') setControl('boost', false);
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') setControl('brake', false);
      if (event.key === ' ') setControl('fire', false);
    };
    const clearControls = () => {
      controlsRef.current = { left: false, right: false, boost: false, brake: false, fire: false };
    };
    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clearControls);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clearControls);
    };
  }, [changeStatus, setControl]);

  const drawGame = useCallback((ctx: CanvasRenderingContext2D, game: RuntimeGame) => {
    const background = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    background.addColorStop(0, '#071b2b');
    background.addColorStop(1, '#102f27');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Rio dinâmico. O cenário é desenhado por funções matemáticas, sem imagens externas.
    const points: Array<{ y: number; left: number; right: number }> = [];
    for (let y = -20; y <= WORLD_HEIGHT + 20; y += 12) {
      const bounds = riverBounds(y, game.riverOffset);
      points.push({ y, ...bounds });
    }
    const water = ctx.createLinearGradient(0, 0, WORLD_WIDTH, 0);
    water.addColorStop(0, '#075b8c');
    water.addColorStop(0.5, '#0b8bc0');
    water.addColorStop(1, '#075b8c');
    ctx.beginPath();
    ctx.moveTo(points[0].left, points[0].y);
    points.forEach((point) => ctx.lineTo(point.left, point.y));
    [...points].reverse().forEach((point) => ctx.lineTo(point.right, point.y));
    ctx.closePath();
    ctx.fillStyle = water;
    ctx.fill();

    // Faixas horizontais discretas reforçam a estética de videogame 8-bit.
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#d5f6ff';
    for (let y = ((game.riverOffset * 0.65) % 32) - 32; y < WORLD_HEIGHT; y += 32) {
      const bounds = riverBounds(y, game.riverOffset);
      ctx.fillRect(bounds.left + 8, y, Math.max(0, bounds.right - bounds.left - 16), 3);
    }
    ctx.restore();

    ctx.lineWidth = 5;
    ctx.strokeStyle = '#71d36b';
    ctx.beginPath();
    points.forEach((point, index) => index === 0 ? ctx.moveTo(point.left, point.y) : ctx.lineTo(point.left, point.y));
    ctx.stroke();
    ctx.beginPath();
    points.forEach((point, index) => index === 0 ? ctx.moveTo(point.right, point.y) : ctx.lineTo(point.right, point.y));
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#d5f6ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 24]);
    for (let lane = -1; lane <= 1; lane += 1) {
      ctx.beginPath();
      for (let y = -30; y < WORLD_HEIGHT + 30; y += 18) {
        const bounds = riverBounds(y, game.riverOffset);
        const x = (bounds.left + bounds.right) / 2 + lane * 52;
        if (y === -30) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Células de energia.
    game.energyCells.forEach((cell) => {
      ctx.save();
      ctx.translate(cell.x, cell.y);
      ctx.rotate(game.riverOffset * 0.01);
      ctx.shadowColor = '#5ee7ff';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#36d7ff';
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6;
        const x = Math.cos(angle) * cell.radius;
        const y = Math.sin(angle) * cell.radius;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#062f48';
      ctx.fillRect(-3, -9, 6, 18);
      ctx.fillRect(-9, -3, 18, 6);
      ctx.restore();
    });

    game.enemies.forEach((enemy) => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      if (enemy.vx) ctx.rotate(enemy.vx * 0.0035);
      ctx.shadowColor = enemy.kind === 'boat' ? '#ff9d3d' : '#fb5bd8';
      ctx.shadowBlur = 10;
      ctx.fillStyle = enemy.kind === 'boat' ? '#ff8b2c' : '#eb4bc8';
      if (enemy.kind === 'boat') {
        ctx.beginPath();
        ctx.moveTo(0, -enemy.height / 2);
        ctx.lineTo(enemy.width / 2, enemy.height / 2);
        ctx.lineTo(0, enemy.height / 3);
        ctx.lineTo(-enemy.width / 2, enemy.height / 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff3d4';
        ctx.fillRect(-3, -8, 6, 12);
      } else {
        ctx.fillRect(-enemy.width / 2, -4, enemy.width, 8);
        ctx.fillRect(-8, -enemy.height / 2, 16, enemy.height);
        ctx.fillStyle = '#ffe4fb';
        ctx.fillRect(-3, -3, 6, 6);
      }
      ctx.restore();
    });

    ctx.save();
    ctx.fillStyle = '#fff7a8';
    ctx.shadowColor = '#ffe956';
    ctx.shadowBlur = 10;
    game.bullets.forEach((bullet) => ctx.fillRect(bullet.x - 2, bullet.y - 10, 4, 14));
    ctx.restore();

    // Nave LBW.
    ctx.save();
    ctx.translate(game.playerX, game.playerY);
    const flashing = game.invulnerableFor > 0 && Math.floor(game.invulnerableFor * 12) % 2 === 0;
    ctx.globalAlpha = flashing ? 0.25 : 1;
    ctx.shadowColor = '#3a7cff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#f8fbff';
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(18, 20);
    ctx.lineTo(5, 14);
    ctx.lineTo(0, 25);
    ctx.lineTo(-5, 14);
    ctx.lineTo(-18, 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1e5eff';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(6, 12);
    ctx.lineTo(0, 8);
    ctx.lineTo(-6, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath();
    ctx.moveTo(-5, 22);
    ctx.lineTo(0, 37 + Math.sin(game.riverOffset * 0.08) * 4);
    ctx.lineTo(5, 22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(4, 15, 30, 0.74)';
    ctx.fillRect(12, 12, 142, 56);
    ctx.strokeStyle = 'rgba(100, 190, 255, 0.55)';
    ctx.strokeRect(12, 12, 142, 56);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 16px system-ui';
    ctx.fillText(`PONTOS ${Math.floor(game.score).toString().padStart(6, '0')}`, 24, 35);
    ctx.fillStyle = '#8ddcff';
    ctx.font = '700 12px system-ui';
    ctx.fillText(`FASE ${game.stage} · ${Math.floor(game.distance)} m`, 24, 56);

    if (game.stageIntroFor > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(2, 10, 24, 0.78)';
      ctx.fillRect(78, WORLD_HEIGHT / 2 - 62, WORLD_WIDTH - 156, 124);
      ctx.strokeStyle = game.stage === 1 ? '#60a5fa' : game.stage === 2 ? '#fb923c' : '#e879f9';
      ctx.lineWidth = 4;
      ctx.strokeRect(78, WORLD_HEIGHT / 2 - 62, WORLD_WIDTH - 156, 124);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '900 34px system-ui';
      ctx.fillText(`FASE ${game.stage}`, WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 8);
      ctx.fillStyle = game.stage === 1 ? '#8ddcff' : game.stage === 2 ? '#fdba74' : '#f0abfc';
      ctx.font = '800 14px system-ui';
      ctx.fillText(
        game.stage === 1
          ? 'SOBREVIVA POR 5 MINUTOS'
          : game.stage === 2
            ? 'SOBREVIVA MAIS 5 MINUTOS'
            : 'CUIDADO COM AS DIAGONAIS',
        WORLD_WIDTH / 2,
        WORLD_HEIGHT / 2 + 28,
      );
      ctx.restore();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderStill = () => drawGame(ctx, runtimeRef.current);
    renderStill();
    if (status !== 'playing') return;

    const game = runtimeRef.current;
    game.lastFrame = performance.now();

    const hitPlayer = () => {
      if (game.invulnerableFor > 0 || statusRef.current !== 'playing') return;
      game.lives -= 1;
      game.energy = Math.max(game.energy, 45);
      game.playerX = WORLD_WIDTH / 2;
      game.invulnerableFor = 1.8;
      playSound('hit');
      if (game.lives <= 0) finishGame(game);
    };

    const loop = (now: number) => {
      if (statusRef.current !== 'playing') return;
      const dt = Math.min((now - game.lastFrame) / 1000, 0.035);
      game.lastFrame = now;
      const controls = controlsRef.current;
      const stageSpeed = game.stage === 3 ? 1.38 : game.stage === 2 ? 1.22 : 1;
      const scrollSpeed = (controls.boost ? 215 : controls.brake ? 92 : 145) * stageSpeed;
      const horizontalSpeed = controls.boost ? 205 : 235;

      if (controls.left) game.playerX -= horizontalSpeed * dt;
      if (controls.right) game.playerX += horizontalSpeed * dt;
      game.playerX = Math.max(18, Math.min(WORLD_WIDTH - 18, game.playerX));
      game.riverOffset += scrollSpeed * dt;
      game.distance += scrollSpeed * dt * 0.08;
      game.score += scrollSpeed * dt * 0.12;
      game.stageElapsed += dt;
      game.stageIntroFor = Math.max(0, game.stageIntroFor - dt);
      const stageEnergyDrain = game.stage === 3 ? 1.22 : game.stage === 2 ? 1.12 : 1;
      game.energy -= (controls.boost ? 4.7 : controls.brake ? 1.2 : 2.6) * stageEnergyDrain * dt;
      game.enemyTimer -= dt;
      game.energyTimer -= dt;
      game.shotCooldown -= dt;
      game.invulnerableFor = Math.max(0, game.invulnerableFor - dt);

      if (controls.fire && game.shotCooldown <= 0) {
        game.bullets.push({ x: game.playerX, y: game.playerY - 25, speed: 430 });
        game.shotCooldown = 0.2;
        playSound('fire');
      }

      if (game.enemyTimer <= 0) {
        const bounds = riverBounds(-40, game.riverOffset);
        const kind = Math.random() > 0.55 ? 'boat' : 'drone';
        const width = kind === 'boat' ? 28 : 42;
        const movesDiagonally = game.stage === 3 && Math.random() < 0.62;
        game.enemies.push({
          x: bounds.left + 35 + Math.random() * Math.max(20, bounds.right - bounds.left - 70),
          y: -42,
          width,
          height: kind === 'boat' ? 36 : 25,
          speed: scrollSpeed * (kind === 'boat' ? 0.83 : 1.08),
          vx: movesDiagonally ? (Math.random() > 0.5 ? 1 : -1) * (48 + Math.random() * 52) : 0,
          kind,
        });
        const difficulty = Math.min(0.55, game.distance / 2200);
        const stageSpawnBonus = game.stage === 3 ? 0.25 : game.stage === 2 ? 0.16 : 0;
        game.enemyTimer = Math.max(0.25, 1.05 - difficulty - stageSpawnBonus + Math.random() * 0.45);
      }

      if (game.energyTimer <= 0) {
        const bounds = riverBounds(-30, game.riverOffset);
        game.energyCells.push({
          x: bounds.left + 42 + Math.random() * Math.max(20, bounds.right - bounds.left - 84),
          y: -30,
          radius: 13,
          speed: scrollSpeed,
        });
        game.energyTimer = 6 + Math.random() * 3;
      }

      game.bullets.forEach((bullet) => { bullet.y -= bullet.speed * dt; });
      game.enemies.forEach((enemy) => {
        enemy.y += enemy.speed * dt;
        enemy.x += enemy.vx * dt;
        if (enemy.vx !== 0) {
          const bounds = riverBounds(enemy.y, game.riverOffset);
          const margin = enemy.width / 2 + 8;
          if (enemy.x < bounds.left + margin) {
            enemy.x = bounds.left + margin;
            enemy.vx = Math.abs(enemy.vx);
          } else if (enemy.x > bounds.right - margin) {
            enemy.x = bounds.right - margin;
            enemy.vx = -Math.abs(enemy.vx);
          }
        }
      });
      game.energyCells.forEach((cell) => { cell.y += cell.speed * dt; });

      for (let bulletIndex = game.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
        const bullet = game.bullets[bulletIndex];
        let consumed = false;
        for (let enemyIndex = game.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
          const enemy = game.enemies[enemyIndex];
          if (overlaps(bullet.x - 2, bullet.y - 10, 4, 14, enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height)) {
            game.enemies.splice(enemyIndex, 1);
            game.bullets.splice(bulletIndex, 1);
            game.score += enemy.kind === 'drone' ? 180 : 120;
            playSound('explosion');
            consumed = true;
            break;
          }
        }
        if (!consumed && bullet.y < -20) game.bullets.splice(bulletIndex, 1);
      }

      for (let enemyIndex = game.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
        const enemy = game.enemies[enemyIndex];
        if (enemy.y > WORLD_HEIGHT + 60) {
          game.enemies.splice(enemyIndex, 1);
          continue;
        }
        if (overlaps(game.playerX - 15, game.playerY - 22, 30, 44, enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height)) {
          game.enemies.splice(enemyIndex, 1);
          hitPlayer();
        }
      }

      for (let cellIndex = game.energyCells.length - 1; cellIndex >= 0; cellIndex -= 1) {
        const cell = game.energyCells[cellIndex];
        if (cell.y > WORLD_HEIGHT + 30) {
          game.energyCells.splice(cellIndex, 1);
          continue;
        }
        if (overlaps(game.playerX - 16, game.playerY - 23, 32, 46, cell.x - cell.radius, cell.y - cell.radius, cell.radius * 2, cell.radius * 2)) {
          game.energyCells.splice(cellIndex, 1);
          game.energy = Math.min(100, game.energy + 34);
          game.score += 80;
          playSound('energy');
        }
      }

      const playerRiver = riverBounds(game.playerY, game.riverOffset);
      if (game.playerX - 14 < playerRiver.left || game.playerX + 14 > playerRiver.right) hitPlayer();
      if (game.energy <= 0) finishGame(game);

      if (game.stage < 3 && game.stageElapsed >= STAGE_DURATION_SECONDS && statusRef.current === 'playing') {
        game.stage = (game.stage + 1) as GameStage;
        game.stageElapsed = 0;
        game.stageIntroFor = 3;
        game.energy = 100;
        game.lives = 3;
        game.invulnerableFor = 2.5;
        game.bullets = [];
        game.enemies = [];
        game.energyCells = [];
        game.enemyTimer = 1;
        game.energyTimer = 4;
        onScore?.({ fase: game.stage, pontos: Math.floor(game.score), distancia: Math.floor(game.distance) });
        try {
          window.localStorage.setItem(UNLOCKED_STAGE_KEY, String(game.stage));
        } catch {
          // Mantém a transição na sessão mesmo se o armazenamento local estiver bloqueado.
        }
        playSound('start');
      }

      if (now - game.lastHudUpdate > 100) {
        game.lastHudUpdate = now;
        syncHud(game);
      }
      drawGame(ctx, game);
      if (statusRef.current === 'playing') frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [drawGame, finishGame, onScore, playSound, status, syncHud]);

  const pointerControlProps = (control: keyof typeof controlsRef.current) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setControl(control, true);
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setControl(control, false);
    },
    onPointerCancel: () => setControl(control, false),
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  });

  const statusCopy = status === 'ready'
    ? {
        title: `LBW River Mission — Fase ${hud.stage}`,
        text: hud.stage === 1
          ? 'Sobreviva por 5 minutos para desbloquear a Fase 2.'
          : hud.stage === 2
            ? 'Sobreviva por mais 5 minutos para desbloquear a Fase 3.'
            : 'Checkpoint salvo: você começará diretamente na Fase 3.',
      }
    : status === 'paused'
      ? { title: 'Jogo pausado', text: 'Sua missão está preservada.' }
      : {
          title: `Fim da tentativa — Fase ${hud.stage}`,
          text: hud.stage > 1
            ? `Você marcou ${hud.score} pontos. A Fase ${hud.stage} continua desbloqueada.`
            : `Você percorreu ${hud.distance} metros. Tente novamente sobreviver aos 5 minutos.`,
        };

  const displayedTime = hud.stage < 3
    ? formatTime(STAGE_DURATION_SECONDS - hud.stageElapsed)
    : formatTime(hud.stageElapsed);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,560px)_1fr] gap-6 items-start">
        <section className="rounded-[28px] overflow-hidden border border-blue-200 bg-[#071528] shadow-2xl shadow-blue-950/20">
          <div className="grid grid-cols-5 gap-px bg-white/10 border-b border-white/10">
            <HudItem label="Pontos" value={hud.score.toLocaleString('pt-BR')} />
            <HudItem label="Fase" value={String(hud.stage)} />
            <HudItem label={hud.stage < 3 ? 'Restante' : 'Tempo'} value={displayedTime} />
            <HudItem label="Vidas" value={'●'.repeat(Math.max(0, hud.lives)) || '—'} />
            <HudItem label="Recorde" value={hud.best.toLocaleString('pt-BR')} />
          </div>

          <div className="relative max-w-[480px] mx-auto bg-[#071b2b] select-none" style={{ touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              width={WORLD_WIDTH}
              height={WORLD_HEIGHT}
              aria-label="Jogo LBW River Mission"
              className="block w-full h-auto aspect-[2/3] [image-rendering:pixelated]"
            />

            <button
              type="button"
              onClick={toggleSound}
              aria-label={soundEnabled ? 'Desativar som' : 'Ativar som'}
              className="absolute right-3 top-3 z-30 inline-flex h-11 items-center gap-2 rounded-full border border-white/30 bg-slate-950/75 px-3 text-[10px] font-black uppercase tracking-wider text-white shadow-xl backdrop-blur active:scale-95"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              <span>{soundEnabled ? 'Som ligado' : 'Som desligado'}</span>
            </button>

            {status !== 'playing' && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#04101f]/75 backdrop-blur-[2px] p-6">
                <div className="w-full max-w-sm rounded-3xl border border-blue-300/30 bg-[#081a35]/95 p-7 text-center text-white shadow-2xl">
                  <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    {status === 'gameover' ? <Trophy size={30} /> : <Zap size={30} />}
                  </div>
                  <h2 className="text-2xl font-black m-0">{statusCopy.title}</h2>
                  <p className="text-sm text-blue-100/80 leading-relaxed mt-3 mb-6">{statusCopy.text}</p>
                  <p className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-cyan-200 mb-4">
                    Celular: botão TIRO · Teclado: Espaço
                  </p>
                  <button
                    type="button"
                    onClick={status === 'paused' ? () => changeStatus('playing') : startGame}
                    className="w-full rounded-2xl border-0 bg-blue-600 hover:bg-blue-500 text-white py-4 px-5 font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    {status === 'paused' ? <Play size={20} /> : status === 'gameover' ? <RotateCcw size={20} /> : <Play size={20} />}
                    {status === 'paused'
                      ? 'Continuar missão'
                      : status === 'gameover'
                        ? `Recomeçar fase ${hud.stage}`
                        : `Iniciar fase ${hud.stage}`}
                  </button>
                </div>
              </div>
            )}

            {status === 'playing' && (
              <div className="absolute inset-x-3 bottom-3 z-20 flex items-end justify-between gap-4 xl:hidden" style={{ touchAction: 'none' }}>
                <div className="flex gap-2">
                  <MobileControlButton label="Esquerda" symbol="←" {...pointerControlProps('left')} />
                  <MobileControlButton label="Direita" symbol="→" {...pointerControlProps('right')} />
                </div>
                <div className="flex gap-2">
                  <MobileControlButton label="Atirar" symbol="TIRO" featured {...pointerControlProps('fire')} />
                  <MobileControlButton label="Acelerar" symbol="▲" {...pointerControlProps('boost')} />
                  <button
                    type="button"
                    aria-label="Pausar"
                    onClick={() => changeStatus('paused')}
                    className="w-14 h-14 rounded-full border border-white/30 bg-slate-950/75 text-white backdrop-blur flex items-center justify-center shadow-xl active:scale-95"
                  >
                    <Pause size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="px-4 py-4 bg-[#081a35] border-t border-white/10">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200">Energia da nave</span>
              <span className="text-xs font-black text-white">{hud.energy}%</span>
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-100 ${hud.energy > 35 ? 'bg-cyan-400' : 'bg-orange-500'}`}
                style={{ width: `${hud.energy}%` }}
              />
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center"><Gauge size={23} /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 m-0">Controles</p>
                <h3 className="text-lg font-black text-slate-900 m-0">Computador e celular</h3>
              </div>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              Desvie das margens e dos inimigos. Colete as células azuis para recuperar energia.
            </p>
            <div className="grid grid-cols-3 gap-3" style={{ touchAction: 'none' }}>
              <ControlButton label="Esquerda" symbol="←" {...pointerControlProps('left')} />
              <ControlButton label="Atirar" symbol="TIRO" featured {...pointerControlProps('fire')} />
              <ControlButton label="Direita" symbol="→" {...pointerControlProps('right')} />
              <ControlButton label="Frear" symbol="▼" {...pointerControlProps('brake')} />
              <button
                type="button"
                onClick={() => status === 'playing' ? changeStatus('paused') : status === 'paused' ? changeStatus('playing') : undefined}
                disabled={status === 'ready' || status === 'gameover'}
                className="min-h-20 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 disabled:opacity-40 flex flex-col items-center justify-center gap-1 font-black cursor-pointer active:scale-95 transition-transform"
              >
                <Pause size={21} />
                <span className="text-[10px] uppercase tracking-wider">Pausar</span>
              </button>
              <ControlButton label="Acelerar" symbol="▲" {...pointerControlProps('boost')} />
            </div>
            <p className="text-[11px] text-slate-400 mt-4 mb-0 text-center">
              Teclado: setas ou A/D · Espaço para atirar · P para pausar
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-800 mb-2">Objetivo da missão</p>
            <p className="text-sm text-cyan-950 leading-relaxed m-0">
              {hud.stage === 1
                ? 'Sobreviva por 5 minutos, destrua obstáculos e administre sua energia para desbloquear a Fase 2.'
                : hud.stage === 2
                  ? 'A Fase 2 é mais rápida. Sobreviva por mais 5 minutos para desbloquear a Fase 3.'
                  : 'Na Fase 3, parte dos inimigos desce em diagonal e muda de direção. Se perder, você recomeçará desta fase.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function HudItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-3 text-center bg-[#081a35] min-w-0">
      <span className="block text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-blue-300 truncate">{label}</span>
      <strong className="block text-xs sm:text-sm text-white mt-0.5 truncate">{value}</strong>
    </div>
  );
}

function ControlButton({
  label,
  symbol,
  featured = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; symbol: string; featured?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      className={`min-h-20 rounded-2xl border flex flex-col items-center justify-center gap-1 font-black cursor-pointer active:scale-95 transition-transform select-none ${
        featured
          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
          : 'bg-white border-slate-200 text-slate-800 shadow-sm'
      }`}
    >
      <span className="text-2xl leading-none">{symbol}</span>
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </button>
  );
}

function MobileControlButton({
  label,
  symbol,
  featured = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; symbol: string; featured?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      className={`${featured ? 'w-[72px]' : 'w-14'} h-14 rounded-full border text-sm font-black backdrop-blur shadow-xl active:scale-90 select-none ${
        featured
          ? 'bg-blue-600/90 border-blue-300/70 text-white'
          : 'bg-slate-950/75 border-white/30 text-white'
      }`}
    >
      {symbol}
    </button>
  );
}
