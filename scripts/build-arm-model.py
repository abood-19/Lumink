import numpy as np, json, struct, sys
V=[];F=[];g=None;JG={}
for line in open('base.obj'):
    if line.startswith('v '): V.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('g '): g=line.split()[1]
    elif line.startswith('f ') and g=='body':
        F.append([int(p.split('/')[0])-1 for p in line.split()[1:]])
    elif line.startswith('f ') and g.startswith('joint-l-'):
        JG.setdefault(g,[]).extend(int(p.split('/')[0])-1 for p in line.split()[1:])
V=np.array(V);F=np.array(F)
J={k:V[sorted(set(v))].mean(0) for k,v in JG.items()}
XCUT=float(sys.argv[1]) if len(sys.argv)>1 else 2.75
sel=F[(V[F][:,:,0]>XCUT).all(1) & (V[F][:,:,1]>0.5).all(1)]
ids,inv=np.unique(sel,return_inverse=True)
P=V[ids]; Q=inv.reshape(-1,4)
print('verts',len(P),'quads',len(Q))

def catmull(P,Q):
    nv=len(P)
    fp=P[Q].mean(1)
    # edges
    e={}
    edges=[]
    qe=np.zeros((len(Q),4),int)
    for fi,q in enumerate(Q):
        for k in range(4):
            a,b=q[k],q[(k+1)%4]; key=(min(a,b),max(a,b))
            if key not in e: e[key]=len(edges); edges.append([key,[]])
            edges[e[key]][1].append(fi); qe[fi,k]=e[key]
    E=np.array([k for k,_ in edges])
    ep=np.zeros((len(edges),3)); bound=np.zeros(len(edges),bool)
    for i,(k,fs) in enumerate(edges):
        if len(fs)==2: ep[i]=(P[k[0]]+P[k[1]]+fp[fs[0]]+fp[fs[1]])/4
        else: ep[i]=(P[k[0]]+P[k[1]])/2; bound[i]=True
    # vertex update
    vf=[[] for _ in range(nv)]
    for fi,q in enumerate(Q):
        for v in q: vf[v].append(fi)
    ve=[[] for _ in range(nv)]
    for i,(k,_) in enumerate(edges): ve[k[0]].append(i); ve[k[1]].append(i)
    NP=np.zeros_like(P)
    for v in range(nv):
        be=[i for i in ve[v] if bound[i]]
        if be:
            mids=[(P[E[i][0]]+P[E[i][1]])/2 for i in be]
            NP[v]=(P[v]*0.5+np.mean(mids,0)*0.5) if len(be)>=2 else P[v]
        else:
            n=len(vf[v]); Fm=fp[vf[v]].mean(0); Rm=np.mean([(P[E[i][0]]+P[E[i][1]])/2 for i in ve[v]],0)
            NP[v]=(Fm+2*Rm+(n-3)*P[v])/n
    allP=np.vstack([NP,ep,fp])
    eo=nv; fo=nv+len(edges)
    nq=[]
    for fi,q in enumerate(Q):
        for k in range(4):
            v=q[k]; e1=qe[fi,k]; e0=qe[fi,(k-1)%4]
            nq.append([v,eo+e1,fo+fi,eo+e0])
    return allP,np.array(nq)

for _ in range(2): P,Q=catmull(P,Q)
print('after',len(P),len(Q))
# orient: forearm axis from points with x in [3.0,3.9]
fa=P[(P[:,0]>3.0)&(P[:,0]<3.9)]
c=fa.mean(0); u,s,vt=np.linalg.svd(fa-c); ax=vt[0]
hand=P[P[:,0]>4.3].mean(0)
if np.dot(hand-c,ax)<0: ax=-ax
# build rotation: ax -> +Y
y=ax; tmp=np.array([0,0,1.0]); x=np.cross(y,tmp); x/=np.linalg.norm(x); z=np.cross(x,y)
R=np.stack([x,y,z])
P2=(P-c)@R.T
# clean cut perpendicular to the forearm, below the elbow
ymin=P2[:,1].min(); ymax=P2[:,1].max()
ycut=ymin+(ymax-ymin)*float(sys.argv[2] if len(sys.argv)>2 else 0.16)
keep=(P2[Q][:,:,1]>ycut).all(1)
Q=Q[keep]
ids,inv=np.unique(Q,return_inverse=True); P2=P2[ids]; Q=inv.reshape(-1,4)
# close the cut with a cap: boundary loop near the cut
from collections import defaultdict
ec=defaultdict(int)
for q in Q:
    for k in range(4):
        a,b=q[k],q[(k+1)%4]; ec[(min(a,b),max(a,b))]+=1
