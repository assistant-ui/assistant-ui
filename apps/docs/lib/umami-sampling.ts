export const UMAMI_SAMPLE_RATE = 0.01;

const STORAGE_KEY = "aui-umami-sample";
const WEBSITE_ID = "6f07c001-46a2-411f-9241-4f7f5afb60ee";
const DOMAINS = "www.assistant-ui.com";

/**
 * Umami starts a new visit only where both of its conditions meet: at least
 * 1800s since the visit began, and a different UTC hour than the one the last
 * visit_id was salted with, because the rotation recomputes
 * `uuid(sessionId, hash(startOfHour(now)))` and lands on the same value inside
 * one hour. No client-side window reproduces that hybrid, and every window that
 * lapses mid visit truncates one, which is the single failure this design
 * exists to prevent.
 *
 * So the roll is bucketed well past any visit instead. Holding one decision
 * across consecutive visits only correlates them and leaves every visit whole,
 * which keeps the ratios exact and counts unbiased, at slightly wider variance.
 */
const BUCKET_MS = 24 * 60 * 60 * 1000;

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
 * a bucket number rather than an identifier.
 *
 * Sampling whole visits rather than individual events is what keeps bounce
 * rate, pages per visit and duration correct; only counts need scaling by
 * 1 / UMAMI_SAMPLE_RATE.
 */
export const umamiBootstrapScript = `
(function(){
  try{
    var k=${JSON.stringify(STORAGE_KEY)},b=Math.floor(Date.now()/${BUCKET_MS}),s=null;
    try{
      var raw=window.localStorage.getItem(k);
      if(raw){var p=JSON.parse(raw);if(p&&typeof p.s==="number"&&p.b===b){s=p.s;}}
    }catch(e){}
    if(s===null){
      s=Math.random()<${UMAMI_SAMPLE_RATE}?1:0;
      try{window.localStorage.setItem(k,JSON.stringify({s:s,b:b}));}catch(e){}
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
