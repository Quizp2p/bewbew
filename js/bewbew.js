(function() {

    var demoMode = false;
    var lastTimestamp = '2016-01-01T00:00:00+08:00';

    var bufferSize = 30;
    var esWindowSize = 100;
    var animateRefreshTime = 1;
    var esRefreshTime = 5;
    var indexPattern = 'saas_*';
    var attackField = 'analysis';

    var attackDivColors = {
        text_color: '#4ec2d1',
        alert_color: '#f0f6f6',
        ip_color: '#a4429e'
    }

    var attackColors = {
        'cybercrime': '#f26060',
        'blocklist_de_ssh': '#33e0f1',
        'FileIncludeAttack ': '#f98206',
        'stopforumspam_90d': '#bee248',
        'FileAccess ': '#16f228'
    };

    var mapColors = {
        fill_color: 'black',
        border_color: '#4393c3',
        highlight_fill_color: 'gray',
        highlight_border_color: 'rgba(250, 15, 160, 0.2)',
        hoverinfo_text: '#72cd3c',
        hoverinfo_bg: '#131a0e'
    };

    var dcLocation;
    var srcKeys;
    var destKeys;

    var lastFrameTime = 0;
    var lastMapupdateTime = 0;
    var lastEsFetchTime = 0;

    // Get elastic search
    var elasticsearchHost = 'http://' + window.location.host + '/elasticsearch/';

    //  Declare an ES client in the IIFE funcion scope
    var client;

    var asyncLock = false;

    function fetchES(nextStep) {
        asyncLock = true;
        client.search({
            index: indexPattern,
            size: esWindowSize,
            //    type: '*',
            body: {
                "query": {
                    "filtered": {
                        "filter": {
                            "and": {
                                "filters": [{
                                    "exists": {
                                        "field": attackField
                                    }
                                }, {
                                    "range": {
                                        "@timestamp": {
                                            "gt": lastTimestamp,
                                            "lte": "now"
                                        }
                                    }
                                }],
                                "_cache": false
                            }
                        }
                    }
                },
                "sort": {
                    "@timestamp": "desc"
                }
            }
        }).then(function(resp) {
            var hits = resp.hits.hits;
            // console.log("DEBUG: in thenning stage");
            nextStep(hits);
            asyncLock = false;
        }, function(err) {
            console.trace(err.message);
            asyncLock = false;
        });
    }

    // we maintain a fixed queue of "animations" via this class
    function FixedQueue(size, initialValues) {
        initialValues = (initialValues || []);
        var queue = Array.apply(null, initialValues);
        queue.fixedSize = size;
        queue.push = FixedQueue.push;
        queue.splice = FixedQueue.splice;
        queue.unshift = FixedQueue.unshift;
        FixedQueue.trimTail.call(queue);
        return (queue);
    }

    FixedQueue.trimHead = function() {
        if (this.length <= this.fixedSize) {
            return;
        }
        Array.prototype.splice.call(this, 0, (this.length - this.fixedSize));
    };

    FixedQueue.trimTail = function() {
        if (this.length <= this.fixedSize) {
            return;
        }
        Array.prototype.splice.call(this, this.fixedSize, (this.length - this.fixedSize));
    };

    FixedQueue.wrapMethod = function(methodName, trimMethod) {
        var wrapper = function() {
            var method = Array.prototype[methodName];
            var result = method.apply(this, arguments);
            trimMethod.call(this);
            return (result);
        };
        return (wrapper);
    };

    FixedQueue.push = FixedQueue.wrapMethod("push", FixedQueue.trimHead);
    FixedQueue.splice = FixedQueue.wrapMethod("splice", FixedQueue.trimTail);
    FixedQueue.unshift = FixedQueue.wrapMethod("unshift", FixedQueue.trimTail);


    var hitsBuffer,
        boomBuffer;


    function getObjAttribute(obj, path) {
        if ((typeof path === 'string') && path) {
            pathSerie = path.split('.');
            // console.log(pathSerie);
        } else {
            return '';
        }
        if (typeof obj !== 'object') {
            return '';
        }
        var result = obj;
        pathSerie.forEach(function(subPath) {
            // console.log(result);
            result = result[subPath];
        });
        // console.log(result);
        return result;

    }


    // the fun begins! =============================================================
    //
    // pretty simple setup ->
    // * make base Datamap
    // * setup timers to add random events to a queue
    // * update the Datamap


    var map = {};


    function getStroke(attck) {
        if (attck) {
            return attackColors[attck];
        }
        if ((Math.round(Math.random() * 100) < 70)) {
            return 'blue';
        } else {
            return 'red';
        }
    };

    var results = [];

    function main() {


        var now = Date.now(),
            EsDelay = (now - lastEsFetchTime) / 1000.0,
            MapDelay = (now - lastMapupdateTime) / 1000.0;

        //            console.log("DEBUG: Enter new frame!!!! Delta = " + dt);

        //TODO: update Data and Map
        if ((!asyncLock) && (EsDelay > esRefreshTime) && (results.length == 0)) {
            //                console.log("DEBUG: call getData()");
            //                console.log(results);
            attacks.getData();
        }

        if ((results.length > 0) && (MapDelay > animateRefreshTime)) {
            //                console.log("DEBUG: call updateMap()");
            //                console.log(results);
            //                console.log(hits);
            //                console.log(boom);

            attacks.updateMap();
        }

        lastFrameTime = now;
        requestAnimationFrame(main);

    }

    function init() {

        if (!demoMode) {
            //
            // console.log("DEBUG: current date time : " + moment().format());
            lastTimestamp = moment().format();
        }
        client = new $.es.Client({
            hosts: elasticsearchHost,
            apiVersion: '1.7'
                //    log: 'trace'
        });
        $('#attack_container').html(
            '<center><div id="attack_map_container"></div></center><div id="attackdiv" class="perfect"></div>'
        );
        // console.log($('.perfect'));
        $('.perfect').perfectScrollbar();

        map = new Datamap({

            scope: 'world',
            element: document.getElementById('attack_map_container'),
            projection: 'winkel3',
            // change the projection to something else only if you have absolutely no cartographic sense

            fills: {
                defaultFill: mapColors.fill_color,
            },

            geographyConfig: {
                dataUrl: null,
                hideAntarctica: true,
                borderWidth: 0.75,
                borderColor: mapColors.border_color,
                popupTemplate: function(geography, data) {
                    return '<div class="hoverinfo" style="color:' + mapColors.hoverinfo_text + ';background:' + mapColors.hoverinfo_bg + '">' +
                        geography.properties.name + '</div>';
                },
                popupOnHover: true,
                highlightOnHover: false,
                highlightFillColor: mapColors.highlight_fill_color,
                highlightBorderColor: mapColors.highlight_border_color,
                highlightBorderWidth: 2
            },

        });
        hitsBuffer = FixedQueue(bufferSize, []);
        boomBuffer = FixedQueue(bufferSize, []);

        lastFrameTime = Date.now();
        // console.log('DEBUG: set lastFrameTime in init(): ' + Date.now());
        // console.log('DEBUG: call main() in attacks.init() -- start --->>');
        //        setTimeout(jQuery.proxy(this.updateMap(), this), 5000);
        attacks.getData();
        main();

        // console.log('DEBUG: call main() in attacks.init() -- end ----<<');

    }

    // doing this a bit fancy for a hack, but it makes it
    // easier to group code functions together and have variables
    // out of global scope
    var attacks = {


        updateMap: function() {

            var strokeColor;

            var result = results.shift();

            strokeColor = getStroke(result.intel.which_attack);

            hitsBuffer.push(result.hit);

            //                console.log('DEBUG: draw pushed  hit------>');
            //                console.log(result.hit);

            // Draw the arcs
            map.arc(hitsBuffer, {
                strokeWidth: 2,
                strokeColor: strokeColor
            });

            boomBuffer.push(result.boom);
            //
            //                console.log('DEBUG: draw pushed  boom------>');
            //                console.log(result.boom);

            // Draw the bubbles
            map.bubbles(boomBuffer, {
                popupTemplate: function(geo, data) {
                    return '<div class="hoverinfo">' + data.attk + '</div>';
                }
            });


            // update the scrolling attack div
            var intel = result.intel;

            if ($('#attackdiv').find(".attack_intel").length > bufferSize) {
                $('#attackdiv').find(".attack_intel").slice(0, 1).remove();
            }

            $('#attackdiv').append(
                "<div class='attack_intel' style=color:" + attackDivColors.text_color + " >" + intel.srcCountry + " ，" + intel.srcRegion + "<span class='attack_ip' style='color:" + attackDivColors.ip_color + " '> (" + intel.srcIp + ") </span> - " +
                intel.destCountry + " ，" + intel.destRegion + "<span class='attack_ip' style='color:" + attackDivColors.ip_color + " '> (" + intel.destIp + ") </span>  <" +
                " <span  class='attack_alert' style='color:" + attackDivColors.alert_color + "'> 攻击类型: </span> " +
                " <span class='attack_type' style='color:" + attackColors[intel.which_attack] + "'>  " + " " + intel.which_attack + " </span> >" +
                "</div>");
            $('#attackdiv').animate({
                scrollTop: $('#attackdiv').prop("scrollHeight")
            }, 180);

            lastMapupdateTime = Date.now();

        },


        getData: function() {
            //            console.log(
            //                'DEBUG: in getData Func'
            //            );

            // console.log("DEBUG:  in getData() function start to call fetchES")

            fetchES(function(esResults) {
                //            console.log(
                //                    typeof results
                //            )
                if (lastTimestamp === esResults[0]._source['@timestamp']) {
                    return;
                }

                if (!demoMode) {
                    lastTimestamp = esResults[0]._source['@timestamp'];
                }


                // console.log(
                //     'DEBUG: Last Time Stamp in @fetchES(L750): ' + lastTimestamp
                // );

                var result = {};

                esResults.forEach(
                    function(esResult) {
                        var result = {};
                        // add hit to the arc queue

                        var destLoc = dcLocation;

                        if (!destLoc) {
                            destLoc = {
                                lat: '39.03',
                                lon: '117.68',
                                country: '中国',
                                region: '天津',
                                ip: '127.0.0.1'
                            };
                        }

                        if (dcLocation == 'auto') {
                            destLoc = {
                                lat: getObjAttribute(esResult, '_source.' + destKeys.latKey),
                                lon: getObjAttribute(esResult, '_source.' + destKeys.lonKey),
                                // lat : +esResult._source[destLocKay][destLocKayLat],
                                // lon : +esResult._source[destLocKay][destLocKayLon]
                                country: getObjAttribute(esResult, '_source.' + destKeys.countryKey),
                                region: getObjAttribute(esResult, '_source.' + destKeys.regionKey),
                                ip: getObjAttribute(esResult, '_source.' + destKeys.ipKey)
                            };
                        };

                        var srcLoc = {
                            lat: getObjAttribute(esResult, '_source.' + srcKeys.latKey),
                            lon: getObjAttribute(esResult, '_source.' + srcKeys.lonKey),
                            country: getObjAttribute(esResult, '_source.' + srcKeys.countryKey),
                            region: getObjAttribute(esResult, '_source.' + srcKeys.regionKey),
                            ip: getObjAttribute(esResult, '_source.' + srcKeys.ipKey)
                        }

                        result.hit = {
                            origin: {
                                latitude: +srcLoc.lat,
                                longitude: +srcLoc.lon
                                    // latitude: +esResult._source.c_ip.location.lat,
                                    // longitude: +esResult._source.c_ip.location.lon
                            },
                            destination: {
                                latitude: +destLoc.lat,
                                longitude: +destLoc.lon
                            }
                        };


                        // add boom to the bubbles queue

                        result.boom = {
                            radius: 7,
                            latitude: +srcLoc.lat,
                            longitude: +srcLoc.lon,
                            // latitude: +esResult._source.c_ip.location.lat,
                            // longitude: +esResult._source.c_ip.location.lon,
                            fillOpacity: 0.5,
                            attk: esResult._source[attackField]
                        };

                        result.intel = {
                            // country: esResult._source.c_ip.regionl0,
                            // region: esResult._source.c_ip.regionl1,
                            // ip: esResult._source.c_ip.ip,
                            srcCountry: srcLoc.country,
                            srcRegion: srcLoc.region,
                            srcIp: srcLoc.ip,
                            destCountry: destLoc.country,
                            destRegion: destLoc.region,
                            destIp: destLoc.ip,
                            which_attack: esResult._source[attackField]
                        };

                        results.push(result);


                    }
                );

            });

            lastFrameTime = Date.now();

        }

    };





    window.bewbew = function(config) {
        if (config) {
            demoMode = config.demoMode ? config.demoMode : demoMode;
            lastTimestamp = config.lastTimestamp ? config.lastTimestamp : lastTimestamp;
            bufferSize = config.bufferSize ? config.bufferSize : bufferSize;
            esWindowSize = config.esWindowSize ? config.esWindowSize : esWindowSize;
            animateRefreshTime = config.animateRefreshTime ? config.animateRefreshTime : animateRefreshTime;
            esRefreshTime = config.esRefreshTime ? config.esRefreshTime : esRefreshTime;
            indexPattern = config.indexPattern ? config.indexPattern : indexPattern;
            attackField = config.attackField ? config.attackField : attackField;
            attackDivColors = config.attackDivColors ? config.attackDivColors : attackDivColors;
            attackColors = config.attackColors ? config.attackColors : attackColors;
            mapColors = config.mapColors ? config.mapColors : mapColors;
            dcLocation = config.dcLocation;
            srcKeys = config.srcKeys;
            destKeys = config.destKeys;
        }

        // start the ball rolling!

        $(document).ready(function() {
            init();
        });

        // lazy-dude's responsive window
        d3.select(window).on('resize', function() {
            location.reload();
        });

    };

}());
