// The stage and every sprite share the same 720 × 360 logical coordinate space.
export type ArenaPoint = {x:number; y:number}
export type ArenaFrame = {
  player:ArenaPoint
  enemies:readonly ArenaPoint[]
  coins:readonly ArenaPoint[]
  skin:string
  /** Visible gameplay time, in seconds. */
  time:number
  /** Facing direction in radians, with zero pointing right. */
  angle?:number
  /** Previous positions in chronological order. */
  trail?:readonly ArenaPoint[]
  invulnerable?:boolean
  diamond?:boolean
}

type Ctx = CanvasRenderingContext2D
const width = 720
const height = 360
let floorCache:HTMLCanvasElement | undefined

// Local sprite coordinates have their nose at the top.
function polygon(ctx:Ctx, points:number[], fill:string, edge?:string) {
  ctx.beginPath()
  ctx.moveTo(points[0],points[1])
  for(let i=2;i<points.length;i+=2) ctx.lineTo(points[i],points[i+1])
  ctx.closePath()
  ctx.fillStyle=fill
  ctx.fill()
  if(edge) {
    ctx.strokeStyle=edge
    ctx.stroke()
  }
}

function line(ctx:Ctx, coordinates:number[], color:string, weight:number) {
  ctx.beginPath()
  ctx.moveTo(coordinates[0],coordinates[1])
  for(let i=2;i<coordinates.length;i+=2) ctx.lineTo(coordinates[i],coordinates[i+1])
  ctx.lineWidth=weight
  ctx.strokeStyle=color
  ctx.stroke()
}

function circle(ctx:Ctx,x:number,y:number,r:number,color:string) {
  ctx.fillStyle=color
  ctx.beginPath()
  ctx.arc(x,y,r,0,Math.PI*2)
  ctx.fill()
}

/** Shared by the actual game and by each loadout preview. */
export function drawAvatar(ctx:Ctx,x:number,y:number,skin:string,scale=1,angle=0) {
  ctx.save()
  ctx.translate(x,y)
  ctx.scale(scale,scale)
  ctx.rotate(angle+Math.PI/2)
  ctx.lineWidth=.85
  ctx.lineJoin='round'

  if(skin==='ghost') {
    // The cloak ends in three independent wisps.
    ctx.shadowBlur=8
    ctx.shadowColor='#bf84ff'
    ctx.fillStyle='#b99af2'
    ctx.beginPath()
    ctx.moveTo(-9,0)
    ctx.quadraticCurveTo(-9,-12,0,-12)
    ctx.quadraticCurveTo(9,-12,9,-1)
    ctx.quadraticCurveTo(10,7,13,10)
    ctx.quadraticCurveTo(8,10,5,7)
    ctx.quadraticCurveTo(3,14,0,15)
    ctx.quadraticCurveTo(-3,12,-4,8)
    ctx.quadraticCurveTo(-7,10,-12,11)
    ctx.quadraticCurveTo(-9,7,-9,0)
    ctx.fill()
    ctx.shadowBlur=0
    polygon(ctx,[-6,-4,0,-7,6,-4,5,2,0,5,-5,2],'#382447')
    line(ctx,[-4,-2,-2,0],'#baffef',1.8)
    line(ctx,[4,-2,2,0],'#baffef',1.8)
    line(ctx,[-5,4,-4,7],'#e9d9ff',1.1)
  } else if(skin==='gold') {
    polygon(ctx,[-6,-5,-12,-3,-12,6,-6,10,6,10,12,6,12,-3,6,-5],'#9a551d','#ffe49a')
    polygon(ctx,[-6,-7,0,-12,6,-7,7,0,0,7,-7,0],'#ffd262','#ffefbb')
    polygon(ctx,[-5,-3,5,-3,3,0,1,0,1,4,-1,4,-1,0,-3,0],'#563022')
    polygon(ctx,[-1,-10,0,-16,3,-12,2,-7],'#ff9651')
    line(ctx,[-9,0,-9,5,-6,7],'#ffcf5e',1.6)
    line(ctx,[9,0,9,5,6,7],'#ffcf5e',1.6)
  } else if(skin==='ninja') {
    polygon(ctx,[-6,1,-11,4,-9,8,-3,9,4,9,10,6,8,1],'#22465c','#4a9cba')
    polygon(ctx,[-3,5,-10,13,-4,12,-5,17,2,9],'#f86fa8')
    polygon(ctx,[-7,-5,-3,-11,3,-11,8,-5,7,2,1,7,-5,4],'#1c243d','#94e8ff')
    polygon(ctx,[-7,-4,7,-4,5,0,-5,0],'#4ae3fa')
    line(ctx,[-3,-2,-1,-1],'#163142',1.25)
    line(ctx,[2,-1,4,-2],'#163142',1.25)
    line(ctx,[7,6,11,-8],'#a6e6ea',1.4)
  } else if(skin==='founder') {
    // Prismatic crown and violet, double-pointed mantle.
    polygon(ctx,[-4,-3,-13,2,-11,11,-5,8,-2,13,4,9,11,12,13,2,5,-3],'#7448b2','#d7a9ff')
    polygon(ctx,[-6,-7,0,-11,6,-7,6,0,0,6,-6,0],'#27253d','#ffcf76')
    polygon(ctx,[-7,-8,-9,-13,-4,-10,0,-15,4,-10,9,-13,7,-8],'#ffcc69','#ffe7af')
    line(ctx,[-4,-2,0,0,4,-2],'#8ffaff',1.6)
    polygon(ctx,[0,5,2.5,8,0,11,-2.5,8],'#fff1a4')
  } else {
    polygon(ctx,[-6,-4,-10,-2,-11,5,-7,9,0,10,7,9,11,5,10,-2,6,-4],'#246f77','#78ead5')
    polygon(ctx,[-6,-7,-2,-11,4,-10,7,-6,7,0,2,5,-4,3,-7,-1],'#83e8d0','#c6fff0')
    polygon(ctx,[-6,-5,6,-5,4,-1,-4,-1],'#193b4b')
    line(ctx,[-4,-4,1,-4],'#8ef9f0',1)
    line(ctx,[-7,4,-5,6],'#b9fff0',1.4)
    line(ctx,[7,4,5,6],'#b9fff0',1.4)
  }
  ctx.restore()
}

