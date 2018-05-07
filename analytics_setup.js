(function(w, d, s, g, js, fjs) {
    g = w.gapi || (w.gapi = {});
    g.analytics = {
        q: [],
        ready: function(cb) {
            this.q.push(cb)
        }
    };
    js = d.createElement(s);
    fjs = d.getElementsByTagName(s)[0];
    js.src = 'https://apis.google.com/js/platform.js';
    fjs.parentNode.insertBefore(js, fjs);
    js.onload = function() {
        g.load('analytics')
    };
}(window, document, 'script'));

window.onGoogleYoloLoad = (googleyolo) => {
    console.log("Loaded");
    const retrievePromise = googleyolo.retrieve({
        supportedAuthMethods: [
            "https://accounts.google.com",
            "googleyolo://id-and-password"
        ],
        supportedIdTokenProviders: [{
            uri: "https://accounts.google.com",
            clientId: "708383383102-4h03gssp03i8ceonmqm14a44eugq9dh5.apps.googleusercontent.com"
        }]
    }).then((credential) => {
        console.log("Retreive: " + credential);
    }, (error) => {
        console.log(error);
    });

};