function renderCharts() {
    gapi.analytics.ready(function() {
        var selectData = {
            accounts: [],
            accountProperties: [],
            propertyProfiles: []
        }

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

                var data1 = results[0].rows.map(function(row) { return +row[2]; });
                var data2 = results[1].rows.map(function(row) { return +row[2]; });
                var labels = results[0].rows.map(function(row) { return +row[0]; });

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

        function showAccounts(response) {
            if (response.result.items && response.result.items.length) {
                var accountIdSelectOptions = "";
                response.result.items.filter(item => item.name !== "").forEach(item => {
                    accountIsValid(item).then(result => {
                        console.log(result.hasPermissions);
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
                $("#profileId").on("change", e => renderWeekOverWeekChart('ga:' + e.target.value));
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
                'dimensions': 'ga:date,ga:nthDay',
                'start-date': '7daysAgo',
                'end-date': 'today',
                'metrics': 'ga:sessions'
            }).then(result => console.log(result));
        }

        function getProfileData(itemId, permissions) {
            return new Promise((fulfill, reject) => {
                if (permissions.indexOf("EDIT") !== -1) {
                    gapi.client.analytics.data.ga.get({
                        'ids': 'ga:' + itemId,
                        'dimensions': 'ga:date,ga:nthDay',
                        'start-date': '7daysAgo',
                        'end-date': 'today',
                        'metrics': 'ga:sessions'
                    }).then(response => fulfill(response.result.rows)).then(null, response => reject(response.result.error.errors[0].message));
                } else {
                    reject("No permissions");
                }
            });
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
                                    //getProfileData(item.id, item.permissions.effective).then(response => console.log(response)).then(null, response => console.log("ERR: ", response));
                                });
                            });
                        });
                    });
                }
            })
        }

        function query(params) {
            return new Promise((fulfill, reject) => {
                gapi.client.analytics.data.ga.get(params).then(response => fulfill(response.results)).then(null, response => reject(response));
            });
        }

    });
}