function drawFloor(ctx:Ctx) {
  const glow=ctx.createRadialGradient(350,176,12,350,176,436)
  glow.addColorStop(0,'#162537')
  glow.addColorStop(.64,'#101a2a')
  glow.addColorStop(1,'#0c1120')
  ctx.fillStyle=glow
  ctx.fillRect(0,0,width,height)

  // Inset octagonal panels are registration marks on the floor.
  for(const [x,y] of [[86,66],[634,66],[86,294],[634,294]]) {
    ctx.save()
    ctx.translate(x,y)
    ctx.lineWidth=1
    polygon(ctx,[-29,-19,-18,-30,18,-30,29,-19,29,19,18,30,-18,30,-29,19],
      '#141e31','#263146')
    line(ctx,[-23,-13,-23,-17,-14,-25,0,-25],'#374252',1.2)
    for(const offset of [-7,0,7]) line(ctx,[-11,offset+4,11,offset-4],'#263348',1.6)
    ctx.restore()
  }

  ctx.strokeStyle='#88b0e00e'
  ctx.lineWidth=1
  ctx.beginPath()
  for(let x=0;x<width;x+=24) {ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,height)}
  for(let y=0;y<height;y+=24) {ctx.moveTo(0,y+.5);ctx.lineTo(width,y+.5)}
  ctx.stroke()
  for(let y=36;y<height;y+=48) for(let x=24;x<width;x+=48) {
    ctx.fillStyle='#59798955'
    ctx.fillRect(x,y,1.5,1.5)
  }

  ctx.strokeStyle='#47768747'
  ctx.lineWidth=1
  for(const r of [39,45]) {
    ctx.beginPath()
    ctx.arc(360,180,r,0,2*Math.PI)
    ctx.stroke()
  }
  ctx.setLineDash([4,6])
  line(ctx,[360,24,360,132],'#66839445',1)
  line(ctx,[360,228,360,336],'#66839445',1)
  ctx.setLineDash([])
  line(ctx,[348,180,360,168,372,180,360,192,348,180],'#46657688',1.4)
  line(ctx,[352,180,360,172,368,180],'#54778988',1.4)

  // Circuit traces, perimeter lights and chamfered corner rails.
  for(const horizontal of [false,true]) for(const vertical of [false,true]) {
    ctx.save()
    ctx.translate(horizontal?width:0,vertical?height:0)
    ctx.scale(horizontal?-1:1,vertical?-1:1)
    const accent=horizontal!==vertical?'#9c74de':'#48bdbf'
    line(ctx,[3,86,3,16,16,3,160,3],'#303d51',2)
    line(ctx,[7,42,7,21,21,7,72,7],accent,2)
    line(ctx,[91,8,127,8,136,16,173,16],'#314456',1)
    for(let offset=0;offset<4;offset++) line(ctx,[18+offset*6,15,22+offset*6,11],'#526071',1)
    ctx.restore()
  }
}

