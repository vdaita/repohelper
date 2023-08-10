import mixpanel, { Dict, Query } from 'mixpanel-browser';

const isProd = process.env.NODE_ENV === "production";
mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN, {
    api_host: window.location.origin,
    debug: !isProd,
    track_pageview: true
});

export default mixpanel;