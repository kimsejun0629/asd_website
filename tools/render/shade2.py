# 기체 음영 생성: tools/render에서 python3 shade2.py 787 737 … — 마스크 · meta.json 입력, 서버 불필요.
import json,numpy as np,sys,warnings
warnings.filterwarnings('ignore')
from PIL import Image
M=json.load(open('meta.json'));rng=np.random.default_rng(7)
def load(key,cat):return np.asarray(Image.open(f'm_{key}_{cat}.png').convert('RGBA'))[...,3].astype(np.float32)/255
def _box(a,r,axis):
    if r<1:return a
    pad=[(0,0),(0,0)];pad[axis]=(r+1,r);p=np.pad(a,pad,mode='edge');c=np.cumsum(p,axis=axis,dtype=np.float64);n=a.shape[axis]
    return ((np.take(c,np.arange(2*r+1,2*r+1+n),axis=axis)-np.take(c,np.arange(0,n),axis=axis))/(2*r+1)).astype(np.float32)
def blurf(a,s):
    a=np.asarray(a,np.float32);r=max(1,int(round(s*.93)))
    for _ in range(3):a=_box(_box(a,r,0),r,1)
    return a
Lv=np.array([-.45,-.55,.70]);Lv/=np.linalg.norm(Lv);Hv=Lv+np.array([0,0,1.]);Hv/=np.linalg.norm(Hv)
def light(n,base,amb=.5,kd=.62,ks=.4,shin=40,env=.10):
    diff=np.clip(np.einsum('ijk,k->ij',n,Lv),0,1);sp=np.clip(np.einsum('ijk,k->ij',n,Hv),0,1)**shin*ks
    c=np.array(base,np.float32)/255;sky=np.array([.86,.92,.98],np.float32)
    col=c*(amb+kd*diff)[...,None]+sp[...,None]
    fres=(1-np.clip(n[...,2],0,1))**2
    col=col*(1-env*fres[...,None])+sky*env*fres[...,None]*(.5+.5*diff[...,None])
    return col
def cyl_normals(mask,split=None):
    """행(y)마다 마스크의 좌우 폭으로 원통 법선을 만듦. split=x좌표면 좌/우를 따로(엔진 2개)"""
    H,W=mask.shape;n=np.zeros((H,W,3),np.float32);n[...,2]=1
    xs=np.arange(W,dtype=np.float32)
    parts=[(0,W)] if split is None else [(0,int(split)),(int(split),W)]
    for a,b in parts:
        sub=mask[:,a:b];s=sub.sum(1);cnt=s>0.5
        cx=np.where(cnt,(sub*xs[a:b]).sum(1)/np.maximum(s,1e-6),0);hw=np.maximum(s/2,1)
        u=np.clip((xs[None,a:b]-cx[:,None])/hw[:,None],-1,1)
        n[:,a:b,0]=np.where(sub>0,u,0);n[:,a:b,2]=np.where(sub>0,np.sqrt(np.clip(1-u*u,0,1)),1)
    # 앞뒤(기수·꼬리) 둥글기: 세로 방향 가장자리에서 살짝 기울임
    e=blurf(mask,6);gy=np.gradient(e,axis=0);n[...,1]+=-gy*6
    n/=np.linalg.norm(n,axis=2,keepdims=True);return n
def chord_t(mask):
    """열(x)마다 날개 앞전→뒷전 위치 t(0~1). 좌우 날개가 한 열에 겹치지 않으므로 열 단위로 충분"""
    H,W=mask.shape;t=np.zeros_like(mask);on=mask>0.5
    for x in range(W):
        ys=np.where(on[:,x])[0]
        if len(ys)<2:continue
        # 한 열에 조각이 둘 이상이면(날개·수평꼬리) 조각별로
        brk=np.where(np.diff(ys)>1)[0];segs=np.split(ys,brk+1)
        for sg in segs:
            y0,y1=sg[0],sg[-1];t[y0:y1+1,x]=(np.arange(y0,y1+1)-y0)/max(1,y1-y0)
    return t
def wing_shade(mask,base,S,lines=((.10,.10),(.62,.07),(.80,.14)),amp=.10):
    t=chord_t(mask)
    # 익형: 앞쪽 20~30%가 가장 높은 볼록면 → t에 따른 법선 기울기
    slope=np.where(t<.28,(.28-t)/.28,-(t-.28)/.72*.35)*amp
    n=np.dstack([np.zeros_like(t),-slope,np.ones_like(t)]);n/=np.linalg.norm(n,axis=2,keepdims=True)
    col=light(n,base,amb=.55,kd=.55,ks=.22,shin=18,env=.05)
    for pos,st in lines:  # 슬랫 · 스포일러 · 플랩 경계선
        d=np.abs(t-pos);ln=np.clip(1-d/.012,0,1)*mask;col*=(1-st*ln)[...,None]
    # 외곽선 약간 어둡게
    edge=mask-blurf(mask,1.2);col*=(1-.35*np.clip(edge,0,1))[...,None]
    return col

