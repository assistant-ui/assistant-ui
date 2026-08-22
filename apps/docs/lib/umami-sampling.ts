export const UMAMI_SAMPLE_RATE = 0.01;

const STORAGE_KEY = "aui-umami-sample";
const WEBSITE_ID = "6f07c001-46a2-411f-9241-4f7f5afb60ee";
const DOMAINS = "www.assistant-ui.com";

/**
 * Umami stamps a visit at its first event and rotates visit_id once 30 minutes
 * have passed, so the window is fixed rather than sliding. The roll is written
 * once and left to lapse on the same schedule, which keeps one decision from
 * spanning several visits.
 */
const VISIT_WINDOW_MS = 30 * 60 * 1000;

/**
 * Umami records a sampled slice of traffic; PostHog stays the full-fidelity source.
 *
 * Runs inline in <head> rather than from an effect. Mounting after hydration
 * would drop readers who leave before it, and those are the bounces the ratios
 * below are meant to measure.
 *
 * The roll is held in localStorage rather than sessionStorage because umami
 * derives its session id server-side from the client IP and user agent, with no
 * client-side key: a reader's tabs are one umami session, so a per-tab roll
 * would send part of a session and truncate it. The stored value is one bit and
 * an expiry rather than an identifier, and it lapses with the visit window.
 *
 * Sampling whole visits rather than individual events is what keeps bounce
 * rate, pages per visit and duration correct; only counts need scaling by
 * 1 / UMAMI_SAMPLE_RATE.
 */
export const umamiBootstrapScript = `
(function(){
  try{
    var k=${JSON.stringify(STORAGE_KEY)},w=${VISIT_WINDOW_MS},now=Date.now(),s=null;
    try{
      var raw=window.localStorage.getItem(k);
      if(raw){var p=JSON.parse(raw);if(p&&typeof p.s==="number"&&p.e>now){s=p.s;}}
    }catch(e){}
    if(s===null){
      s=Math.random()<${UMAMI_SAMPLE_RATE}?1:0;
      try{window.localStorage.setItem(k,JSON.stringify({s:s,e:now+w}));}catch(e){}
    }
    if(!s){return;}
    var el=document.createElement("script");
    el.defer=true;
    el.src="/umami/script.js";
    el.setAttribute("data-website-id",${JSON.stringify(WEBSITE_ID)});
    el.setAttribute("data-domains",${JSON.stringify(DOMAINS)});
    document.head.appendChild(el);
  }catch(e){}
})();
`.trim();
