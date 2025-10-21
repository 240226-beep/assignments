/* ------------ Core State ------------ */
let flame = 100;
let baseDecrease = 1;
let decreaseRate = 1;
let clickPower = 3;
let flamePoints = 0;
let eraScore = 0;
let totalClicks = 0;

let era = 1;
const thresholds = [500, 1000, 2000, 3000, 5000];

// Shop / upgrades
const MAX_BUYS_PER_TYPE = 5;
let purchasedTypes = {};

let clickBonusMultiplier = 0;
let bonusFlatPerClick = 0;
let minDecayFloor = null;
let shieldAvailable = false;
let workShiftEnabled = false;
let workShiftBonus = 0;
let activeIntervals = [];

/* ------------ DOM ------------ */
const fireButton = document.getElementById("fireButton");
const flameLevel = document.getElementById("flameLevel");
const flameText = document.getElementById("flameText");
const message = document.getElementById("message");

const flamePointsDisplay = document.getElementById("flamePoints");
const clicksCount = document.getElementById("clicksCount");

const eraProgress = document.getElementById("eraProgress");
const eraGoalText = document.getElementById("eraGoalText");
const eraText = document.querySelector(".era");

const shopList = document.getElementById("shopList");
const shopTheme = document.getElementById("shopTheme");

const clickSound = document.getElementById("clickSound");
const upgradeSound = document.getElementById("upgradeSound");
const newEraSound = document.getElementById("newEraSound");

/* ------------ Assets ------------ */
const backgrounds = ["1.png", "2.png", "3.png", "4.png", "5.png", "6.png"];
const eraNames = ["Prehistoric", "Ancient", "Medieval", "Industrial", "Modern", "Future"];
const eraThemes = [
  "Theme: First steps, struggle for warmth.",
  "Theme: Sacred fire and tradition.",
  "Theme: Fire of knowledge, craft, and progress.",
  "Theme: Fire as energy, productive force.",
  "Theme: Technological and electrical fire.",
  "Theme: Fire as a symbol of the Universe's energy."
];

/* ------------ Helpers ------------ */
function setMessage(t, ms = 2200) {
  message.textContent = t;
  if (ms > 0) setTimeout(() => { if (message.textContent === t) message.textContent = ""; }, ms);
}
function spawnFloatingText(x, y, text = "+1🔥") {
  const el = document.createElement("div");
  el.className = "float-text";
  el.textContent = text;
  el.style.left = (x - 10) + "px";
  el.style.top = (y - 20) + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}
function clampFlame() {
  if (flame > 100) flame = 100;
  if (flame < 0) {
    if (shieldAvailable) {
      shieldAvailable = false;
      flame = 12;
      setMessage("🛡️ Fire Guardian saved the flame!");
    } else flame = 0;
  }
}
function updateFlameUI() {
  clampFlame();
  flameLevel.style.width = flame + "%";
  flameText.textContent = `Flame: ${Math.floor(flame)}%`;
}
function updatePointsUI() {
  flamePointsDisplay.textContent = flamePoints;
  clicksCount.textContent = totalClicks;
}
function updateProgressUI() {
  if (era <= thresholds.length) {
    const p = Math.min(eraScore / thresholds[era - 1] * 100, 100);
    eraProgress.style.width = p + "%";
    eraGoalText.textContent = `Next Era Progress: ${Math.floor(p)}%`;
  } else {
    eraProgress.style.width = "100%";
    eraGoalText.textContent = "Civilization Complete!";
  }
}
function clearIntervals() {
  activeIntervals.forEach(id => clearInterval(id));
  activeIntervals = [];
}

/* ------------ Era Base & Decay ------------ */
let decayLoop = null;
function setEraBase() {
  clickPower = 3;
  baseDecrease = 1 + 0.8 * (era - 1); // 🔥 faster decay scaling per era
  decreaseRate = baseDecrease;
  shieldAvailable = false;
}
function startDecay() {
  if (decayLoop) clearInterval(decayLoop);
  decayLoop = setInterval(() => {
    const effDecay = Math.max(minDecayFloor ?? 0, decreaseRate);
    flame -= effDecay;
    updateFlameUI();
    if (flame <= 0) gameOver();
  }, 1000);
}

