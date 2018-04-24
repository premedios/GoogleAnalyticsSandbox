function renderCharts() {
    var selectedChartType = "";
    var selectedProfileId = "";
    var currentChart = null;

    gapi.analytics.ready(function() {

        $("#barChartButton").on("click", e => {
            selectedChartType = e.target.text;
            renderWeekOverWeekChart(selectedProfileId, selectedChartType)
        });
        $("#lineChartButton").on("click", e => {
            selectedChartType = e.target.text;
            renderWeekOverWeekChart(selectedProfileId, selectedChartType)
        });

        gapi.auth.authorize({
            client_id: '708383383102-4h03gssp03i8ceonmqm14a44eugq9dh5.apps.googleusercontent.com',
            scope: ['https://www.googleapis.com/auth/analytics.readonly'],
            immediate: true
        }, function(response) {
            // Get a list of all Google Analytics accounts for this user
            gapi.client.analytics.management.accounts.list().then(showAccounts);
        });

        // /**
        //  * Draw the a chart.js line chart with data from the specified view that
        //  * overlays session data for the current week over session data for the
        //  * previous week.
        //  */
        function renderWeekOverWeekChart(ids, chartType) {

            // Adjust `now` to experiment with different days, for testing only...
            var now = moment(); // .subtract(3, 'day');

            var thisWeek = query({
                'ids': ids,
                'dimensions': 'ga:date',
                'start-date': '7daysAgo',
                'end-date': 'today',
                'metrics': 'ga:sessions'
            });

            var lastWeek = query({
                'ids': ids,
                'dimensions': 'ga:date',
                'start-date': '14daysAgo',
                'end-date': '7daysAgo',
                'metrics': 'ga:sessions'
            });

            Promise.all([thisWeek, lastWeek]).then(function(results) {
                var data1 = results[0].rows.map(function(row) { return +row[1]; });
                var data2 = results[1].rows.map(function(row) { return +row[1]; });
                var labels = results[0].rows.map(function(row) { return +row[0]; });

                labels = labels.map(function(label) {
                    return moment(label, 'YYYYMMDD').format('ddd');
                });

                var data = {
                    labels: labels,
                    datasets: [{
                            borderColor: 'rgba(255, 0, 0, 1)',
                            borderWidth: 3,
                            lineTension: 0,
                            label: 'Last Week',
                            data: data2
                        },
                        {
                            borderColor: 'rgba(0, 0, 255, 1)',
                            borderWidth: 3,
                            lineTension: 0,
                            label: 'This Week',
                            data: data1
                        }
                    ]
                };

                //console.log(data);

                if (currentChart) {
                    currentChart.destroy();
                    currentChart = null;
                }

                currrentChart = new Chart($("#chart"), {
                    type: chartType,
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
                chart.generateLegend();
                queryReports();
            });
        }

        function showAccounts(response) {
            if (response.result.items && response.result.items.length) {
                var accountIdSelectOptions = "";
                response.result.items.filter(item => item.name !== "").forEach(item => {
                    accountIsValid(item).then(result => {
                        if (result.hasPermissions === true) {
                            accountIdSelectOptions = accountIdSelectOptions + "<option value='" + item.id + "'>" + item.name + "</option>";
                            $("#accountId").html(accountIdSelectOptions);
                            $("#accountId").on("change", e => showWebProperties(e.target.value));
                            $("#accountId").trigger("change");
                        }
                    });
                });

                // //showWebProperties(response.result.items[0].id);

                // $("#accountId").trigger('change');
                // printAccountSummaries(response.result.items);
            } else {
                console.log('There was an error: ' + response.message);
            }
        }

        function showWebProperties(accountId) {
            getWebProperties(accountId).then(items => {
                var webPropertySelectOptions = items.reduce((optionsHTML, item) => optionsHTML + "<option value='" + [item.id, item.accountId].join(",") + "'>" + item.name + "</options>", "");
                $("#propertyId").html(webPropertySelectOptions);
                $("#propertyId").on("change", e => showProfiles(e.target.value));
                $("#propertyId").trigger("change");
            });
        }

        function getWebProperties(accountId) {
            return new Promise((fulfill, reject) => {
                gapi.client.analytics.management.webproperties.list({ 'accountId': accountId })
                    .then(response => {
                        fulfill(response.result.items);
                    });
            });
        }

        function showProfiles(ids) {
            var idsArray = ids.split(",");
            getProfiles(idsArray[1], idsArray[0]).then(items => {
                var profilesSelectOptions = items.reduce((optionsHTML, item) => {
                    if (item.permissions.effective.indexOf("EDIT") !== -1) {
                        return optionsHTML + "<option value='" + item.id + "'>" + item.name + "</options>";
                    }
                }, "");
                $("#profileId").html(profilesSelectOptions);
                $("#profileId").on("change", e => {
                    selectedProfileId = 'ga:' + e.target.value;
                    renderWeekOverWeekChart(selectedProfileId, selectedChartType || 'bar');
                });
                $("#profileId").trigger("change");
            });
        }

        function getProfiles(accountId, itemId) {
            return new Promise((fulfill, reject) => {
                gapi.client.analytics.management.profiles.list({
                    'accountId': accountId,
                    'webPropertyId': itemId
                }).then(response => {
                    fulfill(response.result.items);
                });
            });
        }

        function renderChart(ids) {
            gapi.client.analytics.data.ga.get({
                'ids': ids,
                'dimensions': 'ga:date',
                'start-date': '7daysAgo',
                'end-date': 'today',
                'metrics': 'ga:sessions'
            }).then(result => console.log(result));
        }

        function accountIsValid(item) {
            return new Promise((fulfill, reject) => {
                if (item.permissions.effective.indexOf("EDIT") !== -1) {
                    fulfill({ hasPermissions: true });
                } else {
                    var permissionsCount = 0;
                    getWebProperties(item.id).then(items => {
                        items.forEach(item => {
                            getProfiles(item.accountId, item.id).then(items => {
                                items.forEach(item => {
                                    if (item.permissions.effective.indexOf("EDIT") !== -1) {
                                        permissionsCount += 1;
                                    }
                                });
                            });
                        });
                    });
                }
            })
        }

        function query(params) {
            return new Promise((fulfill, reject) => {
                gapi.client.analytics.data.ga.get(params).then(response => {
                    //console.log(response.result);
                    fulfill(response.result)
                }).then(null, response => reject(response));
            });
        }

        // Replace with your view ID.
        //var VIEW_ID = '173739286';

        // Query the API and print the results to the page.
        // function queryReports() {
        //     gapi.client.request({
        //         path: '/v4/reports:batchGet',
        //         root: 'https://analyticsreporting.googleapis.com/',
        //         method: 'POST',
        //         body: {
        //             reportRequests: [{
        //                 viewId: VIEW_ID,
        //                 dateRanges: [{
        //                     startDate: '13daysAgo',
        //                     endDate: '7daysAgo'
        //                 }],
        //                 metrics: [{
        //                     expression: 'ga:sessions'
        //                 }],
        //                 dimensions: [{
        //                     "name": "ga:date"
        //                 }],
        //                 includeEmptyRows: true
        //             }]
        //         }
        //     }).then(displayResults, console.error.bind(console));
        // }

        // function displayResults(response) {
        //     var formattedJson = JSON.stringify(response.result, null, 2);
        //     document.getElementById('query-output').value = formattedJson;
        // }

    });
}