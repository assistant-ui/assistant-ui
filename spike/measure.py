#!/usr/bin/env python3
"""Run a command, sample the RSS sum of its whole process tree every 0.25s.
usage: measure.py <label> <logfile> -- cmd...
Prints peak tree RSS (MB), peak single-process RSS, wall time, exit code."""
import subprocess, sys, time, json, os
label, log = sys.argv[1], sys.argv[2]
cmd = sys.argv[sys.argv.index('--')+1:]
def tree_rss(root):
    out = subprocess.run(['ps','-axo','pid=,ppid=,rss='],capture_output=True,text=True).stdout
    kids, rss = {}, {}
    for l in out.split('\n'):
        p = l.split()
        if len(p)!=3: continue
        pid,ppid,r = map(int,p); rss[pid]=r; kids.setdefault(ppid,[]).append(pid)
    tot, mx, n, st = 0, 0, 0, [root]
    while st:
        x = st.pop()
        if x in rss: tot += rss[x]; mx = max(mx, rss[x]); n += 1
        st += kids.get(x, [])
    return tot, mx, n
t0 = time.time()
with open(log,'w') as f:
    p = subprocess.Popen(cmd, stdout=f, stderr=subprocess.STDOUT, start_new_session=True)
    peak = peak1 = peakn = 0; samples = []
    while p.poll() is None:
        tot, mx, n = tree_rss(p.pid)
        peak = max(peak, tot); peak1 = max(peak1, mx); peakn = max(peakn, n)
        samples.append((round(time.time()-t0,1), tot//1024))
        time.sleep(0.25)
wall = time.time()-t0
res = dict(label=label, exit=p.returncode, wall_s=round(wall,1), peak_tree_mb=peak//1024,
           peak_single_mb=peak1//1024, peak_procs=peakn)
print(json.dumps(res))
with open(log+'.json','w') as f: json.dump(dict(res, samples=samples), f)
