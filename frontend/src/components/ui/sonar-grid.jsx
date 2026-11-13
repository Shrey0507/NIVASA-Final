import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function SonarGrid({ children, className, spacing = 28, dotRadius = 1.25, baseOpacity = 0.2, pingEvery = 3.2, speed = 210, ringWidth = 100, color = "rgba(167,139,250,0.9)" }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!host || !canvas || !ctx) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0, height = 0, raf = 0, timer = 0, visible = true;
    let nextPing = performance.now() + 800;
    const rings = [];
    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };
    const draw = (now) => {
      const lifetime = (Math.hypot(width, height) + ringWidth) / speed;
      for (let i = rings.length - 1; i >= 0; i--) if ((now-rings[i].born)/1000 > lifetime) rings.splice(i,1);
      ctx.clearRect(0,0,width,height);
      const cols = Math.ceil(width/spacing), rows = Math.ceil(height/spacing);
      const ox = (width-(cols-1)*spacing)/2, oy = (height-(rows-1)*spacing)/2;
      for(let x=0;x<cols;x++) for(let y=0;y<rows;y++) {
        const px=ox+x*spacing, py=oy+y*spacing; let energy=0;
        for(const ring of rings) {
          const age=(now-ring.born)/1000, radius=age*speed;
          const dist=Math.abs(Math.hypot(px-ring.x,py-ring.y)-radius);
          const k=Math.max(0,1-dist/ringWidth)*(1-age/lifetime);
          energy=Math.max(energy,k);
        }
        ctx.beginPath(); ctx.fillStyle=color;
        ctx.globalAlpha=baseOpacity+(1-baseOpacity)*energy;
        ctx.arc(px,py,dotRadius*(1+1.5*energy),0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha=1;
    };
    const tick=(now)=>{
      raf=0; if(!visible || document.hidden) return;
      if(!reduceMotion.matches && now>=nextPing) {
        rings.push({x:width*(0.2+Math.random()*0.6),y:height*(0.2+Math.random()*0.6),born:now});
        nextPing=now+pingEvery*1000;
      }
      draw(now);
      if(rings.length || !reduceMotion.matches) raf=requestAnimationFrame(tick);
    };
    const wake=()=>{if(!raf){clearTimeout(timer);raf=requestAnimationFrame(tick);}};
    const ro=new ResizeObserver(resize);
    const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)wake();});
    const visibility=()=>{if(!document.hidden)wake();};
    ro.observe(host); io.observe(host); document.addEventListener("visibilitychange",visibility);
    resize(); wake();
    return ()=>{ro.disconnect();io.disconnect();document.removeEventListener("visibilitychange",visibility);cancelAnimationFrame(raf);clearTimeout(timer);};
  }, [spacing,dotRadius,baseOpacity,pingEvery,speed,ringWidth,color]);

  return <div ref={hostRef} className={cn("relative isolate overflow-hidden",className)}>
    <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 size-full" />
    {children}
  </div>;
}
