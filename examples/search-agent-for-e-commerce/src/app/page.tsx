"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AssistantModal } from "@/components/ui/assistant-ui/assistant-modal";

function Home() {
  const searchParams = useSearchParams();
  const iframeId = searchParams.get("iframeId");
  const [isValid, setIsValid] = useState(false);
  const [indexId, setIndexId] = useState("");
  const [referrer, setReferrer] = useState("");

  useEffect(() => {
    // console.log('isValid state changed:', isValid);
  }, [isValid]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setReferrer(document.referrer);
    }
  }, []);

  useEffect(() => {
    if (iframeId) {
      // SAMPLE CODE TO VALIDATE REQUESTS FROM A WHITELISTED DOMAINS USING IFRAME_ID
      // console.log('Validating iframeId:', iframeId);
      // fetch(`${process.env.NEXT_PUBLIC_VITE_ADMIN_URL}/iframe/validate_iframe_request`, {
      //   method: 'GET',
      //   headers: {
      //     'accept': 'application/json',
      //     'referer': document.referrer,
      //     'customerId': iframeId // Add the customerId header
      //   }
      // })
      // .then(response => {
      //   if (!response.ok) {
      //     throw new Error(`HTTP error! status: ${response.status}`);
      //   }
      //   return response.json();
      // })
      // .then(data => {
      //   // console.log('Validation response:', data);
      //   if (data.message === 'Valid user') {
      //     setIsValid(true);
      //     setIndexId(data.index_id); // Save index_id
      //     window.parent.postMessage({ type: 'validation', status: 'success' }, '*');
      //   } else {
      //     setIsValid(false);
      //     window.parent.postMessage({ type: 'validation', status: 'failure' }, '*');
      //   }
      // })
      // .catch(error => {
      //   console.error('Fetch error:', error);
      // });
    }
  }, [iframeId]);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="fixed bottom-4 right-4 size-12 rounded-full shadow">
        <AssistantModal />
      </div>
    </Suspense>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Home />
    </Suspense>
  );
}
