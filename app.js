const $=s=>document.querySelector(s);
const rpmEl=$("#rpm"), speedEl=$("#speed"), gearEl=$("#gear"), needle=$("#needle");
const throttle=$("#throttle"), throttleValue=$("#throttleValue"), startBtn=$("#start");
const startText=$("#startText"), status=$("#status"), statusText=$("#statusText");
const shiftHint=$("#shiftHint"), modeLabel=$("#modeLabel");
const engineTemp=$("#engineTemp"), oilTemp=$("#oilTemp"), oilPressure=$("#oilPressure"), power=$("#power");
let running=false, rpm=0, targetRpm=900, gear=0, mode="comfort", muted=false, audio=null, last=performance.now();

const maxRpm=10000, redline=9500, ratios=[0,3.0,2.1,1.55,1.18,.92,.72,.58];

for(let i=0;i<=20;i++){
  const t=document.createElement("div"); t.className="tick"+(i%2===0?" major":"")+(i>=17?" red":"");
  t.style.transform=`translate(-50%,-50%) rotate(${-132+i*(264/20)}deg)`;
  $("#ticks").appendChild(t);
}
function modeFactor(){return mode==="comfort"?.75:mode==="sport"?1:1.25}
function updateAudio(){
  if(!audio||muted)return;
  const f=0.65+(rpm/maxRpm)*1.05;
  audio.osc.frequency.setTargetAtTime(65*f,audio.ctx.currentTime,.025);
  audio.gain.gain.setTargetAtTime(running?(0.015+throttle.value/100*.065):0,audio.ctx.currentTime,.04);
}
function initAudio(){
  if(audio)return;
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  const osc=ctx.createOscillator(), gain=ctx.createGain(), filter=ctx.createBiquadFilter();
  osc.type="sawtooth"; osc.frequency.value=65; gain.gain.value=0;
  filter.type="lowpass"; filter.frequency.value=1900; filter.Q.value=1.2;
  osc.connect(filter).connect(gain).connect(ctx.destination); osc.start();
  audio={ctx,osc,gain};
}
function setRunning(v){
  running=v;
  if(v){initAudio();audio.ctx.resume();targetRpm=900;document.body.classList.add("running");startBtn.classList.add("running");startText.textContent="STOP ENGINE";status.classList.add("running");statusText.textContent="RUNNING";}
  else{targetRpm=0;startBtn.classList.remove("running");startText.textContent="START ENGINE";status.classList.remove("running");statusText.textContent="STANDBY";throttle.value=0;throttleValue.textContent="0%";}
}
startBtn.onclick=()=>setRunning(!running);
throttle.oninput=()=>{throttleValue.textContent=throttle.value+"%";if(running)targetRpm=Math.min(redline,900+Number(throttle.value)*modeFactor()*78)}
document.querySelectorAll(".mode").forEach(b=>b.onclick=()=>{
 document.querySelectorAll(".mode").forEach(x=>x.classList.remove("active"));b.classList.add("active");
 mode=b.dataset.mode;modeLabel.textContent=b.textContent;
});
function shift(dir){
 if(!running)return;
 if(dir>0 && gear<7){gear++;targetRpm=Math.max(1700,rpm*.64);shiftHint.textContent="UPSHIFT";}
 if(dir<0 && gear>1){gear--;targetRpm=Math.min(redline,rpm*1.45+700);shiftHint.textContent="DOWNSHIFT";}
 setTimeout(()=>shiftHint.textContent="READY",450);
}
$("#upshift").onclick=()=>shift(1); $("#downshift").onclick=()=>shift(-1);
$("#mute").onclick=()=>{muted=!muted;$("#mute").textContent=muted?"SOUND OFF":"SOUND ON";updateAudio()};

function loop(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;
 if(running){
   const throttleR=Number(throttle.value)/100;
   const idle=900;
   if(throttleR>0) targetRpm=Math.min(redline,idle+throttleR*modeFactor()*78);
   else targetRpm=Math.max(idle,rpm-3600*dt);
   if(rpm<targetRpm) rpm+=Math.min((targetRpm-rpm)*(3.5*modeFactor())*dt,250*dt);
   else rpm-=Math.min((rpm-targetRpm)*5*dt,250*dt);
   if(rpm>=redline){rpm=redline;targetRpm=redline;shiftHint.textContent="LIMITER";}
 }else rpm=Math.max(0,rpm-5000*dt);
 const angle=-132+(rpm/maxRpm)*264;
 needle.style.transform=`translate(-50%,-100%) rotate(${angle}deg)`;
 rpmEl.textContent=Math.round(rpm).toString().padStart(4,"0");
 const spd=Math.round(rpm/(redline)*240*Math.max(.25,ratios[Math.max(gear,1)]/3));
 speedEl.textContent=Math.min(240,spd).toString().padStart(3,"0");
 gearEl.textContent=gear===0?"N":gear;
 engineTemp.textContent=(running?(78+rpm/90):"--")+" °C";
 oilTemp.textContent=(running?(74+rpm/105):"--")+" °C";
 oilPressure.textContent=(running?(1.2+rpm/4200).toFixed(1):"--")+" bar";
 power.textContent=(running?Math.round(90+rpm/10000*680*Number(throttle.value)/100):"--")+" HP";
 updateAudio();last=now;requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

document.addEventListener("keydown",e=>{
 if(e.code==="Space"){e.preventDefault();setRunning(!running)}
 if(e.key==="ArrowRight")shift(1); if(e.key==="ArrowLeft")shift(-1);
});
