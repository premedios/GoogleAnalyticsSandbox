function renderCharts() {
    gapi.analytics.ready(function() {

        /**
         * Authorize the user immediately if the user has already granted access.
         * If no access has been created, render an authorize button inside the
         * element with the ID "embed-api-auth-container".
         */
        gapi.analytics.auth.authorize({
            container: 'embed-api-auth-container',
            clientid: '708383383102-4h03gssp03i8ceonmqm14a44eugq9dh5.apps.googleusercontent.com'
        });

        var request = gapi.client.analytics.management.accountSummaries.list();
        request.execute(handleResponse);

        /**
         * Create a new ViewSelector2 instance to be rendered inside of an
         * element with the id "view-selector-container".
         */
        var viewSelector = new gapi.analytics.ViewSelector({
            container: 'view-selector-container',
        });

        viewSelector.execute();


        /**
         * Update the activeUsers component, the Chartjs charts, and the dashboard
         * title whenever the user changes the view.
         */
        viewSelector.on('change', function(ids) {

            // Render all the of charts for this view.
            renderWeekOverWeekChart(ids);
            // renderYearOverYearChart(data.ids);
            // renderTopBrowsersChart(data.ids);
            // renderTopCountriesChart(data.ids);
        });


        /**
         * Draw the a chart.js line chart with data from the specified view that
         * overlays session data for the current week over session data for the
         * previous week.
         */
        function renderWeekOverWeekChart(ids) {

            // Adjust `now` to experiment with different days, for testing only...
            var now = moment(); // .subtract(3, 'day');

            var thisWeek = query({
                'ids': ids,
                'dimensions': 'ga:date,ga:nthDay',
                'metrics': 'ga:sessions',
                'start-date': moment(now).subtract(1, 'day').day(0).format('YYYY-MM-DD'),
                'end-date': moment(now).format('YYYY-MM-DD')
            });

            var lastWeek = query({
                'ids': ids,
                'dimensions': 'ga:date,ga:nthDay',
                'metrics': 'ga:sessions',
                'start-date': moment(now).subtract(1, 'day').day(0).subtract(1, 'week')
                    .format('YYYY-MM-DD'),
                'end-date': moment(now).subtract(1, 'day').day(6).subtract(1, 'week')
                    .format('YYYY-MM-DD')
            });

            Promise.all([thisWeek, lastWeek]).then(function(results) {

                console.log(results[1]);
                var data1 = results[0].rows.filter(function(row) { return row[2] !== "0"; }).map(function(row) { return +row[2]; });
                var data2 = results[1].rows.filter(function(row) { return row[2] !== "0"; }).map(function(row) { return +row[2]; });
                var labels = results[0].rows.filter(function(row) { return row[2] !== "0"; }).map(function(row) { return +row[0]; });

                console.log(labels);

                labels = labels.map(function(label) {
                    return moment(label, 'YYYYMMDD').format('ddd');
                });

                var data = {
                    labels: labels,
                    datasets: [{
                            label: 'Last Week',
                            data: data2
                        },
                        {
                            label: 'This Week',
                            data: data1
                        }
                    ]
                };

                console.log(data);

                //console.log(data);

                new Chart($("#chart"), {
                    type: 'bar',
                    data: data,
                    options: {
                        maintainAspectRatio: false,
                        scales: {
                            xAxes: [{
                                scaleLabel: {
                                    display: true,
                                    labelString: "Date"
                                },
                            }],
                            yAxes: [{
                                ticks: {
                                    suggestedMin: 0
                                },
                                scaleLabel: {
                                    display: true,
                                    labelString: "All Views"
                                },
                            }]
                        },
                    }
                });
                generateLegend('legend-container', data.datasets);
            });
        }

        /**
         * Extend the Embed APIs `gapi.analytics.report.Data` component to
         * return a promise the is fulfilled with the value returned by the API.
         * @param {Object} params The request parameters.
         * @return {Promise} A promise.
         */
        function query(params) {
            return new Promise(function(resolve, reject) {
                var data = new gapi.analytics.report.Data({ query: params });
                data.once('success', function(response) { resolve(response); })
                    .once('error', function(response) { reject(response); })
                    .execute();
            });
        }


        /**
         * Create a new canvas inside the specified element. Set it to be the width
         * and height of its container.
         * @param {string} id The id attribute of the element to host the canvas.
         * @return {RenderingContext} The 2D canvas context.
         */
        function makeCanvas(id) {
            var container = document.getElementById(id);
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');

            container.innerHTML = '';
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
            container.appendChild(canvas);

            return ctx;
        }


        /**
         * Create a visual legend inside the specified element based off of a
         * Chart.js dataset.
         * @param {string} id The id attribute of the element to host the legend.
         * @param {Array.<Object>} items A list of labels and colors for the legend.
         */
        function generateLegend(id, items) {
            var legend = document.getElementById(id);
            legend.innerHTML = items.map(function(item) {
                var color = item.color || item.fillColor;
                var label = item.label;
                return '<li><i style="background:' + color + '"></i>' +
                    escapeHtml(label) + '</li>';
            }).join('');
        }


        // Set some global Chart.js defaults.
        Chart.defaults.global.animationSteps = 60;
        Chart.defaults.global.animationEasing = 'easeInOutQuart';
        Chart.defaults.global.responsive = true;
        Chart.defaults.global.maintainAspectRatio = false;


        /**
         * Escapes a potentially unsafe HTML string.
         * @param {string} str An string that may contain HTML entities.
         * @return {string} The HTML-escaped string.
         */
        function escapeHtml(str) {
            var div = document.createElement('div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        }

        function handleResponse(response) {
            if (response && !response.error) {
                if (response.items) {
                    printAccountSummaries(response.items);
                }
            } else {
                console.log('There was an error: ' + response.message);
            }
        }

        function printAccountSummaries() {
            for (var i = 0, account; account = accounts[i]; i++) {
                console.log('Account id: ' + account.id);
                console.log('Account name: ' + account.name);
                console.log('Account kind: ' + account.kind);
            }
        }
    });
}