import { CONSENT_STORAGE_KEY } from "./consent";

export const UMAMI_SAMPLE_RATE = 0.01;

const STORAGE_KEY = "aui-umami-sample";
const WEBSITE_ID = "6f07c001-46a2-411f-9241-4f7f5afb60ee";
const DOMAINS = "www.assistant-ui.com";

/**
 * Umami re-reads this key on every send, so writing it stops a tracker that is
 * already running rather than only the next page load.
 */
export const UMAMI_DISABLED_STORAGE_KEY = "umami.disabled";

/**
 * `data-before-send` names a global umami calls on every send, and returning
 * null drops the payload. It is the half of the stop path that survives a
 * browser that has stopped accepting writes.
 */
const BEFORE_SEND_GLOBAL = "__auiUmamiBeforeSend";
const SUPPRESSED_GLOBAL = "__auiUmamiSuppressed";

export function setUmamiTrackingEnabled(enabled: boolean): void {
  (window as unknown as Record<string, unknown>)[SUPPRESSED_GLOBAL] = !enabled;
  try {
    if (enabled) window.localStorage.removeItem(UMAMI_DISABLED_STORAGE_KEY);
    else window.localStorage.setItem(UMAMI_DISABLED_STORAGE_KEY, "1");
  } catch {}
}

/**
 * Umami records a sampled slice of traffic; PostHog stays the full-fidelity source.
 *
 * Runs inline in <head> rather than from an effect. Mounting after hydration
 * would drop readers who leave before it, and those are the bounces the ratios
 * here are meant to measure.
 *
 * Umami starts a new visit only where both of its conditions meet: at least
 * 1800s since the visit began, and a different UTC hour than the one the last
 * visit_id was salted with, because the rotation recomputes
 * `uuid(sessionId, hash(startOfHour(now)))` and lands on the same value inside
 * one hour. No client-side window reproduces that hybrid, and every window that
 * lapses mid visit truncates one, which is the single failure this exists to
 * prevent.
 *
 * So the roll is bucketed to umami's own session lifetime instead. session_id
 * is `uuid(websiteId, ip, userAgent, getSalt(SALT_ROTATION))`, and getSalt
 * defaults to startOfMonth, so a device carries one session_id for a UTC
 * calendar month. Matching that does two things: no bucket edge falls inside a
 * visit often enough to matter, and Visitors, which is a distinct count over
 * session_id rather than a sum of per-visit counts, still scales by 1 / rate. A
 * shorter bucket breaks the second one, since a device active on d days is
 * sampled with probability about r * d and the scaled figure then converges on
 * summed daily uniques. This tracks the SALT_ROTATION default; moving it to day
 * or week upstream needs the same change here.
 *
 * localStorage rather than sessionStorage because umami derives session_id
 * server-side with no client-side key, so a reader's tabs are one session and a
 * per-tab roll would truncate it. What is stored is one bit and a bucket number
 * rather than an identifier.
 *
 * A reader whose storage is unavailable is not tracked at all. Rolling per load
 * there would be event sampling, and umami turns each surviving pageview into
 * its own visit, so singletons get amplified by pages-per-visit and move bounce
 * rate by points. Dropping that slice biases only the counts, and by less.
 *
 * Not an invariant: a visit straddling the month boundary is still half sent,
 * at about E[visit] / 30d.
 *
 * The script exits for visitors broadcasting Global Privacy Control and for
 * visitors who declined the consent banner. It still runs while a choice is
 * pending because the measurement is first-party, cookieless, and sampled —
 * the audience-measurement posture the privacy policy describes; keep the
 * policy's cookies section in sync when changing this.
 */
export const umamiBootstrapScript = `
(function(){
  try{
    if(navigator.globalPrivacyControl===true){return;}
    if(window.localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)})==="denied"){return;}
    var k=${JSON.stringify(STORAGE_KEY)},t=new Date(Date.now()),b=t.getUTCFullYear()*12+t.getUTCMonth(),s=null;
    var raw=window.localStorage.getItem(k);
    if(raw){try{var p=JSON.parse(raw);if(p&&typeof p.s==="number"&&p.b===b){s=p.s;}}catch(e){}}
    if(s===null){
      s=Math.random()<${UMAMI_SAMPLE_RATE}?1:0;
      window.localStorage.setItem(k,JSON.stringify({s:s,b:b}));
    }
    if(!s){return;}
    window[${JSON.stringify(BEFORE_SEND_GLOBAL)}]=function(type,payload){
      return window[${JSON.stringify(SUPPRESSED_GLOBAL)}]?null:payload;
    };
    var el=document.createElement("script");
    el.async=false;
    el.src="/umami/script.js";
    el.setAttribute("data-website-id",${JSON.stringify(WEBSITE_ID)});
    el.setAttribute("data-domains",${JSON.stringify(DOMAINS)});
    el.setAttribute("data-before-send",${JSON.stringify(BEFORE_SEND_GLOBAL)});
    document.head.appendChild(el);
  }catch(e){}
})();
`.trim();
