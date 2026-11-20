import assert from 'node:assert/strict';
import { createPitchFrame } from '../src/studio/pitch3d/playerMovement.ts';

const team = (id, color) => ({id, name: id, abbreviation: id, color, players: Array.from({length: 11}, (_, i) => ({id: `${id}${i}`, name: `${id} ${i}`, shirtNumber: i+1, position: i===0?'GK':i<5?'DEF':i<9?'MID':'FWD'}))});
const homeTeam = team('home', '#2563eb'), awayTeam = team('away', '#ef4444');
const event = (id, elapsedSeconds, playerId, teamId, x, y, details) => ({id, sequence: elapsedSeconds, elapsedSeconds, playerId, teamId, x, y, ...details});
const events = [
  event('pass', 10, 'home5', 'home', 32, 60, {type:'pass', receiverId:'home6', endX:57, endY:40, completed:true}),
  event('pressure', 14, 'away2', 'away', 55, 40, {type:'pressure', intensity:2}),
  event('shot', 20, 'home9', 'home', 85, 50, {type:'shot', outcome:'goal'}),
  event('future', 30, 'away6', 'away', 1, 99, {type:'tackle', wonBall:true})
];
const match = {metadata:{id:'fixture', title:'Test', synthetic:true, durationSeconds:90, homeTeam, awayTeam}, events};
const player = (frame,id) => frame.players.find(p=>p.id===id);
const original = JSON.stringify(match);
assert.equal(createPitchFrame(match,0).players.length,22);
assert.equal(createPitchFrame(match,0).ball,null);
assert.equal(createPitchFrame(match,0).latestEvent,null);
const atPass=createPitchFrame(match,10);
assert.equal(player(atPass,'home5').x,32);
assert.equal(player(atPass,'home5').y,60);
assert.equal(player(atPass,'home5').action,'pass');
assert.deepEqual(atPass.ball,{x:32,y:60,height:0.22});
assert.equal(player(createPitchFrame(match,11.5),'home6').event,null);
assert.equal(createPitchFrame(match,11.5).ball.x,57);
assert.equal(createPitchFrame(match,14).ball.x,57,'pressure does not invent a ball transfer');
assert.equal(player(createPitchFrame(match,14),'away2').action,'pressure');
assert.equal(player(createPitchFrame(match,20),'home9').action,'shot');
assert.notDeepEqual(createPitchFrame(match,1).players,createPitchFrame(match,2).players,'players move between observed events');
const mid=createPitchFrame(match,19.5);
assert.deepEqual(mid,createPitchFrame({...match,events:events.slice(0,2)},19.5),'future events must not influence visualization');
assert.deepEqual(mid,createPitchFrame(match,19.5),'seek/restart must reproduce the same frame');
for (const clock of [0,14,15,16,29,30,90]) {
  const f=createPitchFrame(match,clock);
  assert.equal(f.players.length,22);
  assert.ok(f.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100&&(!p.event||p.event.elapsedSeconds<=clock)));
}
assert.equal(JSON.stringify(match),original,'visualization must not modify authoritative data');
console.log('3D replay: deterministic positions, action states, causal evidence, ball and seek bounds verified.');