bedges=[e for e,cnt in ec.items() if cnt==1]
low=[e for e in bedges if P2[e[0],1]<ycut+0.35*(ymax-ymin)*0.2+0.6]
cv=sorted(set([v for e in low for v in e]))
cen=P2[cv].mean(0)
capP=np.vstack([P2,cen[None]]); ci=len(P2)
# orient cap triangles using directed edges of quads
dire={}
for q in Q:
    for k in range(4): dire[(q[k],q[(k+1)%4])]=1
capT=[]
for a,b in low:
    if (a,b) in dire: capT.append([b,a,ci])
    else: capT.append([a,b,ci])
P2=capP
# scale: total height 11
mean0=P2.mean(0); P2-=mean0; h=np.ptp(P2[:,1]); P2*=11/h
yshift=(P2[:,1].min()+P2[:,1].max())/2; P2[:,1]-=yshift
def tj(p): q=((p-c)@R.T-mean0)*11/h; q[1]-=yshift; return q
J={k:tj(v) for k,v in J.items()}
tris=np.concatenate([Q[:,[0,1,2]],Q[:,[0,2,3]],np.array(capT)])

# ---- detail attributes for the skin shader (nails, knuckle creases, veins)
nv_=len(P2)
# vertex normals
Nrm=np.zeros_like(P2)
for t in tris:
    a,b,cc=P2[t]; fn=np.cross(b-a,cc-a); Nrm[t]+=fn
Nrm/=np.linalg.norm(Nrm,axis=1,keepdims=True)+1e-9
dorsal=np.array([1.0,0,0])  # +X becomes the camera side after rotateY(-90deg) in the viewer
nail=np.zeros(nv_); cs=np.zeros(nv_); cw=np.zeros(nv_); vein=np.zeros(nv_)
for f in range(1,6):
    js=[J.get(f'joint-l-finger-{f}-{k}') for k in range(1,5)]
    js=[j for j in js if j is not None]
    if len(js)<2: continue
    tip=js[-1]; d=tip-js[-2]; seg=np.linalg.norm(d); d/=seg
    # nail: dorsal side of the last segment, an ellipse ending just before the tip
    ncen=tip-d*seg*0.42
    rel=P2-ncen; along=rel@d; side=np.linalg.norm(rel-np.outer(along,d),axis=1)
    w=np.clip(1-((along/(seg*0.5))**2+(0 if True else 0)),0,1)*np.clip((Nrm@dorsal-0.35)/0.4,0,1)*np.clip(1-side/(seg*0.75),0,1)
    nail=np.maximum(nail,np.clip(w*1.6,0,1))
    # knuckle creases at every joint of the finger
    for a_,b_ in zip(js[:-1],js[1:]):
        dd=b_-a_; L=np.linalg.norm(dd); dd/=L
        rel=P2-a_; al=rel@dd; rad=np.linalg.norm(rel-np.outer(al,dd),axis=1)
        wt=np.exp(-(al/(L*0.16))**2)*np.clip(1-rad/(L*0.9),0,1)
        upd=wt>cw; cs[upd]=al[upd]/L; cw[upd]=wt[upd]
# wrist creases (palm side)
wr=J.get('joint-l-hand')
if wr is not None:
    rel=P2-wr; al=rel[:,1]
    wt=np.exp(-(al/0.35)**2)*np.clip((-(Nrm@dorsal)-0.2)/0.5,0,1)
    upd=wt>cw; cs[upd]=al[upd]/1.5; cw[upd]=wt[upd]
    # veins: back of the hand and the forearm, fading towards the elbow
    yrel=P2[:,1]-wr[1]
    vein=np.clip((Nrm@dorsal+0.1)/0.6,0,1)*np.clip(1-np.abs(yrel+0.6)/3.2,0,1)
attrs=np.stack([nail,cs,cw,vein],1).astype(np.float32)
print('nail verts',(nail>0.5).sum(),'crease verts',(cw>0.3).sum())
pos=P2.astype(np.float32); ind=tris.astype(np.uint16 if len(P2)<65536 else np.uint32)
ib=ind.tobytes(); pad=b'\0'*((4-len(ib)%4)%4)
open('arm.bin','wb').write(struct.pack('<II',len(pos),ind.size)+pos.tobytes()+ib+pad+attrs.tobytes())
json.dump({'vertices':len(pos),'indices':int(ind.size),'indexType':str(ind.dtype)},open('arm.json','w'))
print('bin bytes',len(pos.tobytes())+len(ind.tobytes()), ind.dtype, 'bbox',P2.min(0),P2.max(0))