from PIL import ImageDraw,ImageFont
FONT='HanjinGroupSans-Bold.ttf'   # 동체 로고타입: 사이트 글꼴 한진그룹체
def word_tex(text='KOREAN',h=240,track=.07):
    f=ImageFont.truetype(FONT,h);ws=[f.getbbox(c) for c in text];adv=[f.getlength(c) for c in text]
    W=int(sum(adv)+track*h*(len(text)-1))+4;img=Image.new('L',(W,int(h*1.3)),0);d=ImageDraw.Draw(img);x=2
    for c,a in zip(text,adv):d.text((x,0),c,font=f,fill=255);x+=a+track*h
    bb=img.getbbox();return np.asarray(img.crop(bb),np.float32)/255
TEX=word_tex()
def sample(tex,a,b):
    th,tw=tex.shape;xa=np.clip(a*(tw-1),0,tw-1);yb=np.clip(b*(th-1),0,th-1)
    x0=np.floor(xa).astype(int);y0=np.floor(yb).astype(int);x1=np.minimum(x0+1,tw-1);y1=np.minimum(y0+1,th-1);fx=xa-x0;fy=yb-y0
    return (tex[y0,x0]*(1-fx)+tex[y0,x1]*fx)*(1-fy)+(tex[y1,x0]*(1-fx)+tex[y1,x1]*fx)*fy
def wordmark(k,cx):
    """대한항공 새 도장의 KOREAN 로고타입을 동체 옆면(원통)에 입히고 위에서 본 모습으로 투영.
       787-10(HL8515) 실사 기준: 기수에서 길이의 14% 지점부터 동체 지름의 1.9배 길이, 높이는 동체 높이의 38%,
       글자 중심은 창문 줄(중심선보다 동체 반지름의 10% 위). 왼쪽 면은 기수→꼬리, 오른쪽 면은 꼬리→기수로 읽힘"""
    H,W=k.shape;xs=np.arange(W,dtype=np.float32);yy=np.arange(H,dtype=np.float32)[:,None]
    s=k.sum(1);on=s>.5;cxr=np.where(on,(k*xs).sum(1)/np.maximum(s,1e-6),cx);R=np.maximum(s/2,1)[:,None]
    ys=np.where(on)[0];y0,y1=ys.min(),ys.max();Lf=y1-y0;D=2*np.median(R[on][:,0])
    u0=y0+Lf*.14;u1=u0+D*1.9
    dx=xs[None,:]-cxr[:,None];z=np.sqrt(np.clip(R*R-dx*dx,0,None))
    zt,zb=.48*R,-.28*R;b=(zt-z)/(zt-zb)
    a=np.where(dx<0,(yy-u0)/(u1-u0),(u1-yy)/(u1-u0))
    ok=(a>=0)&(a<=1)&(b>=0)&(b<=1)&(k>.5)
    return np.where(ok,sample(TEX,np.clip(a,0,1),np.clip(b,0,1)),0)*k
def over(dst,da,rgb,a):
    a3=a[...,None];oa=a+da*(1-a);return (rgb*a3+dst*da[...,None]*(1-a3))/np.maximum(oa[...,None],1e-6),oa
