import datetime
import gzip
import hashlib
import json
import os
import platform
import re
import resource
import shutil
import signal
import statistics
import subprocess
import time
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path.cwd()
OUT = ROOT / 'comparison-results'
OUT.mkdir(exist_ok=True)
SIDES = {'base': ROOT / 'comparison/base', 'head': ROOT / 'comparison/head'}
EXPECTED = {'base': 'a4dcbb5b9155cd7220e383c67a0613197d4d963d', 'head': '254d0fe97756405e6a5801c65c51dccd239d92fc'}
ROUTES = ['/docs', '/docs/installation', '/design/components', '/elements/thread']
ENV = dict(os.environ)
REPORT = {'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'commits': EXPECTED, 'environment': {'platform': platform.platform(), 'cpuCount': os.cpu_count(), 'node': subprocess.check_output(['node', '--version'], text=True).strip(), 'pnpm': subprocess.check_output(['pnpm', '--version'], text=True).strip(), 'flags': {key: ENV.get(key) for key in ['NODE_OPTIONS', 'CIRCLE_NODE_TOTAL', 'RAYON_NUM_THREADS', 'NEXT_PUBLIC_AUI_AI_PLAYGROUND_ENABLED', 'NEXT_PUBLIC_WEBMCP_ENABLED']}}, 'preparation': [], 'builds': [], 'assets': {}, 'http': {}, 'dev': {}, 'limitations': ['Two cold/cached samples per revision in ABBA order; percentages are descriptive, not a statistical significance verdict.', 'Cold means removed .next; OS and dependency caches remain warm. Cached builds retain .next.', 'Process-tree RSS is sampled and can double-count shared pages.', 'HTTP timings are server response/download timings, not browser FCP, LCP, hydration or interaction.', 'Baseline is pinned current main, not a confirmed production deployment SHA.']}


def save():
    (OUT / 'results.json').write_text(json.dumps(REPORT, indent=2) + '\n')


def tree_rss(pid):
    rows = {}
    for line in subprocess.check_output(['ps', '-eo', 'pid=,ppid=,rss='], text=True).splitlines():
        parts = line.split()
        if len(parts) == 3:
            child, parent, rss = map(int, parts)
            rows[child] = (parent, rss)
    selected = {pid}
    while True:
        children = {child for child, (parent, _) in rows.items() if parent in selected}
        if children <= selected:
            break
        selected |= children
    return sum(rows.get(child, (0, 0))[1] for child in selected)


def terminate(proc):
    if proc.poll() is None:
        os.killpg(proc.pid, signal.SIGTERM)
        try:
            proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.wait()


def run(side, label, command, timeout=1200):
    print(f'{side}: {label}', flush=True)
    start = time.monotonic()
    before = resource.getrusage(resource.RUSAGE_CHILDREN)
    peak = 0
    reason = None
    log = OUT / f'{side}-{label}.log'
    with log.open('w') as stream:
        proc = subprocess.Popen(command, cwd=SIDES[side], env=ENV, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            while proc.poll() is None:
                peak = max(peak, tree_rss(proc.pid))
                if shutil.disk_usage(ROOT).free < 2 * 1024**3:
                    reason = 'Disk below 2 GiB'
                    break
                if time.monotonic() - start > timeout:
                    reason = 'Stage timeout'
                    break
                time.sleep(0.25)
        finally:
            terminate(proc)
    after = resource.getrusage(resource.RUSAGE_CHILDREN)
    item = {'side': side, 'stage': label, 'seconds': time.monotonic() - start, 'peakTreeRssMiB': peak / 1024, 'cpuSeconds': (after.ru_utime + after.ru_stime) - (before.ru_utime + before.ru_stime), 'exitCode': proc.returncode, 'cancelled': reason, 'log': log.name}
    raw = re.sub(r'\x1b\[[0-9;]*m', '', log.read_text())
    phases = {}
    for key, pattern in {'compile': r'Compiled successfully in ([\d.]+)(ms|s|min)', 'typecheck': r'Finished TypeScript in ([\d.]+)(ms|s|min)', 'staticGeneration': r'Generating static pages.*?in ([\d.]+)(ms|s|min)'}.items():
        match = re.search(pattern, raw)
        if match:
            phases[key] = float(match[1]) * {'ms': .001, 's': 1, 'min': 60}[match[2]]
    trace = SIDES[side] / 'apps/docs/.next/trace'
    if 'build-' in label and trace.exists():
        shutil.copyfile(trace, OUT / f'{side}-{label}-trace.jsonl')
    item['phasesSeconds'] = phases
    REPORT['builds' if 'build-' in label else 'preparation'].append(item)
    save()
    print(json.dumps(item), flush=True)
    if proc.returncode != 0:
        print(raw[-12000:], flush=True)
        raise RuntimeError(f'{side} {label} failed')


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = set()
        self.in_title = False
        self.title = ''

    def handle_starttag(self, tag, attrs):
        self.in_title = self.in_title or tag == 'title'
        for key, value in attrs:
            if key in ('src', 'href') and value and value.startswith('/_next/static/') and re.search(r'\.(js|css)(?:\?|$)', value):
                self.assets.add(value)

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def output(side):
    build = SIDES[side] / 'apps/docs/.next'
    manifest = json.loads((build / 'prerender-manifest.json').read_text())
    result = {'prerenderedRoutes': len(manifest['routes']), 'routes': {}}
    for route in ROUTES:
        page_path = build / 'server/app' / (route.lstrip('/') + '.html')
        raw = page_path.read_bytes()
        parser = Page()
        parser.feed(raw.decode())
        totals = {}
        for ext in ('js', 'css'):
            paths = [build / u.split('?')[0].removeprefix('/_next/') for u in parser.assets if u.split('?')[0].endswith('.' + ext)]
            totals[ext] = {'files': len(paths), 'bytes': sum(p.stat().st_size for p in paths), 'gzipBytes': sum(len(gzip.compress(p.read_bytes(), compresslevel=9, mtime=0)) for p in paths)}
        result['routes'][route] = {'title': parser.title, 'htmlBytes': len(raw), 'htmlGzipBytes': len(gzip.compress(raw, compresslevel=9, mtime=0)), 'assets': totals}
    REPORT['assets'][side] = result
    save()


def request(url):
    start = time.monotonic()
    with urllib.request.urlopen(url, timeout=180) as response:
        headers_time = time.monotonic()
        body = response.read()
        assert response.status == 200
    return {'ttfbMs': (headers_time - start) * 1000, 'downloadMs': (time.monotonic() - start) * 1000, 'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()}


def serve(side, dev=False):
    app = SIDES[side] / 'apps/docs'
    if dev:
        shutil.rmtree(app / '.next', ignore_errors=True)
    port = 3210 if side == 'base' else 3211
    phase = 'dev' if dev else 'start'
    command = ['pnpm', '--filter', '@assistant-ui/docs-site', phase, '--port', str(port), '--hostname', '127.0.0.1']
    start = time.monotonic()
    log = OUT / f'{side}-{phase}.log'
    result = {}
    with log.open('w') as stream:
        proc = subprocess.Popen(command, cwd=SIDES[side], env={**ENV, 'NODE_ENV': 'development' if dev else 'production'}, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            while 'Ready in' not in log.read_text():
                if proc.poll() is not None or time.monotonic() - start > 90:
                    raise RuntimeError(f'{side} {phase} did not become ready: {log.read_text()[-3000:]}')
                time.sleep(.1)
            result['readySeconds'] = time.monotonic() - start
            for route in (['/docs'] if dev else ROUTES):
                first = request(f'http://127.0.0.1:{port}{route}')
                samples = [request(f'http://127.0.0.1:{port}{route}') for _ in range(5)]
                result[route] = {'first': first, 'repeatSamples': samples, 'repeatMedianTtfbMs': statistics.median(s['ttfbMs'] for s in samples), 'repeatMedianDownloadMs': statistics.median(s['downloadMs'] for s in samples)}
            result['residentTreeMiBAfterRequests'] = tree_rss(proc.pid) / 1024
        finally:
            terminate(proc)
    REPORT['dev' if dev else 'http'][side] = result
    save()


try:
    REPORT['versions'] = {}
    for side, path in SIDES.items():
        sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=path, text=True).strip()
        assert sha == EXPECTED[side], (side, sha)
        manifest = json.loads((path / 'apps/docs/package.json').read_text())
        REPORT['versions'][side] = {k: v for k, v in manifest['dependencies'].items() if k in ('next', 'react', 'react-dom') or 'fumadocs' in k or 'farming-labs' in k}
        run(side, 'install', ['pnpm', 'install', '--frozen-lockfile', '--filter', '.', '--filter', '@assistant-ui/docs-site...'])
        run(side, 'dependencies', ['pnpm', 'exec', 'turbo', 'run', 'build', '--filter=@assistant-ui/docs-site^...', '--concurrency=2'])
        run(side, 'type-docs', ['pnpm', '--filter', '@assistant-ui/docs-site', 'generate:type-docs'])
    for index, side in enumerate(['base', 'head', 'head', 'base'], 1):
        shutil.rmtree(SIDES[side] / 'apps/docs/.next', ignore_errors=True)
        for cache in ('cold', 'cached'):
            run(side, f'build-{index}-{cache}', ['pnpm', '--filter', '@assistant-ui/docs-site', 'build'])
        output(side)
        if side not in REPORT['http']:
            serve(side)
    for side in ['base', 'head']:
        serve(side, dev=True)
    REPORT['status'] = 'complete'
except Exception as error:
    REPORT['status'] = 'failed'
    REPORT['error'] = str(error)
    raise
finally:
    REPORT['finishedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    save()
