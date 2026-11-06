"use client";

import { useEffect, useRef } from "react";

const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
const FS = `precision highp float;uniform vec2 r;uniform float t;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(.8,.6,-.6,.8);for(int i=0;i<6;i++){v+=a*n(p);p=m*p*2.02;a*=.5;}return v;}
void main(){vec2 uv=gl_FragCoord.xy/r;vec2 q=(uv-.5)*vec2(r.x/max(r.y,1.),1.)*1.6;float s=t*.04;
vec2 w1=vec2(fbm(q+vec2(0.,s)),fbm(q+vec2(5.2,1.3)-s));
vec2 w2=vec2(fbm(q+3.*w1+vec2(1.7,9.2)+s*.6),fbm(q+3.*w1+vec2(8.3,2.8)-s*.4));
float f=fbm(q+3.2*w2);
vec3 black=vec3(.03,.035,.025);vec3 ember=vec3(.09,.13,.02);vec3 red=vec3(.36,.5,.06);vec3 ash=vec3(.46,.46,.50);
vec3 col=mix(black,ember,smoothstep(.25,.8,f));col=mix(col,red,smoothstep(.55,1.,length(w2))*.55);
col=mix(col,ash,smoothstep(.55,.95,w1.y*f*1.7)*.38);col*=.6+.5*f;col+=(h(gl_FragCoord.xy+t)-.5)*.02;
gl_FragColor=vec4(col,1.);}`;

/** Slow, soft, smoke-like background in navy, steel, indigo and ash. */
export function SmokeBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const gl = cv.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;
    const mk = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = mk(gl.VERTEX_SHADER, VS);
    const fs = mk(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;
    const pr = gl.createProgram()!;
    gl.attachShader(pr, vs);
    gl.attachShader(pr, fs);
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(pr, "r");
    const uT = gl.getUniformLocation(pr, "t");
    // The moving smoke is part of the brand: it keeps moving, slower, when the system asks for reduced motion.
    const reduce = false;
    const slow = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.5 : 1;
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25) * 0.75;
      const w = Math.max(1, Math.floor(cv.clientWidth * dpr));
      const h = Math.max(1, Math.floor(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uR, w, h);
      gl.uniform1f(uT, reduce ? 30 : ((now - t0) / 1000) * slow);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reduce && !document.hidden) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onVis = () => {
      if (!document.hidden && !reduce) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <>
      <canvas ref={ref} aria-hidden="true" className="fixed inset-0 z-0 block h-screen w-screen" />
      <div aria-hidden="true" className="fixed inset-0 z-0 bg-[rgba(11,11,13,.35)]" />
    </>
  );
}