/* ------------ Upgrades Data ------------ */
const eraUpgrades = {
  1: { icon:["🪶","🪨","🔥","🧍‍♂️"], title:["Dry Branches","Stone Circle","Flint & Tinder","Guardian Tribe"],
    desc:[
      "Increase click power (+1 per buy, up to +5).",
      "Reduce extinguishing speed (-0.10 per buy).",
      "Every 5s: chance to add +1 point & +2 flame (+10% per buy).",
      "Auto-click every 5s (+1 point & +clickPower per buy)."
    ],
    cost:[100,120,140,160],
    apply:[
      (n)=>{ clickPower += 1; },
      (n)=>{ decreaseRate = Math.max(0.2, decreaseRate - 0.10); },
      (n)=>{
        const id=setInterval(()=>{
          const chance=Math.min(0.1*n,0.5);
          if(Math.random()<chance){
            flame=Math.min(100,flame+2);
            flamePoints++; eraScore++;
            updateFlameUI(); updatePointsUI(); updateProgressUI();
          }
        },5000); activeIntervals.push(id);
      },
      (n)=>{
        const id=setInterval(()=>{
          flame=Math.min(100,flame+clickPower);
          flamePoints+=n; eraScore+=n;
          updateFlameUI(); updatePointsUI(); updateProgressUI();
        },5000); activeIntervals.push(id);
      }
    ]},
  2:{ icon:["🏺","⚱️","🕊️","⚡"], title:["Torch Oil","Marble Hearth","Priest of Vesta","Torch of Olympus"],
    desc:[
      "Flames last longer (−0.08 decay per buy).",
      "Further reduce heat loss (−0.10 per buy).",
      "Passive auto-click every 7s (+1 point per buy).",
      "Brighter flame: +2 click power per buy."
    ],
    cost:[200,240,260,300],
    apply:[
      (n)=>{ decreaseRate=Math.max(0.2,decreaseRate-0.08); },
      (n)=>{ decreaseRate=Math.max(0.2,decreaseRate-0.10); },
      (n)=>{
        const id=setInterval(()=>{
          flame=Math.min(100,flame+2);
          flamePoints+=n; eraScore+=n;
          updateFlameUI(); updatePointsUI(); updateProgressUI();
        },7000); activeIntervals.push(id);
      },
      (n)=>{ clickPower+=2; }
    ]},
  3:{ icon:["🔩","📜","🕯️","🏰"], title:["Forge","Alchemist","Candle of Enlightenment","Fire Guardian"],
    desc:[
      "Clicks generate more heat (+2 per buy).",
      "Bonus points per click (+0.1 per buy).",
      "Restore flame every 2s (+1 per buy).",
      "One-time save from extinction (once per era)."
    ],
    cost:[320,360,380,420],
    apply:[
      (n)=>{ clickPower+=2; },
      (n)=>{ clickBonusMultiplier+=0.1; },
      (n)=>{ const id=setInterval(()=>{ flame=Math.min(100,flame+n); updateFlameUI(); },2000); activeIntervals.push(id); },
      (n)=>{ shieldAvailable=true; }
    ]},
  4:{ icon:["⚙️","🔧","🧱","🧍‍♀️"], title:["Steam Blower","Metal Firebox","Factory Boiler","Work Shifts"],
    desc:[
      "Passive flame +2 every 1.5s (stacks by buys).",
      "Reduce decay (−0.12 per buy).",
      "Auto-replenish +3 flame every 3s (stacks by buys).",
      "Every 20 clicks: +1 click power (up to +3 + buys)."
    ],
    cost:[480,520,560,600],
    apply:[
      (n)=>{ const id=setInterval(()=>{ flame=Math.min(100,flame+2*n); updateFlameUI(); },1500); activeIntervals.push(id); },
      (n)=>{ decreaseRate=Math.max(0.2,decreaseRate-0.12); },
      (n)=>{ const id=setInterval(()=>{ flame=Math.min(100,flame+3*n); updateFlameUI(); },3000); activeIntervals.push(id); },
      (n)=>{ workShiftEnabled=true; }
    ]},
  5:{ icon:["🔋","🌞","🖥️","🌃"], title:["Electric Heating","Solar Panel","Smart Control System","Neon Pulse"],
    desc:[
      "Auto-maintain: reduce decay (−0.15 per buy).",
      "If flame ≥70 for 10s: +5 points per buy.",
      "Stabilize flame (min decay floor 0.2).",
      "Visual pulse."
    ],
    cost:[700,740,760,800],
    apply:[
      (n)=>{ decreaseRate=Math.max(0.2,decreaseRate-0.15); },
      (n)=>{ const id=setInterval(()=>{
        if(flame>=70){
          const bonus=5*n; flamePoints+=bonus; eraScore+=bonus;
          updatePointsUI(); updateProgressUI();
          setMessage(`☀️ Solar bonus +${bonus}!`,1200);
        }
      },10000); activeIntervals.push(id); },
      (n)=>{ minDecayFloor=0.2; },
      (n)=>{ document.body.classList.add("neon"); }
    ]},
  6:{ icon:["💫","🧬","☀️","⚛️"], title:["Plasma Core","Mind Fire","Star Synthesizer","Quantum Flame"],
    desc:[
      "No decay (for era).",
      "+1 flat point per click (per buy).",
      "Every 15s: +10 points per buy & +5 flame.",
      "Eternal glow."
    ],
    cost:[900,950,1100,1500],
    apply:[
      (n)=>{ decreaseRate=0; },
      (n)=>{ bonusFlatPerClick+=1; },
      (n)=>{ const id=setInterval(()=>{
        const bonus=10*n;
        flame=Math.min(100,flame+5);
        flamePoints+=bonus; eraScore+=bonus;
        updateFlameUI(); updatePointsUI(); updateProgressUI();
        setMessage(`🌟 Star Synth +${bonus}!`,1200);
      },15000); activeIntervals.push(id); },
      (n)=>{ document.body.classList.add("neon"); }
    ]}
};