function coin(ctx:Ctx,p:ArenaPoint,t:number) {
  ctx.save()
  ctx.translate(p.x,p.y)
  const glint=(1+Math.sin(t*4+p.x*.071))/2
  circle(ctx,0,0,10,'rgba(255,194,70,.09)')
  ctx.shadowColor='#e99a2e'
  ctx.shadowBlur=5
  circle(ctx,0,0,6.1,'#ffc658')
  ctx.shadowBlur=0
  circle(ctx,0,0,4.4,'#b46d24')
  polygon(ctx,[0,-3.8,2.8,0,0,3.8,-2.8,0],'#ffdf84')
  if(glint>.72) {
    const s=(glint-.72)*8
    line(ctx,[4-s,-4,4+s,-4],'#fff2c0',1)
    line(ctx,[4,-4-s,4,-4+s],'#fff2c0',1)
  }
  ctx.restore()
}

function drone(ctx:Ctx,p:ArenaPoint,player:ArenaPoint,t:number,index:number) {
  ctx.save()
  ctx.translate(p.x,p.y)
  ctx.rotate(Math.atan2(player.y-p.y,player.x-p.x)+Math.PI/2)
  ctx.lineWidth=.9
  const pulse=.65+Math.sin(t*6+index)*.18
  for(const side of [-1,1]) {
    ctx.save()
    ctx.scale(side,1)
    polygon(ctx,[4,-3,9,-7,12,-3,10,6,6,7,7,1],'#6c354f','#e97c8d')
    circle(ctx,9,-3,1.4,'#ffc1bb')
    ctx.restore()
  }
  polygon(ctx,[0,-10,6,-4,5,5,0,9,-5,5,-6,-4],'#762c4d','#ef7892')
  ctx.shadowColor='#ff4b73'
  ctx.shadowBlur=5*pulse
  polygon(ctx,[-4,-3,4,-3,2,0,-2,0],'#ffd3c7')
  ctx.shadowBlur=0
  line(ctx,[-2,4,2,4],'#e35a80',1.3)
  ctx.restore()
}

export function drawArena(ctx:Ctx,frame:ArenaFrame) {
  ctx.save()
  if(!floorCache) {
    floorCache=document.createElement('canvas')
    floorCache.width=width
    floorCache.height=height
    const floor=floorCache.getContext('2d')
    if(floor) drawFloor(floor)
  }
  ctx.drawImage(floorCache,0,0)
  for(const point of frame.coins) coin(ctx,point,frame.time)
  const trail=frame.trail??[]
  for(let i=0;i<trail.length;i++) {
    const {x,y}=trail[i]
    const fraction=(i+1)/trail.length
    ctx.globalAlpha=fraction*.65
    if(frame.diamond) {
      const s=2+fraction*2.6
      polygon(ctx,[x,y-s*1.4,x+s,y,x,y+s*1.4,x-s,y],'#8de7ff','#dcfaff')
    } else {
      circle(ctx,x,y,1+fraction*2,'#5ab3c2')
    }
  }
  ctx.globalAlpha=1
  frame.enemies.forEach((p,i)=>drone(ctx,p,frame.player,frame.time,i))
  if(frame.invulnerable) {
    ctx.strokeStyle='#d2fff7'
    ctx.lineWidth=1.6
    ctx.beginPath()
    ctx.arc(frame.player.x,frame.player.y,15.5,0,2*Math.PI)
    ctx.stroke()
    ctx.globalAlpha=.6+.3*Math.cos(frame.time*28)
  }
  drawAvatar(ctx,frame.player.x,frame.player.y,frame.skin,1,frame.angle)
  ctx.restore()
}
