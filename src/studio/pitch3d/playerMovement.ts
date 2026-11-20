import type { MatchEvent, SyntheticMatch } from "../../types/match";

export interface PlayerPose {
  id: string;
  x: number;
  y: number;
  facing: number;
  stride: number;
  action: MatchEvent["type"] | "run" | "idle";
  actionProgress: number;
  event: MatchEvent | null;
}
export interface PitchFrame {
  time: number;
  players: PlayerPose[];
  ball: { x: number; y: number; height: number } | null;
  latestEvent: MatchEvent | null;
}
const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const lines = { GK: 6, DEF: 24, MID: 44, FWD: 70 };

/** Pure, causal presentation layer: no tracking claims and no engine mutations. */
export function createPitchFrame(match: SyntheticMatch, clock: number): PitchFrame {
  const time = clamp(Number.isFinite(clock) ? clock : 0, 0, match.metadata.durationSeconds);
  const observed = match.events.filter(e => e.elapsedSeconds <= time).sort((a,b) => a.elapsedSeconds-b.elapsedSeconds || a.sequence-b.sequence);
  const latestEvent = observed.at(-1) ?? null;
  const actors = new Map<string, MatchEvent>();
  const anchors = new Map<string, {x:number; y:number; time:number}>();
  let ballEvent: MatchEvent | null = null;
  for (const e of observed) {
    actors.set(e.playerId,e);
    anchors.set(e.playerId,{x:e.x,y:e.y,time:e.elapsedSeconds});
    if(e.type === "pass" && e.completed) anchors.set(e.receiverId,{x:e.endX,y:e.endY,time:e.elapsedSeconds});
    if(e.type === "pass" || e.type === "shot" || e.type === "possession_change" || (e.type === "tackle" && e.wonBall)) ballEvent=e;
  }
  const players: PlayerPose[] = [match.metadata.homeTeam, match.metadata.awayTeam].flatMap((team,side) => team.players.map((p,i) => {
    const line=team.players.filter(other => other.position===p.position);
    const rank=line.findIndex(other=>other.id===p.id);
    const phase=time*0.8+i*1.7+side*0.9;
    const formationX=side===0?lines[p.position]:100-lines[p.position];
    const formationY=100*(rank+1)/(line.length+1);
    const drift=latestEvent ? (latestEvent.x-50)*0.14 : 0;
    const scale=p.position==="GK"?0.22:1;
    const baseX=clamp(formationX+scale*(drift+2.6*Math.sin(phase)),3,97);
    const baseY=clamp(formationY+scale*2.2*Math.cos(phase*0.8),3,97);
    const anchor=anchors.get(p.id);
    const weight=anchor?clamp(1-Math.max(0,time-anchor.time-1.2)/7,0,1):0;
    const x=anchor?mix(baseX,anchor.x,weight):baseX;
    const y=anchor?mix(baseY,anchor.y,weight):baseY;
    const event=actors.get(p.id)??null;
    const age=event?time-event.elapsedSeconds:Infinity;
    const recent=event!==null&&age<1.2;
    const action: PlayerPose["action"]=recent?event.type: p.position==="GK"&&weight===0?"idle":"run";
    const dx=recent&&event.type==="pass"?event.endX-event.x:(side===0?1:-1);
    const dy=recent&&event.type==="pass"?event.endY-event.y:Math.cos(phase)*0.3;
    return {id:p.id,x:clamp(x),y:clamp(y),facing:Math.atan2(dx,dy),stride:time*5+i*0.73,action,actionProgress:recent?clamp(age/1.2,0,1):0,event};
  }));
  let ball: PitchFrame["ball"]=null;
  if(ballEvent){
    const age=time-ballEvent.elapsedSeconds;
    const t=clamp(age/1.2,0,1);
    const home=ballEvent.teamId===match.metadata.homeTeam.id;
    let x=ballEvent.x,y=ballEvent.y,height=0.22;
    if(ballEvent.type==="pass") { x=mix(x,ballEvent.endX,t); y=mix(y,ballEvent.endY,t); height+=0.5*Math.sin(Math.PI*t); }
    else if(ballEvent.type==="shot") { const targetX=ballEvent.outcome==="goal"?(home?100:0):mix(x,home?100:0,0.55); x=mix(x,targetX,t); y=mix(y,ballEvent.outcome==="off_target"?70:50,t); height+=2*Math.sin(Math.PI*t); }
    ball={x:clamp(x),y:clamp(y),height};
  }
  return {time,players,ball,latestEvent};
}
