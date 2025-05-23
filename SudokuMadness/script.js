// ────── script.js ─────────

// Sound Effect Utility
function playTone(freq, duration = 150) {
  if (isMuted) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);
  setTimeout(() => { osc.stop(); ctx.close(); }, duration);
}

// Game State
let board = [];
let solution = [];
let shuffleCounter = 0;
let timerInterval = null;
let activeCell = null;
let isMuted = false;

// DOM Refs
const boardEl    = document.getElementById('board');
const counterEl  = document.getElementById('shuffle-counter');
const timerEl    = document.getElementById('timer');
const numpadEl   = document.getElementById('numpad');
const newGameBtn = document.getElementById('new-game');
const dialogEl   = document.getElementById('game-dialog');
const dialogTitle = document.getElementById('dialog-title');
const dialogText = document.getElementById('dialog-text');
const dialogBtn1 = document.getElementById('dialog-btn1');
const dialogBtn2 = document.getElementById('dialog-btn2');
const muteBtn = document.getElementById('mute-btn');

// Init
document.addEventListener('DOMContentLoaded', () => {
  showIntroduction();
  boardEl.addEventListener('click', onCellClick);
  numpadEl.addEventListener('click', onNumpadClick);
  document.addEventListener('keydown', onKeyDown);
  newGameBtn.addEventListener('click', newGame);
  muteBtn.addEventListener('click', toggleMute);
});

// New Game
function newGame() {
  clearInterval(timerInterval);
  boardEl.classList.remove('win-effect', 'shuffle-effect');
  ({ full: solution } = generateFullSolution());

  let puzzle;
  do {
    puzzle = makePuzzle(JSON.parse(JSON.stringify(solution)), 40);
  } while (!hasUniqueSolution(puzzle));
  board = puzzle;

  shuffleCounter = rand(2, 5);
  counterEl.textContent = shuffleCounter;
  updateCounterStyle(shuffleCounter);

  renderBoard();
  startTimer();
}