KE=(83,170,226);KE_FIN=(74,160,218);WING=(206,210,214);STAB=(198,202,207);ENG=(241,242,243);   # 2025 새 도장: 메탈릭 블루 #53AAE2 · 흰 엔진
GREY=(178,183,187);OLIVE=(94,104,88);DARK=(56,60,62)
def render(key):
    m=M[key];W,H=m['W'],m['H'];vb=m['vb'];S=W/vb[2];cx=(0-vb[0])*S
    rgb=np.zeros((H,W,3),np.float32);al=np.zeros((H,W),np.float32)
    C={c:load(key,c) for c in m['cats']};U=np.clip(sum(C.values()),0,1)
    sh=np.roll(np.roll(U,int(S*.5),1),int(S*.9),0);sh=blurf(sh,S*.5)*.22
    rgb,al=over(rgb,al,np.zeros((H,W,3),np.float32),sh)
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    grain=blurf(rng.normal(0,1,(H,W)).astype(np.float32),.8)*.012
    if key=='ah6':
        for cat,base in [('skid',DARK),('tube',DARK),('stab',OLIVE),('boom',OLIVE),('fus',OLIVE),('hub',DARK),('blade',(84,88,90)),('trotor',(66,70,72))]:
            if cat not in C:continue
            k=C[cat]
            n=cyl_normals(k) if cat in('fus','boom','tube','skid') else np.dstack([np.zeros_like(k),np.zeros_like(k),np.ones_like(k)])
            col=light(n,base,ks=.35 if cat!='fus' else .45,shin=40)
            if cat=='fus':
                ys=np.where(k.sum(1)>0)[0];y0,y1=ys.min(),ys.max()
                g=k*np.clip((y0+(y1-y0)*.45-yy)/(S*.25),0,1)
                gl=light(n,(34,46,56),amb=.35,kd=.4,ks=1.1,shin=90,env=.3);col=col*(1-g[...,None])+gl*g[...,None]
            if cat=='blade':col=light(np.dstack([np.zeros_like(k),np.zeros_like(k),np.ones_like(k)]),(70,74,76),ks=.1)
            rgb,al=over(rgb,al,col+grain[...,None],k*(0.95 if cat=='blade' else 1))
    else:
        livery=key!='g6500';FUS=KE if livery else GREY;FIN=KE_FIN if livery else (160,166,170)   # 모든 여객기 대한항공 새 도장(A330neo 포함)
        for cat in ['eng','wing','tip','stab','fus','fin']:
            if cat not in C:continue
            k=C[cat]
            if cat=='eng':
                n=cyl_normals(k,split=cx);col=light(n,ENG,ks=.55,shin=50,env=.12)
                # 흡입구 립: 엔진 앞쪽 끝을 살짝 어둡게
                front=np.clip(blurf(k,S*.12)-np.roll(blurf(k,S*.12),int(S*.25),0),0,1);col*=(1-.5*front)[...,None]
            elif cat=='tip':
                # 윙팁 장치(윙렛 · 샤크렛): 새 도장 파랑, 위로 꺾여 있어 바깥쪽이 더 밝게
                z0=np.zeros_like(k);n=np.dstack([z0+.35,z0-.1,z0+.93]);col=light(n,KE_FIN,amb=.55,kd=.62,ks=.45,shin=50,env=.16)
            elif cat in('wing','stab'):
                col=wing_shade(k,WING,S) if cat=='wing' else wing_shade(k,STAB,S,lines=((.72,.14),))
                # 동체와 맞닿는 곳의 음영(앰비언트 오클루전)
                ao=np.clip(blurf(C['fus'],S*.9)*1.6,0,1)*(1-C['fus']);col*=(1-.28*ao)[...,None]
            elif cat=='fus':
                n=cyl_normals(k);col=light(n,FUS,amb=.48,kd=.6,ks=.78,shin=60,env=.2)   # 메탈릭: 반사를 조금 더
                ys=np.where(k.sum(1)>0)[0];y0,y1=ys.min(),ys.max();Lf=y1-y0;hw=k.sum(1).max()/2
                # 둘레 이음선(패널 라인)
                step=S*2.6;d=np.abs(((yy-y0)/step)%1-.5)*step;pl=np.clip(1-(step/2-d)/1.0,0,1)*k;col*=(1-.05*pl)[...,None]
                # 조종석 창: 기수에서 약 4~5.5% 뒤, 양끝이 뒤로 휘는 띠
                u=(xx-cx)/max(hw,1);bend=u*u*Lf*.012
                band=k*np.clip(1-np.abs(yy-(y0+Lf*.047+bend))/(Lf*.0065),0,1)*(np.abs(u)<.82)
                band=blurf(band,1.0);gl=light(n,(28,36,44),amb=.3,kd=.3,ks=1.2,shin=90,env=.35)
                col=col*(1-band[...,None])+gl*band[...,None]
                if livery:
                    wm=wordmark(k,cx);lum=(col/(np.array(FUS,np.float32)/255)).mean(2,keepdims=True)
                    navy=np.array([5,23,102],np.float32)/255*np.clip(lum,.3,1.4)
                    col=col*(1-wm[...,None])+navy*wm[...,None]
            else:
                n=cyl_normals(k);col=light(n,FIN,ks=.5,shin=50)
            rgb,al=over(rgb,al,np.clip(col+grain[...,None],0,1),k)
    img=np.dstack([np.clip(rgb,0,1)*255,np.clip(al,0,1)*255]).astype(np.uint8)
    im=Image.fromarray(img);im.save(f'top_{key}.png')
    im.resize((W*2//3,H*2//3),Image.LANCZOS).save(f'top_{key}.webp',quality=86,method=6)
for k in (sys.argv[1:] or list(M)):render(k);print('ok',k)
