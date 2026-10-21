"""Generate original, dependency-free PNG app icons. Run from the project root."""
import math, struct, zlib
from pathlib import Path
OUT = Path(__file__).resolve().parents[1] / 'dist' / 'icons'
OUT.mkdir(exist_ok=True)
BG=(231,237,201); SUN=(228,182,110); FAR=(182,199,158); NEAR=(47,89,69); PATH=(246,244,237); SPARK=(100,129,83)
def color(x,y):
    c=BG
    if (x-290)**2+(y-205)**2<86**2: c=SUN
    if y>350-150*math.sin(math.pi*x/600): c=FAR
    if y>460-140*math.sin(math.pi*x/700): c=NEAR
    if y>345:
        t=(y-345)/167
        px=312-230*t+188*t*t
        if abs(x-px)<13: c=PATH
    dx,dy=x-116,y-152
    if (abs(dx)<4 and abs(dy)<24) or (abs(dy)<4 and abs(dx)<24) or (abs(dx-dy)<5 and abs(dx)<18 and abs(dy)<18) or (abs(dx+dy)<5 and abs(dx)<18 and abs(dy)<18): c=SPARK
    return c
def write(n,name):
    data=bytearray()
    for y in range(n):
        data.append(0)
        for x in range(n):
            samples=[color((x+sx)*512/n,(y+sy)*512/n) for sx,sy in ((.25,.25),(.75,.25),(.25,.75),(.75,.75))]
            data.extend(sum(p[c] for p in samples)//4 for c in range(3))
    def chunk(tag,b): return struct.pack('>I',len(b))+tag+b+struct.pack('>I',zlib.crc32(tag+b)&0xffffffff)
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',n,n,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(data,9))+chunk(b'IEND',b'')
    (OUT/name).write_bytes(png)
for n,name in [(192,'icon-192.png'),(512,'icon-512.png'),(512,'maskable-512.png'),(180,'apple-touch-icon.png')]: write(n,name)
print('Generated four app icons.')