// Timer
function startTimer() {
  const start = Date.now();
  timerEl.textContent = 'Time: 00:00';
  timerInterval = setInterval(() => {
    const diff = Date.now() - start;
    const m = String(Math.floor(diff / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    timerEl.textContent = `Time: ${m}:${s}`;
  }, 500);
}

// Render Board
function renderBoard() {
  boardEl.innerHTML = '';
  clearHighlights();
  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent').trim();

  board.forEach((row, r) => {
    row.forEach((val, c) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;

      // base border
      cell.style.border = '1px solid #333';
      // subgrid accent borders
      if (r % 3 === 0)       cell.style.borderTop    = `3px solid ${accent}`;
      if ((r + 1) % 3 === 0) cell.style.borderBottom = `3px solid ${accent}`;
      if (c % 3 === 0)       cell.style.borderLeft   = `3px solid ${accent}`;
      if ((c + 1) % 3 === 0) cell.style.borderRight  = `3px solid ${accent}`;

      if (val !== 0) {
        cell.textContent = val;
        cell.classList.add('clue');
      }
      boardEl.appendChild(cell);
    });
  });
}

// Clear Highlights
function clearHighlights() {
  document.querySelectorAll('.cell.highlight').forEach(c => c.classList.remove('highlight'));
}

// Update Counter Style
function updateCounterStyle(count) {
  counterEl.classList.remove('red', 'yellow', 'green');
  if (count === 1) counterEl.classList.add('red');
  else if (count === 2) counterEl.classList.add('yellow');
  else if (count > 2) counterEl.classList.add('green');
}

// Dialog System
function showDialog(title, text, btn1Text, btn1Action, btn2Text = '', btn2Action = null) {
  dialogTitle.textContent = title;
  dialogText.innerHTML = text;
  dialogBtn1.textContent = btn1Text;
  dialogBtn1.onclick = () => {
    hideDialog();
    if (btn1Action) btn1Action();
  };
  
  if (btn2Text) {
    dialogBtn2.textContent = btn2Text;
    dialogBtn2.style.display = 'block';
    dialogBtn2.onclick = () => {
      hideDialog();
      if (btn2Action) btn2Action();
    };
  } else {
    dialogBtn2.style.display = 'none';
  }
  
  dialogEl.classList.add('show');
}

function hideDialog() {
  dialogEl.classList.remove('show');
}

function showIntroduction() {
  showDialog(
    '🎯 Welcome to Sudoku Madness!',
    'Fill the grid with numbers 1-9. Every correct answer gets you closer to a  <span class="shuffle-text">SHUFFLE</span>  that reorganizes the puzzle!',
    'Start Playing!',
    newGame
  );
}

// Mute Toggle
function toggleMute() {
  isMuted = !isMuted;
  muteBtn.textContent = isMuted ? 'MUTED' : 'SOUND';
  muteBtn.classList.toggle('muted', isMuted);
}

// Cell Click
function onCellClick(e) {
  const cell = e.target;
  if (!cell.classList.contains('cell')) return;
  clearHighlights();

  if (cell.textContent) {
    document.querySelectorAll('.cell').forEach(c => {
      if (c.textContent === cell.textContent) c.classList.add('highlight');
    });
    activeCell = null;
  } else {
    if (activeCell) activeCell.classList.remove('active');
    activeCell = cell;
    cell.classList.add('active');
  }
}

// Numpad Click
function onNumpadClick(e) {
  const btn = e.target;
  if (!btn.classList.contains('num-btn') || !activeCell) return;
  const v = btn.dataset.value;
  handleInput(+v);
}

// Key Input
function onKeyDown(e) {
  if (!activeCell) return;
  if (e.key === 'Backspace' || e.key === 'Delete') {
    board[activeCell.dataset.r][activeCell.dataset.c] = 0;
    activeCell.textContent = '';
    activeCell.classList.remove('active');
    activeCell = null;
    return;
  }
  if (/^[1-9]$/.test(e.key)) handleInput(+e.key);
}

// Handle Input
function handleInput(val) {
  const r = +activeCell.dataset.r;
  const c = +activeCell.dataset.c;
  activeCell.classList.remove('incorrect');
  if (val === solution[r][c]) {
    board[r][c] = val;
    activeCell.textContent = val;
    activeCell.classList.remove('active');
    activeCell.classList.add('correct');
    playTone(440, 120);
    activeCell = null;
    handleCorrect();
  } else {
    playTone(220, 200);
    activeCell.classList.add('incorrect');
    setTimeout(() => activeCell && activeCell.classList.remove('incorrect'), 300);
  }
}

// Handle Correct & Shuffle
function handleCorrect() {
  shuffleCounter--;
  if (shuffleCounter <= 0) {
    counterEl.textContent = 0;
    updateCounterStyle(0);
    playTone(600, 300);
    doShuffle();
    shuffleCounter = rand(2, 5);
    counterEl.textContent = shuffleCounter;
    updateCounterStyle(shuffleCounter);
  } else {
    counterEl.textContent = shuffleCounter;
    updateCounterStyle(shuffleCounter);
  }
  checkWin();
}

// Shuffle by empty count with enhanced effects
function doShuffle() {
  const cells = document.querySelectorAll('.cell');
  const emptyCount = Array.from(cells).filter(c => !c.textContent).length;
  
  // Add board-wide shake effect only
  boardEl.classList.add('shuffle-effect');
  setTimeout(() => boardEl.classList.remove('shuffle-effect'), 800);
  
  const MAX_ATTEMPTS = 100;
  let newPuzzle, attempts = 0;

  do {
    newPuzzle = makePuzzle(JSON.parse(JSON.stringify(solution)), emptyCount);
    attempts++;
  } while (attempts < MAX_ATTEMPTS && !hasUniqueSolution(newPuzzle));

  if (attempts >= MAX_ATTEMPTS && emptyCount >= 10) {
    console.warn('Failed to regenerate solvable shuffle; starting fresh.');
    setTimeout(newGame, 800);
    return;
  }
  if (attempts >= MAX_ATTEMPTS) {
    console.warn('Failed to regenerate solvable shuffle; keeping current board.');
    return;
  }

  board = newPuzzle;
  setTimeout(() => renderBoard(), 800);
}

// Win Check
function checkWin() {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c] !== solution[r][c]) return;
  
  clearInterval(timerInterval);
  
  // Add win effect to board
  boardEl.classList.add('win-effect');
  
  setTimeout(() => {
    showDialog(
      '🎉 SUDOKU MASTER!',
      `Congratulations! You've conquered the madness in just ${timerEl.textContent.slice(6)}! Ready for another challenge?`,
      'New Game',
      () => {
        boardEl.classList.remove('win-effect');
        newGame();
      },
      'Celebrate',
      () => {
        playTone(440, 200);
        setTimeout(() => playTone(554, 200), 200);
        setTimeout(() => playTone(659, 300), 400);
      }
    );
  }, 100);
}

// Puzzle Generator & Helpers
function generateFullSolution() {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  function shuffleArr(arr) { return arr.sort(() => Math.random() - 0.5); }
  function backtrack(idx = 0) {
    if (idx === 81) return true;
    const r = Math.floor(idx / 9), c = idx % 9;
    if (grid[r][c]) return backtrack(idx + 1);
    for (const n of shuffleArr([1,2,3,4,5,6,7,8,9])) {
      if (isValid(grid, r, c, n)) {
        grid[r][c] = n;
        if (backtrack(idx + 1)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }
  backtrack();
  return { full: grid };
}

function isValid(g, row, col, num) {
  for (let i = 0; i < 9; i++)
    if (g[row][i] === num || g[i][col] === num) return false;
  const br = 3 * Math.floor(row / 3), bc = 3 * Math.floor(col / 3);
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      if (g[br+dr][bc+dc] === num) return false;
  return true;
}

function makePuzzle(sol, holes = 40) {
  const positions = Array.from({ length: 81 }, (_, i) => i);
  for (let i = 0; i < holes && positions.length; i++) {
    const idx = positions.splice(rand(0, positions.length-1),1)[0];
    sol[Math.floor(idx/9)][idx%9] = 0;
  }
  return sol;
}

function hasUniqueSolution(puz) {
  let count = 0;
  function solve(idx = 0, grid) {
    if (count > 1) return;
    if (idx === 81) { count++; return; }
    const r = Math.floor(idx/9), c = idx%9;
    if (grid[r][c]) { solve(idx+1,grid); return; }
    for (let n=1; n<=9; n++) {
      if (isValid(grid,r,c,n)) {
        grid[r][c] = n;
        solve(idx+1,grid);
        grid[r][c] = 0;
      }
    }
  }
  const copy = puz.map(r => r.slice());
  solve(0, copy);
  return count===1;
}

function rand(min,max){
  return Math.floor(Math.random()* (max-min+1)) + min;
}