import { useEffect, useMemo, useRef, useState } from "react";
import type { ReplayState } from "../../engine/replay";
import type { SyntheticMatch } from "../../types/match";
import { describeEvent, describeEventDetail, describeZone, formatClock, POSITION_NAMES, type RosterEntry } from "../format";
import { createPitchFrame } from "./playerMovement";
import type { SceneRenderer } from "./renderer.js";
import "./pitch3d.css";

export function MatchScene({match,roster,replay,isAnalyst,onOpenPlayer,onFailure}:{
  match:SyntheticMatch; roster:Map<string,RosterEntry>; replay:ReplayState; isAnalyst:boolean;
  onOpenPlayer:(id:string)=>void; onFailure:()=>void;
}) {
  const host=useRef<HTMLDivElement>(null);
  const renderer=useRef<SceneRenderer|null>(null);
  const clock=useRef(0);
  const failure=useRef(onFailure);
  const [ready,setReady]=useState(false);
  const [hover,setHover]=useState<string|null>(null);
  const [pinned,setPinned]=useState<string|null>(null);
  const [view,setView]=useState<"broadcast"|"overhead">("broadcast");
  const [zoom,setZoom]=useState(1);
  const time=replay.elapsedSeconds+replay.carryMilliseconds/1000;
  const frame=useMemo(()=>createPitchFrame(match,time),[match,time]);
  const selected=pinned??hover;
  const playerIds=useMemo(()=>[...roster.keys()],[roster]);
  const who=selected?roster.get(selected):undefined;
  const event=frame.players.find(p=>p.id===selected)?.event;
  useEffect(()=>{failure.current=onFailure;},[onFailure]);
  useEffect(()=>{
    let cancelled=false;
    const element=host.current;
    if(!element)return;
    import("./renderer.js").then(({createRenderer})=>{
      if(cancelled)return;
      renderer.current=createRenderer(element,roster,setHover,id=>setPinned(current=>current===id?null:id),()=>failure.current());
      setReady(true);
    }).catch(()=>{if(!cancelled)failure.current();});
    return ()=>{cancelled=true;renderer.current?.dispose();renderer.current=null;};
  },[roster]);
  useEffect(()=>{
    if(!ready||!renderer.current)return;
    renderer.current.setView(view,zoom);
  },[ready,view,zoom]);
  useEffect(()=>{
    const scene=renderer.current;
    if(!ready||!scene)return;
    const start=clock.current;
    const end=time;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(replay.status!=="playing"||end<=start||end-start>3||reduced){
      clock.current=end;scene.render(frame,selected);return;
    }
    const began=performance.now();
    let request=0;
    function tick(now:number){
      const ratio=Math.min(1,(now-began)/85);
      const t=start+(end-start)*ratio;
      clock.current=t;
      scene?.render(ratio===1?frame:createPitchFrame(match,t),selected);
      if(ratio<1)request=requestAnimationFrame(tick);
    }
    request=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(request);
  },[ready,time,replay.status,frame,match,selected]);
  return <div className="pitch3d">
    <div className="pitch3d-stage" role="group" tabIndex={0} aria-label="Match pitch. Hover or tap a player, or use left and right arrows to inspect players. Escape closes details."
      onKeyDown={e=>{
        if(e.target!==e.currentTarget)return;
        if(e.key==="Escape"){e.stopPropagation();setPinned(null);setHover(null);return;}
        if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;
        e.preventDefault();e.stopPropagation();
        if(!playerIds.length)return;
        const step=e.key==="ArrowRight"?1:-1;
        const index=selected?playerIds.indexOf(selected):-1;
        setHover(null);
        setPinned(playerIds[index<0?(step===1?0:playerIds.length-1):(index+step+playerIds.length)%playerIds.length]);
      }}>
      <div ref={host} className="pitch3d-canvas" aria-hidden="true"/>
      {!ready&&<div className="pitch3d-loading" role="status">Loading 3D replay…</div>}
    {who&&<div className={`pitch3d-details${pinned===selected ? " is-pinned" : ""}`} role={pinned===selected ? "group" : "tooltip"} aria-label="Player details">
      <div className="pitch3d-detail-head"><strong>#{who.player.shirtNumber} {who.player.name}</strong>
      {pinned===selected&&<button type="button" className="btn btn-secondary btn-sm" onClick={()=>{setPinned(null);setHover(null);}}>Close</button>}</div>
      <p>{who.team.name} · {POSITION_NAMES[who.player.position]}</p>
      {event?<dl>
        <div><dt>Last observed action</dt><dd>{describeEvent(event)} · {formatClock(event.elapsedSeconds)}</dd></div>
        <div><dt>Detail</dt><dd>{describeEventDetail(event,roster,[match.metadata.homeTeam,match.metadata.awayTeam])}</dd></div>
        <div><dt>Zone</dt><dd>{describeZone(event,match.metadata.homeTeam.id)}</dd></div>
        {isAnalyst&&<div><dt>Evidence</dt><dd><code>{event.id}</code> · x {Math.round(event.x)} · y {Math.round(event.y)}</dd></div>}
      </dl>:<p>No observed action for this player yet.</p>}
      {pinned===selected&&<button type="button" className="btn btn-primary btn-sm" onClick={()=>onOpenPlayer(who.player.id)}>View player profile</button>}
    </div>}
    </div>
    <p className="pitch3d-note">Illustrative movement between recorded events, not continuous tracking.</p>
    <div className="pitch3d-controls">
      <div className="pitch3d-cameras" role="group" aria-label="Camera angle">
        <button type="button" className="btn btn-secondary btn-sm" aria-pressed={view==="broadcast"} onClick={()=>setView("broadcast")}>Broadcast</button>
        <button type="button" className="btn btn-secondary btn-sm" aria-pressed={view==="overhead"} onClick={()=>setView("overhead")}>Overhead</button>
      </div>
      <label>Zoom <input type="range" min="1" max="1.6" step="0.1" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label>
    </div>

  </div>;
}