/* ------------ Shop Rendering & Buying ------------ */
function renderShop(){
  shopList.innerHTML = "";
  purchasedTypes = {};
  shopTheme.textContent = eraThemes[era-1];
  const data = eraUpgrades[era];
  data.title.forEach((t,i)=>{
    const wrap=document.createElement("div");
    wrap.className="upgrade";
    const icon=document.createElement("div");
    icon.className="upg-icon"; icon.textContent=data.icon[i];
    const body=document.createElement("div");
    body.className="upg-body";
    const title=document.createElement("h4");
    title.className="upg-title"; title.textContent=t;
    const desc=document.createElement("p");
    desc.className="upg-desc"; desc.textContent=data.desc[i];
    const bottom=document.createElement("div");
    bottom.className="upg-bottom";
    const meta=document.createElement("span");
    meta.className="upg-meta";
    meta.textContent=`Cost: ${data.cost[i]} 🔥 • Bought: 0/${MAX_BUYS_PER_TYPE}`;
    const btn=document.createElement("button");
    btn.className="upg-buy"; btn.textContent="Buy";
    btn.dataset.idx=i; btn.dataset.title=t;
    btn.addEventListener("click",()=>tryBuyUpgrade(i,t,meta,btn));
    bottom.append(meta,btn); body.append(title,desc,bottom);
    wrap.append(icon,body); shopList.appendChild(wrap);
  });
}

function tryBuyUpgrade(i,title,metaEl,btn){
  const data=eraUpgrades[era];
  const cost=data.cost[i];
  const current=purchasedTypes[title]||0;
  if(current>=MAX_BUYS_PER_TYPE){
    setMessage("You’ve mastered this upgrade for this era. Advance to the next era! 🔥");
    btn.disabled=true; return;
  }
  if(flamePoints<cost){ setMessage("Not enough points!"); return; }
  flamePoints-=cost; purchasedTypes[title]=current+1;
  updatePointsUI();
  const n=purchasedTypes[title];
  data.apply[i](n);
  upgradeSound.currentTime=0; upgradeSound.play();
  setMessage(`🔥 Purchased ${title} (${n}/${MAX_BUYS_PER_TYPE})`);
  metaEl.textContent=`Cost: ${cost} 🔥 • Bought: ${n}/${MAX_BUYS_PER_TYPE}`;
  if(n>=MAX_BUYS_PER_TYPE){ btn.disabled=true; setMessage("You’ve mastered this upgrade for this era. Advance to the next era! 🔥"); }
}

/* ------------ Clicking Fire ------------ */
fireButton.addEventListener("click",(e)=>{
  let gain=1+bonusFlatPerClick;
  gain=Math.floor(gain*(1+clickBonusMultiplier));
  flame=Math.min(100,flame+clickPower);
  flamePoints+=gain; eraScore+=gain; totalClicks++;
  if(workShiftEnabled && totalClicks%20===0){
    const buys=purchasedTypes["Work Shifts"]||0;
    const cap=3+buys;
    if(workShiftBonus<cap){
      workShiftBonus++; clickPower++;
      setMessage(`🛠️ Work shift efficiency +1 (now +${workShiftBonus})`,1500);
    }
  }
  updateFlameUI(); updatePointsUI(); updateProgressUI();
  clickSound.currentTime=0; clickSound.play();
  spawnFloatingText(e.clientX,e.clientY,`+${gain}🔥`);
  if(era<=thresholds.length && eraScore>=thresholds[era-1]) goNextEra();
});

/* ------------ Era Transition ------------ */
function resetEraModifiers(){
  clickBonusMultiplier=0; bonusFlatPerClick=0; minDecayFloor=null;
  shieldAvailable=false; workShiftEnabled=false; workShiftBonus=0;
  document.body.classList.remove("neon");
}
function goNextEra(){
  if(era>=6){ setMessage("🏆 Final Era reached!",3000); return; }
  era++; clearIntervals(); resetEraModifiers(); purchasedTypes={}; eraScore=0;
  document.body.style.background=`url(${backgrounds[era-1]}) center center / cover no-repeat fixed`;
  eraText.textContent=`Era: ${eraNames[era-1]}`;
  setEraBase(); startDecay();
  newEraSound.currentTime=0; newEraSound.play();
  setMessage(`✨ A new era begins: ${eraNames[era-1]}! ✨`,2500);
  renderShop(); updateProgressUI();
}

/* ------------ Game Over ------------ */
function gameOver(){
  if(decayLoop) clearInterval(decayLoop);
  clearIntervals();
  fireButton.disabled=true;
  fireButton.style.opacity=0.6;
  setMessage("💀 The fire is out. Civilization has fallen.",5000);
}

/* ------------ Init ------------ */
function init(){
  eraText.textContent=`Era: ${eraNames[era-1]}`;
  document.body.style.background=`url(${backgrounds[era-1]}) center center / cover no-repeat fixed`;
  setEraBase(); renderShop(); updateFlameUI(); updatePointsUI(); updateProgressUI(); startDecay();
}
init();
