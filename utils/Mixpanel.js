import mixpanel, { Dict, Query } from 'mixpanel-browser';


let createMixpanelInstance = (origin) => {
    const isProd = process.env.NODE_ENV === "production";
    mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN, {
        api_host: origin + "/mp",
        debug: !isProd,
        track_pageview: true,
        opt_out_tracking_by_default: true
    });
    return mixpanel;
}


export default createMixpanelInstance;