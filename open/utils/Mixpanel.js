import mixpanel from 'mixpanel-browser';
mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN, {debug: !(process.env.NODE_ENV === 'production'), track_pageview: true, persistence: 'localStorage', ignore_dnt: true});

// Maybe add an environment check

export let Mixpanel = mixpanel;